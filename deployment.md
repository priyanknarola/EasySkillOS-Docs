---
layout: default
title: Deployment Guide
subtitle: Docker Compose, environment topology, and GitHub Actions CI/CD
permalink: /deployment
---

## Prerequisites

| Tool | Min Version | Purpose |
|------|------------|---------|
| Docker Desktop | 24+ | Container runtime |
| Docker Compose | v2 (bundled) | Service orchestration |
| Make | any | Dev shortcuts |
| Git | 2.x | Version control |
| Python | 3.11+ | Local backend dev (optional) |
| Node.js | 18+ | Local frontend dev (optional) |

---

## Local Development

### Quick Start

```bash
# 1. Clone and enter the repo
git clone https://github.com/Easyskill-Career-Academy/EasyskillOS.git
cd EasyskillOS

# 2. Configure environment
cp .env.example .env
cp backend/.env.example backend/.env

# 3. Build and start all services
make dev-build

# 4. Apply database migrations
make migrate

# 5. Verify
curl http://localhost:8000/api/v1/health
open http://localhost:5173
```

---

## Docker Services

> **Note:** EasySkillOS uses non-standard ports to avoid conflicts with local databases.

| Service | Image | Dev Port | Purpose |
|---------|-------|----------|---------|
| `backend` | `python:3.11-slim` | **8000** | FastAPI app (uvicorn --reload) |
| `frontend` | `node:18-alpine` | **5173** | Vite dev server (HMR) |
| `postgres` | `postgres:16-alpine` | **5436** | Primary database (standard 5432 avoided) |
| `redis` | `redis:7-alpine` | **6382** | Cache/broker (standard 6379 avoided) |
| `celery_worker` | (same as backend) | — | Background task processing |
| `celery_beat` | (same as backend) | — | Periodic task scheduler |
| `flower` | `mher/flower` | **5555** | Celery monitoring UI |
| `nginx` | `nginx:1.25-alpine` | 80/443 | Reverse proxy (prod only) |

### docker-compose.yml structure

```yaml
# Key service relationships
services:
  postgres:
    image: postgres:16-alpine
    ports: ["5436:5432"]          # non-standard host port
    volumes: [postgres_data:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    ports: ["6382:6379"]          # non-standard host port

  backend:
    build: ./backend
    ports: ["8000:8000"]
    depends_on: [postgres, redis]
    environment:
      DATABASE_URL: postgresql+asyncpg://postgres:${DB_PASSWORD}@postgres:5432/easyskill
      REDIS_URL: redis://redis:6379/0

  celery_worker:
    build: ./backend
    command: celery -A app.tasks.celery_app worker -Q default,ai,notifications
    depends_on: [postgres, redis, backend]

  celery_beat:
    build: ./backend
    command: celery -A app.tasks.celery_app beat --scheduler redbeat.RedBeatScheduler
    depends_on: [redis]
```

---

## Make Commands

```bash
# ── Development ──────────────────────────────────────
make dev              # Start all services (Docker Compose up)
make dev-build        # Rebuild images + start
make dev-backend      # Run backend only (uvicorn --reload :8000)
make dev-frontend     # Run frontend only (vite :5173)
make logs             # Tail all Docker service logs

# ── Database ─────────────────────────────────────────
make migrate                        # Apply pending Alembic migrations
make migrate-create msg="add_col"   # Generate new migration
make shell-db                       # Open PostgreSQL psql CLI

# ── Testing ──────────────────────────────────────────
make test             # Run full pytest suite
make test-coverage    # Tests + HTML coverage report at htmlcov/

# ── Background Workers ───────────────────────────────
make celery-worker    # Start Celery worker (queues: default, ai, notifications)
make celery-flower    # Flower monitoring at localhost:5555

# ── Production ───────────────────────────────────────
make prod-build       # Build production images
make prod-up          # Start production stack
make prod-logs        # Tail production logs
```

---

## Environment Variables

### Root `.env` (Docker Compose variables)

| Variable | Required | Description |
|----------|----------|-------------|
| `DB_PASSWORD` | ✅ | PostgreSQL password |
| `REDIS_PASSWORD` | ⬜ | Redis auth (optional in dev) |
| `APP_ENV` | ✅ | `development` \| `staging` \| `production` |

### `backend/.env` (FastAPI application)

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET_KEY` | ✅ | HS256 signing secret (min 32 chars) |
| `DATABASE_URL` | ✅ | `postgresql+asyncpg://user:pass@host:port/db` |
| `REDIS_URL` | ✅ | `redis://host:port/0` |
| `OPENAI_API_KEY` | ✅ | `sk-...` — AI features degrade without this |
| `RAZORPAY_KEY_ID` | ✅ | `rzp_test_...` or `rzp_live_...` |
| `RAZORPAY_KEY_SECRET` | ✅ | Razorpay secret |
| `MSG91_AUTH_KEY` | ⬜ | SMS / OTP delivery |
| `RESEND_API_KEY` | ⬜ | `re_...` — transactional email |
| `AISENSY_API_KEY` | ⬜ | WhatsApp Business API |
| `TELEGRAM_BOT_TOKEN` | ⬜ | Follow-up escalation alerts |
| `CLOUDFLARE_R2_ACCESS_KEY` | ⬜ | File storage |
| `CLOUDFLARE_R2_SECRET_KEY` | ⬜ | File storage |
| `CLOUDFLARE_R2_BUCKET` | ⬜ | Bucket name |
| `CLOUDFLARE_R2_ENDPOINT` | ⬜ | `https://{account}.r2.cloudflarestorage.com` |
| `TELEGRAM_ESCALATION_USER_ID` | ⬜ | Admin Telegram chat ID for Tier 3 alerts |
| `TELEGRAM_ALERT_CHAT_ID` | ⬜ | Channel ID for broadcast alerts |
| `SENTRY_DSN` | ⬜ | Error monitoring |
| `HUBSTAFF_ACCESS_TOKEN` | ⬜ | Staff activity tracking |

---

## Environment Topology

```
┌─────────────────────────────────────────────────────────────┐
│  Hostinger VPS  (147.93.108.184)                            │
│                                                              │
│  ┌──────────────────────────┐  ┌─────────────────────────┐  │
│  │  dev2.skillpromax.in     │  │  dev.skillpromax.in     │  │
│  │  /var/www/dev2.*         │  │  /var/www/dev.*         │  │
│  │  Branch: dev             │  │  Branch: dev-student    │  │
│  │  Auto-deploy via CI      │  │  Manual deploy          │  │
│  │  Ports: 8008/5436/6382   │  │  Ports: 8001/5434/6380  │  │
│  │  Prefix: dev2-skillpromax│  │  Prefix: dev-skillpromax│  │
│  └──────────────────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

Production: Separate host — requires explicit instruction
```

| Environment | Domain | Auto-deploy | Branch | Notes |
|------------|--------|-------------|--------|-------|
| **dev2** | `dev2.skillpromax.in` | ✅ On every `dev` push | `dev` | Primary testing env |
| **dev** | `dev.skillpromax.in` | Manual | `dev-student` | Extended testing |
| **Production** | TBD | Manual only | `main` | Requires explicit approval |

> ⚠️ **Never deploy directly to production** without explicit user confirmation. The "deploy it" shortcut routes to `dev` only.

---

## GitHub Actions — Dev Auto-Deploy

```yaml
# .github/workflows/deploy-dev.yml
name: Deploy to dev2

on:
  push:
    branches: [dev]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /var/www/dev2.skillpromax.in
            git pull origin dev
            docker compose -f docker-compose.yml pull
            docker compose -f docker-compose.yml up -d --build
            docker compose exec -T backend alembic upgrade head
```

---

## Manual Deployment (dev.skillpromax.in)

```bash
ssh hostinger-vps
cd /var/www/dev.skillpromax.in
bash deploy.sh
```

The `deploy.sh` script:
1. `git fetch origin && git rebase origin/dev`
2. `docker compose -f docker-compose.yml up -d --build`
3. `docker compose exec backend alembic upgrade head`
4. `docker compose restart celery_worker celery_beat`

---

## Production Deployment Checklist

Before promoting to production:

- [ ] All tests green: `make test`
- [ ] Migrations reviewed and tested on staging
- [ ] Environment variables set on prod host
- [ ] Razorpay key switched from `rzp_test_` to `rzp_live_`
- [ ] Sentry DSN configured for error alerts
- [ ] Cloudflare R2 production bucket configured
- [ ] SSL certificate valid (Nginx + Certbot)
- [ ] Backup of production database taken
- [ ] Announce maintenance window to active users if schema migration is destructive

---

## Troubleshooting

### Port conflicts

```bash
# PostgreSQL: check port 5436
lsof -i :5436

# Redis: check port 6382
redis-cli -p 6382 ping

# Backend API: check 8000
curl http://localhost:8000/api/v1/health
```

### Migration conflicts

```bash
cd backend
alembic heads          # lists multiple heads if branched
alembic merge heads -m "merge"
# Edit the generated migration, then:
make migrate
```

### Celery worker not picking up tasks

```bash
# Check worker is running
docker compose ps celery_worker

# Check task queues in Flower
open http://localhost:5555

# Restart worker
docker compose restart celery_worker
```

### Container memory pressure

```bash
# Check resource usage
docker stats

# Scale worker concurrency down if needed (docker-compose.yml):
# command: celery worker --concurrency=2 -Q default,ai,notifications
```
