from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

Role = Literal['admin', 'manager', 'sales_rep']
CustomerSize = Literal['Enterprise', 'Mid-Market', 'SMB']
CustomerStatus = Literal['Lead', 'Onboarding', 'Active', 'At Risk', 'Churned']
DealStage = Literal['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost']
Priority = Literal['Low', 'Medium', 'High', 'Critical']
ActivityType = Literal['Call', 'Email', 'Meeting', 'Note', 'Task']


class APIModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class TokenResponse(APIModel):
    access_token: str
    token_type: str = 'bearer'
    user: 'UserPublic'


class LoginRequest(APIModel):
    email: EmailStr
    password: str = Field(min_length=8)


class UserBase(APIModel):
    name: str = Field(min_length=2)
    email: EmailStr
    role: Role
    title: str = ''
    region: str = ''


class UserCreate(UserBase):
    password: str = Field(min_length=8)


class UserUpdate(APIModel):
    name: str | None = None
    title: str | None = None
    region: str | None = None
    password: str | None = Field(default=None, min_length=8)


class UserPublic(UserBase):
    id: str
    created_at: datetime


class InteractionLog(APIModel):
    timestamp: datetime
    channel: ActivityType
    summary: str
    owner_name: str


class CustomerBase(APIModel):
    company_name: str = Field(min_length=2)
    primary_contact: str = Field(min_length=2)
    email: EmailStr
    phone: str = Field(min_length=6)
    address: str
    industry: str
    segment: CustomerSize
    status: CustomerStatus
    health_score: int = Field(ge=0, le=100)
    annual_revenue: float = Field(ge=0, default=0)
    employee_count: int = Field(ge=1, default=1)
    notes: str = ''


class CustomerCreate(CustomerBase):
    history: list[InteractionLog] = Field(default_factory=list)


class CustomerUpdate(APIModel):
    company_name: str | None = None
    primary_contact: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    address: str | None = None
    industry: str | None = None
    segment: CustomerSize | None = None
    status: CustomerStatus | None = None
    health_score: int | None = Field(default=None, ge=0, le=100)
    annual_revenue: float | None = Field(default=None, ge=0)
    employee_count: int | None = Field(default=None, ge=1)
    notes: str | None = None
    history: list[InteractionLog] | None = None


class CustomerPublic(CustomerBase):
    id: str
    owner_id: str
    owner_name: str
    history: list[InteractionLog] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class DealHistoryEntry(APIModel):
    timestamp: datetime
    stage: DealStage
    note: str
    probability: int = Field(ge=0, le=100)


class DealBase(APIModel):
    title: str = Field(min_length=2)
    customer_id: str
    customer_name: str
    owner_id: str
    owner_name: str
    stage: DealStage
    value: float = Field(ge=0)
    probability: int = Field(ge=0, le=100)
    expected_close_date: date
    description: str = ''


class DealCreate(DealBase):
    history: list[DealHistoryEntry] = Field(default_factory=list)


class DealUpdate(APIModel):
    title: str | None = None
    customer_id: str | None = None
    customer_name: str | None = None
    owner_id: str | None = None
    owner_name: str | None = None
    stage: DealStage | None = None
    value: float | None = Field(default=None, ge=0)
    probability: int | None = Field(default=None, ge=0, le=100)
    expected_close_date: date | None = None
    description: str | None = None
    history: list[DealHistoryEntry] | None = None


class DealPublic(DealBase):
    id: str
    history: list[DealHistoryEntry] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class ActivityBase(APIModel):
    title: str = Field(min_length=2)
    activity_type: ActivityType
    customer_id: str
    customer_name: str
    assigned_to_id: str
    assigned_to_name: str
    priority: Priority
    due_date: datetime
    status: Literal['Pending', 'Completed'] = 'Pending'
    deal_id: str | None = None
    notes: str = ''


class ActivityCreate(ActivityBase):
    completed_at: datetime | None = None


class ActivityUpdate(APIModel):
    title: str | None = None
    activity_type: ActivityType | None = None
    customer_id: str | None = None
    customer_name: str | None = None
    assigned_to_id: str | None = None
    assigned_to_name: str | None = None
    priority: Priority | None = None
    due_date: datetime | None = None
    status: Literal['Pending', 'Completed'] | None = None
    deal_id: str | None = None
    notes: str | None = None
    completed_at: datetime | None = None


class ActivityPublic(ActivityBase):
    id: str
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class DashboardMetrics(APIModel):
    total_customers: int
    active_customers: int
    total_pipeline_value: float
    weighted_pipeline_value: float
    open_deals: int
    won_deals: int
    overdue_activities: int
    monthly_forecast: float


class PipelineStageSummary(APIModel):
    stage: DealStage
    count: int
    value: float


class RevenueForecastPoint(APIModel):
    month: str
    value: float


class AcquisitionMetric(APIModel):
    label: str
    value: int


class ActivityReportSummary(APIModel):
    label: str
    pending: int
    completed: int


UserPublic.model_rebuild()
