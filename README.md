# Bissa Esse Enterprises CRM Prototype

A full working enterprise CRM prototype for **Bissa Esse Enterprises** built with **Angular**, **FastAPI**, and **MongoDB**.

## What is included

- **Angular 22 frontend** with responsive Bootstrap styling and Bissa Esse branding
- **FastAPI backend** with JWT authentication and role-based access control
- **MongoDB-ready data layer** with demo seed data and a memory mode for fast local previews/tests
- **Core CRM modules**:
  - Customer management with contact details, segmentation, health scores, and interaction history
  - Sales pipeline and deals with stage tracking, probability, expected close date, and funnel reporting
  - Activities and tasks with assignment, due dates, priorities, and calendar-style grouping
  - Reports and analytics for pipeline, forecast, acquisition, and activity performance
  - User profiles plus role-aware team visibility for admins, managers, and sales reps

## Repository structure

```text
backend/   FastAPI API, seed data, tests, env config
frontend/  Angular SPA, branded dashboard, feature pages
docker-compose.yml
```

## Demo users

All seeded demo accounts use the same password:

- `admin@bissaesse.com`
- `manager@bissaesse.com`
- `rep@bissaesse.com`
- Password: `Password123!`

## Local development

### 1. Start MongoDB (recommended)

```bash
docker compose up -d mongo
```

### 2. Run the backend

```bash
cd backend
cp .env.example .env
python -m pip install -r requirements.txt
python seeds.py          # optional reseed for MongoDB mode
uvicorn main:app --reload
```

The API is available at `http://localhost:8000` and interactive docs are at `http://localhost:8000/docs`.

### 3. Run the frontend

```bash
cd frontend
npm install
npm start
```

The Angular app is available at `http://localhost:4200`.

## Quick preview without MongoDB

For a lightweight demo or tests, the backend can run with in-memory sample data:

```bash
cd backend
CRM_STORAGE_MODE=memory uvicorn main:app --reload
```

## Docker option

Start the full prototype stack with Docker:

```bash
docker compose up --build
```

Services:

- Frontend: `http://localhost:8080`
- Backend: `http://localhost:8000`
- MongoDB: `mongodb://localhost:27017`

## Environment configuration

Root and backend `.env.example` files document the supported settings:

- `CRM_STORAGE_MODE` - `mongo` or `memory`
- `MONGO_URL` - MongoDB connection string
- `CRM_DATABASE` - database name
- `JWT_SECRET` - JWT signing secret
- `ACCESS_TOKEN_EXPIRE_MINUTES` - access token lifetime
- `AUTO_SEED_DEMO` - auto-load demo data when the store is empty
- `CORS_ORIGINS` - allowed frontend origins

## Validation

Backend tests:

```bash
cd backend
pytest -q
```

Frontend production build:

```bash
cd frontend
npm run build
```

## API summary

Base URL: `/api`

- `POST /auth/login`
- `POST /auth/register`
- `GET /auth/me`
- `GET/POST/PUT/DELETE /customers`
- `GET/POST/PUT/DELETE /deals`
- `GET /deals/pipeline`
- `GET/POST/PUT/DELETE /activities`
- `GET /analytics/dashboard`
- `GET /analytics/pipeline`
- `GET /analytics/forecast`
- `GET /analytics/acquisition`
- `GET /analytics/activity-report`
- `GET /users` and `PUT /users/me`

## Notes

- MongoDB is the primary persistence option for the prototype.
- The in-memory mode exists to keep the sample easy to review, test, and demo in lightweight environments.
- Demo data includes multiple customers, deals, activities, and users to immediately exercise the workflow.
