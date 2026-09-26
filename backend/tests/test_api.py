import os
from datetime import date, datetime, timedelta, timezone

os.environ['CRM_STORAGE_MODE'] = 'memory'
os.environ['AUTO_SEED_DEMO'] = 'true'
os.environ['JWT_SECRET'] = 'test-secret'

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def auth_headers(email: str = 'admin@bissaesse.com', password: str = 'Password123!') -> dict[str, str]:
    response = client.post('/api/auth/login', json={'email': email, 'password': password})
    assert response.status_code == 200, response.text
    token = response.json()['access_token']
    return {'Authorization': 'Bearer ' + token}


def test_health_endpoint_exposes_branding() -> None:
    response = client.get('/health')
    assert response.status_code == 200
    payload = response.json()
    assert payload['company'] == 'Bissa Esse Enterprises'
    assert payload['storage_mode'] == 'memory'


def test_login_and_dashboard_metrics() -> None:
    response = client.get('/api/analytics/dashboard', headers=auth_headers())
    assert response.status_code == 200
    metrics = response.json()
    assert metrics['total_customers'] >= 6
    assert metrics['total_pipeline_value'] > 0


def test_register_defaults_to_sales_rep_role() -> None:
    response = client.post(
        '/api/auth/register',
        json={
            'name': 'New Enterprise Rep',
            'email': 'newrep@bissaesse.com',
            'role': 'admin',
            'title': 'Should not become admin',
            'region': 'North America',
            'password': 'Password123!',
        },
    )
    assert response.status_code == 201, response.text
    payload = response.json()
    assert payload['role'] == 'sales_rep'

    login = client.post('/api/auth/login', json={'email': 'newrep@bissaesse.com', 'password': 'Password123!'})
    assert login.status_code == 200
    assert login.json()['user']['role'] == 'sales_rep'


def test_customer_deal_and_activity_crud_flow() -> None:
    headers = auth_headers()
    customer_payload = {
        'company_name': 'Helios Telecom',
        'primary_contact': 'Naa Kwartey',
        'email': 'naa@heliostelecom.com',
        'phone': '+233-20-555-0199',
        'address': 'Osu, Accra, Ghana',
        'industry': 'Telecommunications',
        'segment': 'Enterprise',
        'status': 'Lead',
        'health_score': 74,
        'annual_revenue': 5400000,
        'employee_count': 1100,
        'notes': 'Interested in omnichannel customer operations.',
        'history': [],
    }
    customer_response = client.post('/api/customers', headers=headers, json=customer_payload)
    assert customer_response.status_code == 201, customer_response.text
    customer = customer_response.json()
    original_customer_created_at = customer['created_at']

    customer_update = client.put(
        f"/api/customers/{customer['id']}",
        headers=headers,
        json={'status': 'Active', 'health_score': 82},
    )
    assert customer_update.status_code == 200, customer_update.text
    updated_customer = customer_update.json()
    assert updated_customer['status'] == 'Active'
    assert updated_customer['health_score'] == 82
    assert updated_customer['owner_name'] == customer['owner_name']
    assert updated_customer['created_at'] == original_customer_created_at

    deal_payload = {
        'title': 'Helios CRM transformation',
        'customer_id': customer['id'],
        'customer_name': customer['company_name'],
        'owner_id': 'user-admin',
        'owner_name': 'Ama Mensah',
        'stage': 'Proposal',
        'value': 980000,
        'probability': 70,
        'expected_close_date': str(date.today() + timedelta(days=45)),
        'description': 'Regional CRM and analytics rollout.',
        'history': [],
    }
    deal_response = client.post('/api/deals', headers=headers, json=deal_payload)
    assert deal_response.status_code == 201, deal_response.text
    deal = deal_response.json()
    original_deal_created_at = deal['created_at']

    deal_update = client.put(
        f"/api/deals/{deal['id']}",
        headers=headers,
        json={'probability': 85, 'stage': 'Negotiation'},
    )
    assert deal_update.status_code == 200, deal_update.text
    updated_deal = deal_update.json()
    assert updated_deal['probability'] == 85
    assert updated_deal['stage'] == 'Negotiation'
    assert updated_deal['owner_name'] == deal['owner_name']
    assert updated_deal['created_at'] == original_deal_created_at

    activity_payload = {
        'title': 'Executive proposal review',
        'activity_type': 'Meeting',
        'customer_id': customer['id'],
        'customer_name': customer['company_name'],
        'assigned_to_id': 'user-admin',
        'assigned_to_name': 'Ama Mensah',
        'priority': 'High',
        'due_date': (datetime.now(timezone.utc) + timedelta(days=3)).isoformat(),
        'status': 'Pending',
        'deal_id': deal['id'],
        'notes': 'Review the proposal with finance and procurement.',
        'completed_at': None,
    }
    activity_response = client.post('/api/activities', headers=headers, json=activity_payload)
    assert activity_response.status_code == 201, activity_response.text

    pipeline_response = client.get('/api/deals/pipeline', headers=headers)
    assert pipeline_response.status_code == 200
    assert any(stage['stage'] == 'Proposal' for stage in pipeline_response.json())

    activity_update = client.put(
        f"/api/activities/{activity_response.json()['id']}",
        headers=headers,
        json={'status': 'Completed'},
    )
    assert activity_update.status_code == 200
    assert activity_update.json()['status'] == 'Completed'
    assert activity_update.json()['completed_at'] is not None


def test_role_protection_for_users_endpoint() -> None:
    headers = auth_headers('rep@bissaesse.com', 'Password123!')
    response = client.get('/api/users', headers=headers)
    assert response.status_code == 403


def test_sales_rep_cannot_edit_other_users_records() -> None:
    headers = auth_headers('rep@bissaesse.com', 'Password123!')

    customer_response = client.put('/api/customers/cust-aurora', headers=headers, json={'status': 'Churned'})
    assert customer_response.status_code == 403

    deal_response = client.put('/api/deals/deal-aurora-renewal', headers=headers, json={'stage': 'Closed Lost'})
    assert deal_response.status_code == 403

    activity_response = client.put('/api/activities/act-1', headers=headers, json={'status': 'Completed'})
    assert activity_response.status_code == 403


def test_create_endpoints_ignore_forged_owner_fields() -> None:
    headers = auth_headers('rep@bissaesse.com', 'Password123!')

    deal_response = client.post(
        '/api/deals',
        headers=headers,
        json={
            'title': 'Forged owner deal',
            'customer_id': 'cust-kingsway',
            'customer_name': 'Kingsway Logistics',
            'owner_id': 'user-admin',
            'owner_name': 'Ama Mensah',
            'stage': 'Prospecting',
            'value': 50000,
            'probability': 20,
            'expected_close_date': str(date.today() + timedelta(days=14)),
            'description': 'Ownership should be reset to the authenticated user.',
            'history': [],
        },
    )
    assert deal_response.status_code == 201, deal_response.text
    created_deal = deal_response.json()
    assert created_deal['owner_id'] == 'user-rep'
    assert created_deal['owner_name'] == 'Efua Owusu'

    activity_response = client.post(
        '/api/activities',
        headers=headers,
        json={
            'title': 'Forged assignee activity',
            'activity_type': 'Task',
            'customer_id': 'cust-kingsway',
            'customer_name': 'Kingsway Logistics',
            'assigned_to_id': 'user-admin',
            'assigned_to_name': 'Ama Mensah',
            'priority': 'Medium',
            'due_date': (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
            'status': 'Pending',
            'deal_id': None,
            'notes': 'Assignee should be reset to the authenticated user.',
            'completed_at': None,
        },
    )
    assert activity_response.status_code == 201, activity_response.text
    created_activity = activity_response.json()
    assert created_activity['assigned_to_id'] == 'user-rep'
    assert created_activity['assigned_to_name'] == 'Efua Owusu'
