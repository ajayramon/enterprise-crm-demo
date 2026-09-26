from __future__ import annotations

from collections import defaultdict
from copy import deepcopy
from datetime import date, datetime, timezone
from typing import Any
from uuid import uuid4

from pymongo import ReturnDocument
from pymongo.database import Database

from app.models import (
    AcquisitionMetric,
    ActivityCreate,
    ActivityPublic,
    ActivityReportSummary,
    ActivityUpdate,
    CustomerCreate,
    CustomerPublic,
    CustomerUpdate,
    DashboardMetrics,
    DealCreate,
    DealPublic,
    DealUpdate,
    PipelineStageSummary,
    RevenueForecastPoint,
    UserCreate,
    UserPublic,
    UserUpdate,
)
from app.security import hash_password, verify_password
from app.seed_data import build_demo_data


STAGES = ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost']


class CRMRepositoryError(Exception):
    pass


class CRMNotFoundError(CRMRepositoryError):
    pass


class CRMConflictError(CRMRepositoryError):
    pass


class CRMRepository:
    def seed_demo_data(self) -> None: ...
    def list_users(self) -> list[dict[str, Any]]: ...
    def get_user(self, user_id: str) -> dict[str, Any]: ...
    def get_user_by_email(self, email: str) -> dict[str, Any] | None: ...
    def create_user(self, payload: UserCreate) -> dict[str, Any]: ...
    def update_user(self, user_id: str, payload: UserUpdate) -> dict[str, Any]: ...
    def authenticate(self, email: str, password: str) -> dict[str, Any] | None: ...
    def list_customers(self, industry: str | None = None, status: str | None = None) -> list[dict[str, Any]]: ...
    def get_customer(self, customer_id: str) -> dict[str, Any]: ...
    def create_customer(self, payload: CustomerCreate, owner_id: str, owner_name: str) -> dict[str, Any]: ...
    def update_customer(self, customer_id: str, payload: CustomerUpdate) -> dict[str, Any]: ...
    def delete_customer(self, customer_id: str) -> None: ...
    def list_deals(self, stage: str | None = None, owner_id: str | None = None) -> list[dict[str, Any]]: ...
    def get_deal(self, deal_id: str) -> dict[str, Any]: ...
    def create_deal(self, payload: DealCreate) -> dict[str, Any]: ...
    def update_deal(self, deal_id: str, payload: DealUpdate) -> dict[str, Any]: ...
    def delete_deal(self, deal_id: str) -> None: ...
    def list_activities(self, activity_type: str | None = None, assigned_to_id: str | None = None) -> list[dict[str, Any]]: ...
    def get_activity(self, activity_id: str) -> dict[str, Any]: ...
    def create_activity(self, payload: ActivityCreate) -> dict[str, Any]: ...
    def update_activity(self, activity_id: str, payload: ActivityUpdate) -> dict[str, Any]: ...
    def delete_activity(self, activity_id: str) -> None: ...
    def get_dashboard_metrics(self) -> DashboardMetrics: ...
    def get_pipeline_summary(self) -> list[PipelineStageSummary]: ...
    def get_revenue_forecast(self) -> list[RevenueForecastPoint]: ...
    def get_acquisition_metrics(self) -> list[AcquisitionMetric]: ...
    def get_activity_report(self) -> list[ActivityReportSummary]: ...


class InMemoryCRMRepository(CRMRepository):
    def __init__(self) -> None:
        self.seeded = False
        self.users: dict[str, dict[str, Any]] = {}
        self.customers: dict[str, dict[str, Any]] = {}
        self.deals: dict[str, dict[str, Any]] = {}
        self.activities: dict[str, dict[str, Any]] = {}

    def seed_demo_data(self) -> None:
        if self.seeded:
            return
        demo = build_demo_data()
        self.users = {item['id']: deepcopy(item) for item in demo['users']}
        self.customers = {item['id']: deepcopy(item) for item in demo['customers']}
        self.deals = {item['id']: deepcopy(item) for item in demo['deals']}
        self.activities = {item['id']: deepcopy(item) for item in demo['activities']}
        self.seeded = True

    def _ensure_seeded(self) -> None:
        if not self.seeded:
            self.seed_demo_data()

    def _sort(self, records: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return sorted(records, key=lambda item: item.get('updated_at', item.get('created_at', datetime.now(timezone.utc))), reverse=True)

    def list_users(self) -> list[dict[str, Any]]:
        self._ensure_seeded()
        return self._sort([deepcopy(user) for user in self.users.values()])

    def get_user(self, user_id: str) -> dict[str, Any]:
        self._ensure_seeded()
        if user_id not in self.users:
            raise CRMNotFoundError('User not found')
        return deepcopy(self.users[user_id])

    def get_user_by_email(self, email: str) -> dict[str, Any] | None:
        self._ensure_seeded()
        for user in self.users.values():
            if user['email'].lower() == email.lower():
                return deepcopy(user)
        return None

    def create_user(self, payload: UserCreate) -> dict[str, Any]:
        self._ensure_seeded()
        if self.get_user_by_email(str(payload.email)):
            raise CRMConflictError('A user with that email already exists')
        now = datetime.now(timezone.utc)
        user = payload.model_dump()
        user['id'] = f'user-{uuid4().hex[:8]}'
        user['password_hash'] = hash_password(user.pop('password'))
        user['created_at'] = now
        self.users[user['id']] = user
        return deepcopy(user)

    def update_user(self, user_id: str, payload: UserUpdate) -> dict[str, Any]:
        self._ensure_seeded()
        user = self.get_user(user_id)
        updates = payload.model_dump(exclude_none=True)
        if 'password' in updates:
            user['password_hash'] = hash_password(updates.pop('password'))
        user.update(updates)
        self.users[user_id] = user
        return deepcopy(user)

    def authenticate(self, email: str, password: str) -> dict[str, Any] | None:
        user = self.get_user_by_email(email)
        if not user or not verify_password(password, user['password_hash']):
            return None
        return user

    def list_customers(self, industry: str | None = None, status: str | None = None) -> list[dict[str, Any]]:
        self._ensure_seeded()
        records = [deepcopy(item) for item in self.customers.values()]
        if industry:
            records = [item for item in records if item['industry'] == industry]
        if status:
            records = [item for item in records if item['status'] == status]
        return self._sort(records)

    def get_customer(self, customer_id: str) -> dict[str, Any]:
        self._ensure_seeded()
        if customer_id not in self.customers:
            raise CRMNotFoundError('Customer not found')
        return deepcopy(self.customers[customer_id])

    def create_customer(self, payload: CustomerCreate, owner_id: str, owner_name: str) -> dict[str, Any]:
        self._ensure_seeded()
        now = datetime.now(timezone.utc)
        customer = payload.model_dump()
        customer['id'] = f'cust-{uuid4().hex[:8]}'
        customer['owner_id'] = owner_id
        customer['owner_name'] = owner_name
        customer['created_at'] = now
        customer['updated_at'] = now
        self.customers[customer['id']] = customer
        return deepcopy(customer)

    def update_customer(self, customer_id: str, payload: CustomerUpdate) -> dict[str, Any]:
        customer = self.get_customer(customer_id)
        customer.update(payload.model_dump(exclude_none=True))
        customer['updated_at'] = datetime.now(timezone.utc)
        self.customers[customer_id] = customer
        return deepcopy(customer)

    def delete_customer(self, customer_id: str) -> None:
        self.get_customer(customer_id)
        del self.customers[customer_id]
        for deal_id in [key for key, item in self.deals.items() if item['customer_id'] == customer_id]:
            del self.deals[deal_id]
        for activity_id in [key for key, item in self.activities.items() if item['customer_id'] == customer_id]:
            del self.activities[activity_id]

    def list_deals(self, stage: str | None = None, owner_id: str | None = None) -> list[dict[str, Any]]:
        self._ensure_seeded()
        records = [deepcopy(item) for item in self.deals.values()]
        if stage:
            records = [item for item in records if item['stage'] == stage]
        if owner_id:
            records = [item for item in records if item['owner_id'] == owner_id]
        return self._sort(records)

    def get_deal(self, deal_id: str) -> dict[str, Any]:
        self._ensure_seeded()
        if deal_id not in self.deals:
            raise CRMNotFoundError('Deal not found')
        return deepcopy(self.deals[deal_id])

    def create_deal(self, payload: DealCreate) -> dict[str, Any]:
        self._ensure_seeded()
        self.get_customer(payload.customer_id)
        now = datetime.now(timezone.utc)
        deal = payload.model_dump()
        deal['id'] = f'deal-{uuid4().hex[:8]}'
        deal['created_at'] = now
        deal['updated_at'] = now
        self.deals[deal['id']] = deal
        return deepcopy(deal)

    def update_deal(self, deal_id: str, payload: DealUpdate) -> dict[str, Any]:
        deal = self.get_deal(deal_id)
        updates = payload.model_dump(exclude_none=True)
        deal.update(updates)
        deal['updated_at'] = datetime.now(timezone.utc)
        self.deals[deal_id] = deal
        return deepcopy(deal)

    def delete_deal(self, deal_id: str) -> None:
        self.get_deal(deal_id)
        del self.deals[deal_id]
        for activity in self.activities.values():
            if activity.get('deal_id') == deal_id:
                activity['deal_id'] = None
                activity['updated_at'] = datetime.now(timezone.utc)

    def list_activities(self, activity_type: str | None = None, assigned_to_id: str | None = None) -> list[dict[str, Any]]:
        self._ensure_seeded()
        records = [deepcopy(item) for item in self.activities.values()]
        if activity_type:
            records = [item for item in records if item['activity_type'] == activity_type]
        if assigned_to_id:
            records = [item for item in records if item['assigned_to_id'] == assigned_to_id]
        return self._sort(records)

    def get_activity(self, activity_id: str) -> dict[str, Any]:
        self._ensure_seeded()
        if activity_id not in self.activities:
            raise CRMNotFoundError('Activity not found')
        return deepcopy(self.activities[activity_id])

    def create_activity(self, payload: ActivityCreate) -> dict[str, Any]:
        self._ensure_seeded()
        self.get_customer(payload.customer_id)
        now = datetime.now(timezone.utc)
        activity = payload.model_dump()
        activity['id'] = f'act-{uuid4().hex[:8]}'
        activity['created_at'] = now
        activity['updated_at'] = now
        self.activities[activity['id']] = activity
        return deepcopy(activity)

    def update_activity(self, activity_id: str, payload: ActivityUpdate) -> dict[str, Any]:
        activity = self.get_activity(activity_id)
        updates = payload.model_dump(exclude_none=True)
        if updates.get('status') == 'Completed' and 'completed_at' not in updates:
            updates['completed_at'] = datetime.now(timezone.utc)
        activity.update(updates)
        activity['updated_at'] = datetime.now(timezone.utc)
        self.activities[activity_id] = activity
        return deepcopy(activity)

    def delete_activity(self, activity_id: str) -> None:
        self.get_activity(activity_id)
        del self.activities[activity_id]

    def get_dashboard_metrics(self) -> DashboardMetrics:
        self._ensure_seeded()
        deals = list(self.deals.values())
        activities = list(self.activities.values())
        customers = list(self.customers.values())
        total_pipeline = sum(item['value'] for item in deals if item['stage'] not in {'Closed Won', 'Closed Lost'})
        weighted_pipeline = sum(item['value'] * item['probability'] / 100 for item in deals if item['stage'] not in {'Closed Won', 'Closed Lost'})
        won_deals = [item for item in deals if item['stage'] == 'Closed Won']
        overdue = [item for item in activities if item['status'] == 'Pending' and item['due_date'] < datetime.now(timezone.utc)]
        return DashboardMetrics(
            total_customers=len(customers),
            active_customers=len([item for item in customers if item['status'] == 'Active']),
            total_pipeline_value=round(total_pipeline, 2),
            weighted_pipeline_value=round(weighted_pipeline, 2),
            open_deals=len([item for item in deals if item['stage'] not in {'Closed Won', 'Closed Lost'}]),
            won_deals=len(won_deals),
            overdue_activities=len(overdue),
            monthly_forecast=round(sum(item['value'] for item in deals if item['probability'] >= 60 and item['stage'] not in {'Closed Won', 'Closed Lost'}), 2),
        )

    def get_pipeline_summary(self) -> list[PipelineStageSummary]:
        self._ensure_seeded()
        grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for deal in self.deals.values():
            grouped[deal['stage']].append(deal)
        return [
            PipelineStageSummary(stage=stage, count=len(grouped.get(stage, [])), value=round(sum(item['value'] for item in grouped.get(stage, [])), 2))
            for stage in STAGES
        ]

    def get_revenue_forecast(self) -> list[RevenueForecastPoint]:
        self._ensure_seeded()
        grouped: dict[date, float] = defaultdict(float)
        for deal in self.deals.values():
            if deal['stage'] == 'Closed Lost':
                continue
            month_key = deal['expected_close_date'].replace(day=1)
            grouped[month_key] += deal['value'] * max(deal['probability'], 25) / 100
        return [
            RevenueForecastPoint(month=month.strftime('%b %Y'), value=round(value, 2))
            for month, value in sorted(grouped.items(), key=lambda item: item[0])
        ]

    def get_acquisition_metrics(self) -> list[AcquisitionMetric]:
        self._ensure_seeded()
        grouped: dict[str, int] = defaultdict(int)
        for customer in self.customers.values():
            grouped[customer['industry']] += 1
        return [AcquisitionMetric(label=label, value=value) for label, value in sorted(grouped.items())]

    def get_activity_report(self) -> list[ActivityReportSummary]:
        self._ensure_seeded()
        grouped: dict[str, dict[str, int]] = defaultdict(lambda: {'Pending': 0, 'Completed': 0})
        for activity in self.activities.values():
            grouped[activity['activity_type']][activity['status']] += 1
        return [
            ActivityReportSummary(label=label, pending=counts['Pending'], completed=counts['Completed'])
            for label, counts in sorted(grouped.items())
        ]


class MongoCRMRepository(CRMRepository):
    def __init__(self, db: Database) -> None:
        self.db = db

    def _collection(self, name: str):
        return self.db[name]

    def _serialize(self, record: dict[str, Any] | None) -> dict[str, Any] | None:
        if not record:
            return None
        record = deepcopy(record)
        record.pop('_id', None)
        return record

    def seed_demo_data(self) -> None:
        if self._collection('users').count_documents({}) > 0:
            return
        demo = build_demo_data()
        for name, items in demo.items():
            self._collection(name).insert_many(items)

    def list_users(self) -> list[dict[str, Any]]:
        return [self._serialize(item) for item in self._collection('users').find({}, sort=[('created_at', -1)])]

    def get_user(self, user_id: str) -> dict[str, Any]:
        record = self._serialize(self._collection('users').find_one({'id': user_id}))
        if not record:
            raise CRMNotFoundError('User not found')
        return record

    def get_user_by_email(self, email: str) -> dict[str, Any] | None:
        return self._serialize(self._collection('users').find_one({'email': {'$regex': f'^{email}$', '$options': 'i'}}))

    def create_user(self, payload: UserCreate) -> dict[str, Any]:
        if self.get_user_by_email(str(payload.email)):
            raise CRMConflictError('A user with that email already exists')
        now = datetime.now(timezone.utc)
        user = payload.model_dump()
        user['id'] = f'user-{uuid4().hex[:8]}'
        user['password_hash'] = hash_password(user.pop('password'))
        user['created_at'] = now
        self._collection('users').insert_one(user)
        return user

    def update_user(self, user_id: str, payload: UserUpdate) -> dict[str, Any]:
        updates = payload.model_dump(exclude_none=True)
        if 'password' in updates:
            updates['password_hash'] = hash_password(updates.pop('password'))
        updates['updated_at'] = datetime.now(timezone.utc)
        result = self._collection('users').find_one_and_update(
            {'id': user_id},
            {'$set': updates},
            return_document=ReturnDocument.AFTER,
        )
        record = self._serialize(result)
        if not record:
            raise CRMNotFoundError('User not found')
        return record

    def authenticate(self, email: str, password: str) -> dict[str, Any] | None:
        user = self.get_user_by_email(email)
        if not user or not verify_password(password, user['password_hash']):
            return None
        return user

    def list_customers(self, industry: str | None = None, status: str | None = None) -> list[dict[str, Any]]:
        query: dict[str, Any] = {}
        if industry:
            query['industry'] = industry
        if status:
            query['status'] = status
        return [self._serialize(item) for item in self._collection('customers').find(query, sort=[('updated_at', -1)])]

    def get_customer(self, customer_id: str) -> dict[str, Any]:
        record = self._serialize(self._collection('customers').find_one({'id': customer_id}))
        if not record:
            raise CRMNotFoundError('Customer not found')
        return record

    def create_customer(self, payload: CustomerCreate, owner_id: str, owner_name: str) -> dict[str, Any]:
        now = datetime.now(timezone.utc)
        customer = payload.model_dump()
        customer['id'] = f'cust-{uuid4().hex[:8]}'
        customer['owner_id'] = owner_id
        customer['owner_name'] = owner_name
        customer['created_at'] = now
        customer['updated_at'] = now
        self._collection('customers').insert_one(customer)
        return customer

    def update_customer(self, customer_id: str, payload: CustomerUpdate) -> dict[str, Any]:
        result = self._collection('customers').find_one_and_update(
            {'id': customer_id},
            {'$set': {**payload.model_dump(exclude_none=True), 'updated_at': datetime.now(timezone.utc)}},
            return_document=ReturnDocument.AFTER,
        )
        record = self._serialize(result)
        if not record:
            raise CRMNotFoundError('Customer not found')
        return record

    def delete_customer(self, customer_id: str) -> None:
        result = self._collection('customers').delete_one({'id': customer_id})
        if result.deleted_count == 0:
            raise CRMNotFoundError('Customer not found')
        self._collection('deals').delete_many({'customer_id': customer_id})
        self._collection('activities').delete_many({'customer_id': customer_id})

    def list_deals(self, stage: str | None = None, owner_id: str | None = None) -> list[dict[str, Any]]:
        query: dict[str, Any] = {}
        if stage:
            query['stage'] = stage
        if owner_id:
            query['owner_id'] = owner_id
        return [self._serialize(item) for item in self._collection('deals').find(query, sort=[('updated_at', -1)])]

    def get_deal(self, deal_id: str) -> dict[str, Any]:
        record = self._serialize(self._collection('deals').find_one({'id': deal_id}))
        if not record:
            raise CRMNotFoundError('Deal not found')
        return record

    def create_deal(self, payload: DealCreate) -> dict[str, Any]:
        self.get_customer(payload.customer_id)
        now = datetime.now(timezone.utc)
        deal = payload.model_dump()
        deal['id'] = f'deal-{uuid4().hex[:8]}'
        deal['created_at'] = now
        deal['updated_at'] = now
        self._collection('deals').insert_one(deal)
        return deal

    def update_deal(self, deal_id: str, payload: DealUpdate) -> dict[str, Any]:
        result = self._collection('deals').find_one_and_update(
            {'id': deal_id},
            {'$set': {**payload.model_dump(exclude_none=True), 'updated_at': datetime.now(timezone.utc)}},
            return_document=ReturnDocument.AFTER,
        )
        record = self._serialize(result)
        if not record:
            raise CRMNotFoundError('Deal not found')
        return record

    def delete_deal(self, deal_id: str) -> None:
        result = self._collection('deals').delete_one({'id': deal_id})
        if result.deleted_count == 0:
            raise CRMNotFoundError('Deal not found')
        self._collection('activities').update_many({'deal_id': deal_id}, {'$set': {'deal_id': None, 'updated_at': datetime.now(timezone.utc)}})

    def list_activities(self, activity_type: str | None = None, assigned_to_id: str | None = None) -> list[dict[str, Any]]:
        query: dict[str, Any] = {}
        if activity_type:
            query['activity_type'] = activity_type
        if assigned_to_id:
            query['assigned_to_id'] = assigned_to_id
        return [self._serialize(item) for item in self._collection('activities').find(query, sort=[('updated_at', -1)])]

    def get_activity(self, activity_id: str) -> dict[str, Any]:
        record = self._serialize(self._collection('activities').find_one({'id': activity_id}))
        if not record:
            raise CRMNotFoundError('Activity not found')
        return record

    def create_activity(self, payload: ActivityCreate) -> dict[str, Any]:
        self.get_customer(payload.customer_id)
        now = datetime.now(timezone.utc)
        activity = payload.model_dump()
        activity['id'] = f'act-{uuid4().hex[:8]}'
        activity['created_at'] = now
        activity['updated_at'] = now
        self._collection('activities').insert_one(activity)
        return activity

    def update_activity(self, activity_id: str, payload: ActivityUpdate) -> dict[str, Any]:
        updates = payload.model_dump(exclude_none=True)
        if updates.get('status') == 'Completed' and 'completed_at' not in updates:
            updates['completed_at'] = datetime.now(timezone.utc)
        result = self._collection('activities').find_one_and_update(
            {'id': activity_id},
            {'$set': {**updates, 'updated_at': datetime.now(timezone.utc)}},
            return_document=ReturnDocument.AFTER,
        )
        record = self._serialize(result)
        if not record:
            raise CRMNotFoundError('Activity not found')
        return record

    def delete_activity(self, activity_id: str) -> None:
        result = self._collection('activities').delete_one({'id': activity_id})
        if result.deleted_count == 0:
            raise CRMNotFoundError('Activity not found')

    def _analytics_repo(self) -> InMemoryCRMRepository:
        repo = InMemoryCRMRepository()
        repo.users = {item['id']: item for item in self.list_users()}
        repo.customers = {item['id']: item for item in self.list_customers()}
        repo.deals = {item['id']: item for item in self.list_deals()}
        repo.activities = {item['id']: item for item in self.list_activities()}
        repo.seeded = True
        return repo

    def get_dashboard_metrics(self) -> DashboardMetrics:
        return self._analytics_repo().get_dashboard_metrics()

    def get_pipeline_summary(self) -> list[PipelineStageSummary]:
        return self._analytics_repo().get_pipeline_summary()

    def get_revenue_forecast(self) -> list[RevenueForecastPoint]:
        return self._analytics_repo().get_revenue_forecast()

    def get_acquisition_metrics(self) -> list[AcquisitionMetric]:
        return self._analytics_repo().get_acquisition_metrics()

    def get_activity_report(self) -> list[ActivityReportSummary]:
        return self._analytics_repo().get_activity_report()
