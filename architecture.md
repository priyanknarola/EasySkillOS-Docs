---
layout: default
title: System Architecture
subtitle: Layered monolith design, portal directory, AI engine, and infrastructure details
permalink: /architecture
---

## 1. System Overview

EasySkill Career Academy AI-Powered Career OS (**EasySkillOS**) is a full-stack multi-portal SaaS platform managing the complete student lifecycle for a vocational training academy in Surat, Gujarat.

**Business context**
- 3 physical centres: Adajan, Vesu, Bhestan
- 400+ active students, 12,375+ CRM leads, 6–8 counselors
- Courses in digital marketing, data analytics, AI/ML, graphic design, and allied tracks

**Scale:** 987 API endpoints, 120 route modules, 17 portals, 136 database tables, 200 FK relationships, 58 Alembic migrations

---

## 2. Technology Stack

| Layer | Technology | Version / Notes |
|-------|-----------|----------------|
| **Backend** | FastAPI | Python 3.11; async-first; Pydantic v2 |
| **ORM** | SQLAlchemy | 2.0 async engine; `AsyncSession` per request |
| **Database** | PostgreSQL | 16 — asyncpg driver |
| **Migrations** | Alembic | 58 migration files in `backend/migrations/versions/` |
| **Cache / Broker** | Redis | 7 — OTP, rate-limiting, Celery broker, SSE pub-sub |
| **Task Queue** | Celery | 5 — queues: `default`, `ai`, `notifications` |
| **Frontend** | React 18 + Vite | TypeScript 5; Vite HMR |
| **UI** | shadcn/ui | Radix UI primitives; Tailwind CSS 3.4 |
| **State** | Zustand | 6 stores: auth, UI, notifications, chat, Kai, command |
| **AI Primary** | OpenAI | GPT-4o-mini (primary); GPT-4o (heavy tasks) |
| **AI Embedding** | OpenAI | text-embedding-3-small — 1536-dim RAG |
| **Storage** | Cloudflare R2 | S3-compatible; certs, resumes, avatars |
| **Email** | Resend | Transactional + bulk; Redis-backed retry |
| **SMS / OTP** | MSG91 | OTP delivery; template-based |
| **WhatsApp** | Meta Cloud API | Free-text + template; AiSensy fallback |
| **Payments** | Razorpay | Orders, EMI, HMAC-SHA256 webhooks |
| **Alerts** | Telegram Bot API | Counselor follow-up escalation |
| **HR Monitoring** | Hubstaff | Activity sync, integrity scoring |
| **PDF** | WeasyPrint | Server-side: certs, portfolios, resumes |
| **Containers** | Docker Compose | Dev + prod configs |
| **Proxy** | Nginx | 1.25-alpine; SSL termination |
| **Error tracking** | Sentry | Optional DSN via env var |

---

## 3. Layered Architecture

EasySkillOS follows a **layered monolith** pattern with async I/O throughout:

```
Browser / Mobile
      │  HTTPS
      ▼
  Nginx (prod) / Vite dev proxy
      │  /api/* → backend:8000
      ▼
┌─────────────────────────────────────────────────────┐
│  FastAPI  (backend/app/main.py)                     │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │ Middleware   │  │ API Routes   │  │ Schemas   │  │
│  │ rate-limit  │  │ /api/v1/*    │  │ Pydantic  │  │
│  │ security    │  │ 120 modules  │  │ v2        │  │
│  └─────────────┘  └──────┬───────┘  └───────────┘  │
│                           │                          │
│  ┌────────────────────────▼────────────────────────┐│
│  │             Service Layer                        ││
│  │  auth_service  session_manager  grading          ││
│  │  campaign_executor  placement_readiness          ││
│  │  leaderboard  certificate_service  otp  email    ││
│  │  stage_recommendation_engine  ai_usage  …        ││
│  └───────┬─────────────────────┬───────────────────┘│
│          │                     │                     │
│  ┌───────▼───────┐   ┌─────────▼───────────┐        │
│  │  AI / ML      │   │  Integrations       │        │
│  │  kai_agent    │   │  razorpay  msg91    │        │
│  │  grading_eng  │   │  aisensy  resend    │        │
│  │  job_matcher  │   │  telegram  r2       │        │
│  │  rag_service  │   │  hubstaff  ga4      │        │
│  │  lead_scoring │   └─────────────────────┘        │
│  └───────┬───────┘                                   │
│  ┌───────▼───────────────────────────────────────┐  │
│  │  SQLAlchemy ORM  —  AsyncSession              │  │
│  │  166 model classes  ·  37 model files         │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
     │ async DB calls          │ Redis calls
     ▼                         ▼
PostgreSQL 16               Redis 7
(primary data)              (cache / broker / OTP)
     ▲
     │  Celery tasks (async)
┌────┴───────────────────────────────────────────┐
│  Celery Worker  (queues: default / ai / notif) │
│  Celery Beat    (periodic schedule)            │
└────────────────────────────────────────────────┘
```

**Key design decisions**
- AI calls > 2 seconds are dispatched to Celery; synchronous OpenAI only for blocking UX (Kai chat, mock interview grading)
- Every AI response carries `is_ai_generated: bool` in the response schema
- Server-side pagination mandatory on all list endpoints — no client-side iteration over 100+ rows
- Service layer is the single point of business logic; routes are thin validators + serialisers

---

## 4. Portal Directory

| # | Portal | Route Prefix | Target User | Key Features |
|---|--------|-------------|------------|-------------|
| 1 | **Public / Marketing** | `/` | Prospective students | Landing, track browse, pricing, cert verification, public portfolio |
| 2 | **Website** | `/website` | Marketing site | Homepage, courses, success stories, blog, FAQ, skill audit |
| 3 | **Student** | `/portal` | Enrolled students | Dashboard, AI mentor Kai, tracks, achievements, leaderboard, community, placement hub, resume builder, payments, support |
| 4 | **Admin** | `/admin` | Admin, super_admin | Full CRM, student tracker, AI audit, BI reports, CMS, campaigns, security centre |
| 5 | **Counselor** | `/counselor` | Counselors | Lead queue, follow-up calendar, CRM intelligence, demo scheduling |
| 6 | **Faculty** | `/faculty` | Instructors | Assessment builder, question bank, batch management, content CMS |
| 7 | **Finance** | `/finance` | Finance team | Fee tracker, EMI, scholarships, invoices, refund queue, revenue analytics |
| 8 | **HR** | `/hr` | HR team | Staff, attendance, leave, Hubstaff, payroll, integrity scoring |
| 9 | **Placement** | `/placement` | Placement team | Employer directory, analytics, outcomes, success stories |
| 10 | **Reviewer** | `/reviewer` | Content reviewers | Grading queue, content studio, student monitoring |
| 11 | **Partner** | `/partner` | Franchise partners | Referred leads, commissions, marketing materials |
| 12 | **Employer** | `/employer` | Hiring employers | Post jobs, browse candidates, application pipeline |
| 13 | **Corporate** | `/corporate` | Corporate training clients | Employee tracks, reports, billing |
| 14 | **College** | `/college` | College partners | Student list, reports, events |
| 15 | **Alumni** | `/alumni` | Graduates | Alumni directory, mentorship matching |
| 16 | **Recruiter** | `/recruiter` | Staffing agencies | Candidate search, hiring pipeline |
| 17 | **Parent** | `/parent` | Parents | Child progress, attendance, fees, counselor contact |

---

## 5. Database Architecture

136 tables across 14 bounded contexts — see [Database →](./database) for full domain breakdown.

**Key design decisions:**
- UUID PKs for all tables except `tracks` (uses human-readable slug like `meta-ads`)
- Soft deletes via `is_deleted` on `users` and `leads` for DPDP Act 2023 compliance
- All timestamps in UTC; IST displayed in frontend
- `numeric(10,2)` for all monetary amounts — never `float`
- JSONB columns for flexible data (permissions, tags, AI curriculum, filters)
- 1536-dim vectors in `knowledge_chunks` and `counselor_profiles.narrative_embedding` for RAG

---

## 6. Frontend Architecture

```
frontend/src/app/
├── pages/          ← One folder per portal (17 portals × N pages)
│   ├── admin/      ← ~40 admin pages
│   ├── counselor/  ← ~20 counselor CRM pages
│   ├── portal/     ← ~24 student portal pages
│   ├── finance/
│   ├── hr/
│   ├── faculty/
│   └── ...
├── components/
│   ├── ui/         ← shadcn/ui primitives (Button, Dialog, etc.)
│   ├── layout/     ← Sidebar, Header, Breadcrumb, Portal wrappers
│   ├── ai/         ← KaiChat, AIBadge, AIThinkingIndicator
│   └── admin/      ← AdminDataTable, StudentTrackerDrawer, etc.
├── lib/
│   ├── api.ts      ← Full typed API client (987 endpoints)
│   └── utils.ts    ← cn(), formatINR(), formatIST(), etc.
├── store/          ← 6 Zustand stores
├── hooks/          ← useKai, useNotifications, useAuth, etc.
├── types/          ← TypeScript interfaces
└── routes.ts       ← All route definitions
```

**Frontend conventions:**
- `api.ts` is the single typed HTTP client — all pages import from here, never raw `fetch`
- `formatINR()` in `utils.ts` formats currency with Indian number system (₹1,23,456)
- All dates converted to IST (Asia/Kolkata) before display
- shadcn/ui components are customised via Tailwind and CSS variables per brand spec

---

## 7. Authentication & Security

### JWT Flow

```
1. POST /api/v1/auth/login
   └─ returns access_token (short-lived) + refresh_token (long-lived)

2. All protected requests:
   └─ Authorization: Bearer <access_token>

3. 401 → POST /api/v1/auth/refresh
   └─ returns new access_token without re-login

4. Logout → POST /api/v1/auth/logout
   └─ invalidates refresh_token in Redis
```

**Token claims:** `sub` (UUID), `role`, `permissions` (list), `exp`, `iat`

### RBAC

Roles (highest → lowest): `super_admin` → `admin` → `counselor` → `faculty` → `student` → `parent` → `employer` → `partner`

Permissions follow `<resource>.<action>` pattern: `mock_interviews.view`, `support_tickets.manage`, `ai_mentor_logs.view`

Default permission sets in `app/core/security.py::ROLE_DEFAULT_PERMISSIONS`. Admins can grant extra permissions per user via System Config portal.

### Security Middleware

- **Rate limiting** — per-IP and per-user via Redis sliding window counters
- **CORS** — strict origin list in `app/core/config.py`
- **HTTPS** — enforced at Nginx; HSTS header
- **HMAC-SHA256** — all Razorpay webhook payloads are signature-verified before processing
- **API Keys** — stored as bcrypt hash only; plaintext never persisted

### 2FA / TOTP

Optional TOTP (authenticator app) via `POST /api/v1/auth/2fa/enable`. Backup codes in `user_backup_codes` (bcrypt-hashed, invalidated per `batch_id`).

---

## 8. Background Processing (Celery)

All operations > 2 seconds are dispatched to Celery workers:

| Queue | Purpose | Examples |
|-------|---------|---------|
| `default` | General background | Duplicate detection, counselor matching, certificate generation |
| `ai` | OpenAI calls | Lead scoring, grading, stage recommendations, course generation |
| `notifications` | External dispatch | Email (Resend), SMS (MSG91), WhatsApp (AiSensy), Telegram |

**Celery Beat periodic tasks:**

| Task | Schedule | Purpose |
|------|---------|---------|
| `detect_overdue_followups_telegram` | Every 30 min | Fire Tier 1/2/3 escalation alerts for overdue leads |
| `auto_dormant_leads` | Daily 9 AM | Move 60+ day silent leads to dormant |
| `sync_ga4_data` | Daily 2 AM | Pull GA4 metrics to local tables |
| `compute_dropout_risk` | Daily 6 AM | Update `enrollment.dropout_risk_score` for all active enrollments |
| `refresh_counselor_embeddings` | Daily 3 AM | Rebuild RAG embeddings for counselor matching |

**Instant ETA tasks:**
`fire_followup_tier_0_for_lead` — enqueued with `eta=followup_due_at` so Celery wakes at exactly the right moment for instant Tier 0 delivery.

---

## 9. AI/ML Features

| Feature | Model | Implementation |
|---------|-------|---------------|
| **Kai AI Mentor** | GPT-4o-mini | `app/ai/kai_agent.py` — RAG-augmented chat with 1536-dim similarity search |
| **Lead Scoring** | GPT-4o-mini + heuristics | `app/ai/lead_scoring.py` — 4-dimension score (engagement 35%, recency 25%, intent 25%, qualification 15%) |
| **Stage Recommendation** | 3-tier engine | Hard rules → heuristic → GPT-4o-mini adjudicator (only for low-confidence mid-funnel) |
| **AI Grading** | GPT-4o-mini | `app/ai/grading.py` — rubric-based with score + feedback + improved answer |
| **Mock Interview** | GPT-4o-mini | `app/ai/mock_interview.py` — track-aware question bank, behavioural/technical/gap types |
| **Resume Builder** | GPT-4o-mini | `app/ai/resume_builder.py` — ATS-optimised, versioned per target role |
| **Job Matching** | GPT-4o-mini + heuristics | `app/ai/job_matcher.py` — 100-point score: skills, track, experience, location |
| **Counselor Matching** | Cosine similarity | `app/ai/counselor_matching.py` — 1536-dim narrative embeddings vs lead profile |
| **NL Query** | GPT-4o | `app/ai/nl_query.py` — Natural language → SQL for BI dashboard |
| **Call Script Gen** | GPT-4o-mini | Hinglish script per lead stage for counselors |
| **Dropout Prediction** | GPT-4o-mini + engagement | Daily batch scoring stored on `enrollments.dropout_risk_score` |

**AI guardrails (enforced by convention, checked in PR review):**
1. All AI calls wrapped in `try/except` with graceful heuristic fallback
2. `is_ai_generated: bool` always in response schema
3. AI tasks > 2 seconds dispatched to `ai` Celery queue
4. Usage logged to `ai_usage_logs` (model, tokens, latency, endpoint)
5. Per-feature cost caps in `ai_usage_cap_policy` table (admin configurable)

---

## 10. External Integrations

| Service | Purpose | Wrapper |
|---------|---------|---------|
| **Razorpay** | Payment orders + EMI + webhook HMAC verification | `app/integrations/razorpay.py` |
| **Resend** | Transactional + bulk email | `app/integrations/resend.py` |
| **MSG91** | OTP + SMS notifications | `app/integrations/msg91.py` |
| **AiSensy / Meta** | WhatsApp Business API | `app/integrations/aisensy.py` |
| **Cloudflare R2** | Object storage (certs, resumes, avatars) | `app/integrations/r2.py` |
| **Telegram Bot API** | Follow-up escalation DMs | `app/integrations/telegram.py` |
| **Hubstaff** | Staff activity + integrity scoring | `app/integrations/hubstaff.py` |
| **JustNaukri** | Daily job feed pull | `app/integrations/justnaukri.py` |
| **Google Analytics 4** | Marketing BI metrics | `app/integrations/ga4.py` |
| **Google Search Console** | SEO keyword tracking | via GA4 integration |
| **OpenAI** | GPT + embeddings | `app/ai/` (multiple modules) |

---

## 11. File Storage

All user-uploaded files and generated documents are stored in **Cloudflare R2** (S3-compatible):

| File Type | Path Pattern | Notes |
|-----------|-------------|-------|
| Student avatars | `avatars/{user_id}.*` | Presigned upload from browser |
| Task submissions | `submissions/{student_id}/{task_id}/*` | File + PDF accepted |
| Certificates | `certificates/{cert_id}.pdf` | WeasyPrint server-side gen |
| Public portfolios | `portfolios/{student_id}/portfolio.pdf` | WeasyPrint |
| AI resumes | `resumes/{student_id}/{slug}.pdf` | WeasyPrint; public via `/r/{slug}.pdf` |
| WhatsApp media | `wa-media/{template_id}/*` | Template image/video uploads |

---

## 12. API Design Conventions

**Route format:** `/api/v1/{portal_or_domain}/{resource}`

**Authentication:** JWT Bearer on all endpoints except explicitly public ones (`/r/`, `/health`, public certificate verify, website/blog)

**Pagination:** All list endpoints returning potentially >100 items use `?page=1&page_size=20` with envelope `{items, total, page, page_size, pages}`

**Error format:** `{"detail": "Human-readable message"}` with HTTP status codes 400/401/403/404/409/422/500

**AI responses:** Always include `is_ai_generated: bool`

**Async tasks:** Return `{"task_id": "...", "status": "queued"}` for operations > 2 seconds

**Currency:** INR, `numeric(10,2)`, never `float`

**Timestamps:** UTC in DB, IST in frontend display, ISO-8601 in API

---

## 13. Observability & Health

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/health` | DB + Redis connectivity check |
| `GET /api/v1/system/health` | Extended: worker status, queue depths, service version |
| `GET /api/v1/ai/costs` | Admin — daily AI token spend by model + endpoint |
| `GET /api/v1/admin/anomaly-alerts` | BI anomaly detection — enrolment dips, fee gaps |
| Flower `:5555` | Celery worker + queue monitoring |
| Sentry DSN | Exception tracking + performance monitoring (optional) |

---

## 14. Key Files Quick Reference

| File | Purpose |
|------|---------|
| `backend/app/main.py` | FastAPI app entry point; all routers mounted here |
| `backend/app/core/config.py` | Canonical settings (Pydantic BaseSettings) — **always use this, not** `app/config.py` |
| `backend/app/core/security.py` | JWT auth, `get_current_user()`, RBAC, `ROLE_DEFAULT_PERMISSIONS` |
| `backend/app/core/database.py` | SQLAlchemy async engine + `get_db()` session dependency |
| `backend/app/tasks/celery_app.py` | Celery application object and queue definitions |
| `backend/migrations/versions/` | All 58 Alembic migration files in creation order |
| `frontend/src/app/routes.ts` | All frontend route definitions (single source of truth) |
| `frontend/src/app/lib/api.ts` | Typed HTTP client wrapping all 987 API endpoints |
| `frontend/vite.config.ts` | Dev server, `/api` + `/r` proxy config |
| `docker-compose.yml` | Full service orchestration (non-standard ports: PG→5436, Redis→6382) |
| `Makefile` | All dev/test/deploy shortcuts |
