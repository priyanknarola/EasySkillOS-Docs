---
layout: default
title: EasySkillOS Developer Quick-Start
permalink: /
---

<div class="hero">
  <h1 class="hero-title">EasySkillOS Developer Docs</h1>
  <p class="hero-subtitle">AI-Powered Career OS for EasySkill Career Academy — Surat, Gujarat</p>
  <div class="hero-badges">
    <span class="badge badge--brand">17 Portals</span>
    <span class="badge badge--brand">987 API Endpoints</span>
    <span class="badge badge--brand">136 DB Tables</span>
    <span class="badge badge--ai">GPT-4o-mini AI</span>
    <span class="badge badge--success">400+ Students</span>
    <span class="badge badge--amber">12,375+ CRM Leads</span>
  </div>
</div>

<div class="stat-grid">
  <div class="stat-card">
    <span class="stat-number">987</span>
    <div class="stat-label">API Endpoints<br><small>120 route modules</small></div>
  </div>
  <div class="stat-card">
    <span class="stat-number">136</span>
    <div class="stat-label">Database Tables<br><small>200 FK relationships</small></div>
  </div>
  <div class="stat-card">
    <span class="stat-number">17</span>
    <div class="stat-label">User Portals<br><small>Admin → Recruiter</small></div>
  </div>
  <div class="stat-card">
    <span class="stat-number">58</span>
    <div class="stat-label">DB Migrations<br><small>Full Alembic history</small></div>
  </div>
  <div class="stat-card">
    <span class="stat-number">320</span>
    <div class="stat-label">Python Files<br><small>Backend</small></div>
  </div>
  <div class="stat-card">
    <span class="stat-number">643</span>
    <div class="stat-label">TS/TSX Files<br><small>Frontend</small></div>
  </div>
</div>

---

## Tech Stack at a Glance

<div class="stack-grid">
  <div class="stack-card">
    <span class="stack-icon">⚡</span>
    <div class="stack-info">
      <div class="stack-name">FastAPI</div>
      <div class="stack-detail">Python 3.11 · async · Pydantic v2</div>
    </div>
  </div>
  <div class="stack-card">
    <span class="stack-icon">🗄️</span>
    <div class="stack-info">
      <div class="stack-name">PostgreSQL 16</div>
      <div class="stack-detail">SQLAlchemy 2.0 · asyncpg · Alembic</div>
    </div>
  </div>
  <div class="stack-card">
    <span class="stack-icon">⚡</span>
    <div class="stack-info">
      <div class="stack-name">Redis 7</div>
      <div class="stack-detail">Cache · Celery broker · OTP · SSE</div>
    </div>
  </div>
  <div class="stack-card">
    <span class="stack-icon">⚙️</span>
    <div class="stack-info">
      <div class="stack-name">Celery 5</div>
      <div class="stack-detail">Queues: default · ai · notifications</div>
    </div>
  </div>
  <div class="stack-card">
    <span class="stack-icon">⚛️</span>
    <div class="stack-info">
      <div class="stack-name">React 18 + Vite</div>
      <div class="stack-detail">TypeScript 5 · shadcn/ui · Tailwind 3.4</div>
    </div>
  </div>
  <div class="stack-card">
    <span class="stack-icon">🤖</span>
    <div class="stack-info">
      <div class="stack-name">OpenAI</div>
      <div class="stack-detail">GPT-4o-mini (primary) · GPT-4o (heavy)</div>
    </div>
  </div>
  <div class="stack-card">
    <span class="stack-icon">💳</span>
    <div class="stack-info">
      <div class="stack-name">Razorpay</div>
      <div class="stack-detail">Orders · EMI · HMAC webhooks</div>
    </div>
  </div>
  <div class="stack-card">
    <span class="stack-icon">🐳</span>
    <div class="stack-info">
      <div class="stack-name">Docker Compose</div>
      <div class="stack-detail">Dev + Prod configs · Nginx</div>
    </div>
  </div>
  <div class="stack-card">
    <span class="stack-icon">☁️</span>
    <div class="stack-info">
      <div class="stack-name">Cloudflare R2</div>
      <div class="stack-detail">S3-compatible · Certs · Resumes</div>
    </div>
  </div>
  <div class="stack-card">
    <span class="stack-icon">📧</span>
    <div class="stack-info">
      <div class="stack-name">Resend + MSG91</div>
      <div class="stack-detail">Email · SMS/OTP</div>
    </div>
  </div>
  <div class="stack-card">
    <span class="stack-icon">💬</span>
    <div class="stack-info">
      <div class="stack-name">AiSensy / Meta</div>
      <div class="stack-detail">WhatsApp Business API</div>
    </div>
  </div>
  <div class="stack-card">
    <span class="stack-icon">📱</span>
    <div class="stack-info">
      <div class="stack-name">Telegram Bot</div>
      <div class="stack-detail">Follow-up · Escalation alerts</div>
    </div>
  </div>
</div>

---

## Local Development Setup

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Python | 3.11+ | [python.org](https://python.org) |
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| Docker Desktop | latest | [docker.com](https://docker.com) |
| Git | any | `brew install git` |
| Make | any | `brew install make` |

### Step 1 — Clone & configure environment

```bash
git clone https://github.com/Easyskill-Career-Academy/EasyskillOS.git
cd EasyskillOS

# Copy all three required env files
cp .env.example .env
cp backend/.env.example backend/.env
# frontend/.env is pre-configured (uses Vite defaults)
```

**Minimum required `.env` values** (others have safe defaults):

```bash
# .env (Docker Compose)
DB_PASSWORD=changeme_dev
REDIS_PASSWORD=changeme_dev
APP_ENV=development

# backend/.env
JWT_SECRET_KEY=any-long-random-string-here
DATABASE_URL=postgresql+asyncpg://postgres:changeme_dev@localhost:5436/easyskill
REDIS_URL=redis://localhost:6382/0

# Optional but needed for full functionality:
OPENAI_API_KEY=sk-...
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
MSG91_AUTH_KEY=...
RESEND_API_KEY=re_...
AISENSY_API_KEY=...
TELEGRAM_BOT_TOKEN=...
CLOUDFLARE_R2_ACCESS_KEY=...
CLOUDFLARE_R2_SECRET_KEY=...
CLOUDFLARE_R2_BUCKET=...
CLOUDFLARE_R2_ENDPOINT=...
```

### Step 2 — Start all services

```bash
# Full stack via Docker Compose (recommended for first run)
make dev-build   # builds images + starts everything

# OR start without rebuilding:
make dev

# Services started:
#   PostgreSQL 16  → localhost:5436
#   Redis 7        → localhost:6382
#   Backend API    → localhost:8000  (auto-reload)
#   Frontend       → localhost:5173  (Vite HMR)
#   Celery Worker  → (background)
#   Celery Beat    → (background)
#   Flower Monitor → localhost:5555
```

### Step 3 — Run database migrations

```bash
make migrate
# Runs all 58 pending Alembic migrations
# Creates all 136 tables + indexes

# Check migration status:
make shell-db
# \dt    — list all tables
# \q     — quit
```

### Step 4 — Verify everything is up

```bash
# Check API health
curl http://localhost:8000/api/v1/health

# Expected:
# {"status":"healthy","db":"connected","redis":"connected","version":"..."}

# Check frontend
open http://localhost:5173
```

### Step 5 — Run tests

```bash
make test                  # Full pytest suite (~380+ tests)
make test-coverage         # With HTML coverage report
```

---

## Key Directory Structure

```
EasySkillOS/
├── backend/
│   ├── app/
│   │   ├── main.py              ← FastAPI entry point, router mounting
│   │   ├── api/v1/              ← 66 route modules (one per feature/portal)
│   │   ├── routers/             ← 54 additional route modules
│   │   ├── core/
│   │   │   ├── config.py        ← Canonical settings (Pydantic BaseSettings)
│   │   │   ├── database.py      ← SQLAlchemy async engine + session
│   │   │   └── security.py      ← JWT, RBAC, password hashing
│   │   ├── models/              ← 37 SQLAlchemy model files (166 classes)
│   │   ├── schemas/             ← Pydantic request/response schemas
│   │   ├── services/            ← Business logic (44 service files)
│   │   ├── ai/                  ← OpenAI integrations (32 AI modules)
│   │   ├── tasks/               ← Celery async tasks (31 task files)
│   │   ├── integrations/        ← Razorpay, Resend, MSG91, AiSensy wrappers
│   │   ├── middleware/          ← Rate limiting, security headers
│   │   └── utils/               ← Helpers, validators, constants
│   ├── migrations/versions/     ← 58 Alembic migration files
│   └── tests/                   ← pytest test suite (400+ tests)
│
├── frontend/
│   └── src/
│       └── app/
│           ├── pages/           ← One folder per portal (17 portals)
│           │   ├── admin/       ← Admin portal pages
│           │   ├── counselor/   ← Counselor CRM pages
│           │   ├── portal/      ← Student portal pages
│           │   ├── finance/     ← Finance portal
│           │   ├── hr/          ← HR portal
│           │   └── ...          ← 11 more portal folders
│           ├── components/      ← Shared + portal-specific components
│           ├── lib/
│           │   └── api.ts       ← Typed API client (all endpoints)
│           ├── store/           ← Zustand state stores (6 stores)
│           ├── hooks/           ← Custom React hooks
│           └── types/           ← TypeScript interfaces
│
├── docker-compose.yml           ← Dev services (non-standard ports: PG→5436, Redis→6382)
├── docker-compose.prod.yml      ← Production override
├── Makefile                     ← All dev/test/deploy commands
└── .env.example                 ← Template for environment variables
```

> **Note:** `app/config.py` is a deprecated shim — always use `app/core/config.py`

---

## Common Development Tasks

### Add a new API endpoint

1. Choose (or create) the appropriate route file in `backend/app/api/v1/` or `backend/app/routers/`
2. Add the route using FastAPI decorators:

```python
# backend/app/api/v1/my_module.py
from fastapi import APIRouter, Depends
from app.core.security import get_current_user

router = APIRouter(prefix="/api/v1/my-module", tags=["My Module"])

@router.get("/resource")
async def list_resources(
    page: int = 1,
    page_size: int = 20,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Business logic via service layer
    ...
```

3. Register the router in `backend/app/main.py`:

```python
from app.api.v1.my_module import router as my_module_router
app.include_router(my_module_router)
```

4. Add Pydantic schemas in `backend/app/schemas/`
5. Write tests in `backend/tests/test_my_module.py`

### Add a database migration

```bash
# After changing a SQLAlchemy model:
make migrate-create msg="add_my_new_column"

# Edit the generated file in migrations/versions/
# Apply the migration:
make migrate
```

### Add a Celery task

```python
# backend/app/tasks/my_tasks.py
from app.tasks.celery_app import celery_app

@celery_app.task(queue="default", bind=True, max_retries=3)
def my_background_task(self, payload: dict):
    try:
        # Long-running work here
        pass
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)
```

```bash
# Restart the worker to pick up new tasks:
make celery-worker
```

### Add a frontend page

1. Create the page component in `frontend/src/app/pages/{portal}/`
2. Add the route in `frontend/src/app/routes.ts`
3. Add API methods to `frontend/src/app/lib/api.ts`
4. Use existing shadcn/ui components from `frontend/src/app/components/ui/`

---

## Troubleshooting

### PostgreSQL won't start

```bash
# Check if port 5436 is in use (non-standard port to avoid conflicts)
lsof -i :5436
# Stop any conflicting process, then:
make dev
```

### Redis connection errors

```bash
# Check Redis is up on non-standard port 6382
redis-cli -p 6382 ping
# Should return: PONG
```

### Alembic migration conflicts

```bash
# If you see "Multiple heads found":
make shell-db
# Then from backend/:
alembic heads           # shows conflicting heads
alembic merge heads -m "merge_branches"
make migrate
```

### Frontend can't reach API

```bash
# Check vite.config.ts proxy — the dev server proxies /api → backend:8000
# Ensure VITE_API_URL is not overriding the proxy in frontend/.env
grep VITE_API_URL frontend/.env
```

### Celery tasks not processing

```bash
# Check worker logs
make logs | grep celery
# Or restart the worker:
docker compose restart celery_worker
# Monitor at:
open http://localhost:5555   # Flower
```

### AI calls failing

All AI calls have `try/except` with graceful fallback — check `backend/.env`:
```bash
grep OPENAI_API_KEY backend/.env
# Also check the daily AI cost cap:
# Settings → AI Credits Policy in the Admin portal
```

---

## Explore the Docs

| Doc | What's inside |
|-----|--------------|
| [Architecture →](./architecture) | Complete system design, all 14 sections |
| [API Reference →](./api-reference) | 987 endpoints across 120 modules |
| [Database →](./database) | 136 tables, domain breakdown, ER notes |
| [Diagrams →](./diagrams) | 10 Mermaid diagrams — system, flows, sequences |
| [Deployment →](./deployment) | Docker, env topology, GitHub Actions |
| [Lead Management →](./lead-management) | CRM pipeline, 4-tier escalation, AI scoring |
