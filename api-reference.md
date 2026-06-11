---
layout: default
title: API Reference
subtitle: 987 endpoints across 120 route modules — auth, pagination, error codes, and RBAC
permalink: /api-reference
---

## Overview

| | |
|---|---|
| **Base URL** | `/api/v1/` |
| **Authentication** | JWT Bearer (HS256) |
| **Total endpoints** | **987** (620 in `api/v1/` + 367 in `app/routers/`) |
| **Route modules** | **120** (66 in `api/v1/` + 54 in `app/routers/`) |

---

## Authentication

### JWT Bearer Token

All endpoints require a JWT Bearer token unless explicitly marked public.

```
Authorization: Bearer <access_token>
```

**Token claims:**

| Claim | Type | Description |
|-------|------|-------------|
| `sub` | string | User ID (UUID) |
| `role` | string | User role (`super_admin`, `admin`, `counselor`, `student`, …) |
| `permissions` | list[string] | Scoped RBAC permissions (`mock_interviews.view`, etc.) |
| `exp` | int | Unix timestamp expiry |
| `iat` | int | Unix timestamp issued-at |

### Token Lifecycle

```
1. POST /api/v1/auth/login
   → access_token (short-lived) + refresh_token (long-lived)

2. Protected requests
   → Authorization: Bearer <access_token>

3. On 401 → POST /api/v1/auth/refresh
   → new access_token without re-login

4. Logout → POST /api/v1/auth/logout
   → invalidates refresh_token in Redis
```

### Public Endpoints (no auth required)

- `GET /r/{slug}` — Public resume viewer
- `GET /api/v1/health` — System health check
- `GET /api/v1/public/certificate/verify/{cert_id}` — Certificate verification
- `POST /api/v1/leads/branch-visit` — Walk-in lead capture
- Website/blog content endpoints

---

## Common Patterns

### Pagination

All list endpoints returning potentially > 100 items use server-side pagination:

```
GET /api/v1/crm/leads?page=1&page_size=50
```

| Parameter | Type | Default | Max |
|-----------|------|---------|-----|
| `page` | int | 1 | — |
| `page_size` | int | 20 | 100 |

Response envelope:

```json
{
  "items": [...],
  "total": 1243,
  "page": 1,
  "page_size": 20,
  "pages": 63
}
```

### Error Responses

```json
{ "detail": "Human-readable error message" }
```

| Code | Meaning |
|------|---------|
| 400 | Bad Request — validation or business rule violation |
| 401 | Unauthorized — missing or invalid JWT |
| 403 | Forbidden — valid JWT but insufficient role/permission |
| 404 | Not Found — resource doesn't exist or not owned by caller |
| 409 | Conflict — unique constraint violation (e.g. duplicate slug) |
| 422 | Unprocessable Entity — Pydantic schema validation failure |
| 500 | Internal Server Error — logged + alerted via Sentry |

### AI Responses

Every endpoint returning AI-generated content includes the `is_ai_generated` flag:

```json
{
  "content": "...",
  "is_ai_generated": true
}
```

Both `true` and `false` must be handled — fallbacks fire when OpenAI is unavailable.

### Async Task Responses

Operations > 2 seconds are dispatched to Celery and return immediately:

```json
{
  "task_id": "abc123",
  "status": "queued"
}
```

Celery queues: `default` (general), `ai` (OpenAI calls), `notifications` (email/SMS/WA)

### Currency & Timestamps

- All monetary values: **INR (₹)**, stored as `numeric(10,2)` — never `float`
- All timestamps: **UTC** in DB / API; frontend converts to IST (Asia/Kolkata)
- API date format: ISO-8601 strings

---

## API Modules — `app/api/v1/`

| Module | Portal / Domain | Endpoints |
|--------|----------------|-----------|
| `admin.py` | Admin | 30 |
| `admin_extended.py` | Admin (extended ops) | 99 |
| `admin_dashboard.py` | Admin | 10 |
| `admin_leads.py` | Admin — Lead viewer | 9 |
| `admin_staff.py` | Admin — Staff management | 13 |
| `admin_ai_mentor.py` | Admin — Kai audit viewer | 2 |
| `admin_mock_interviews.py` | Admin — Interview audit | 2 |
| `admin_ai_usage.py` | Admin — AI usage | 3 |
| `admin_ai_caps.py` | Admin — AI credit policies | 4 |
| `admin_cms_resources.py` | Admin — CMS resources | 6 |
| `admin_api_keys.py` | Admin — API keys | 4 |
| `admin_centres.py` | Admin — Centre config | 2 |
| `auth.py` | All portals — Auth | 14 |
| `auth_2fa.py` | All portals — 2FA/TOTP | 5 |
| `crm_leads.py` | Counselor CRM — Leads | 19 |
| `crm_dashboard.py` | Counselor CRM — Dashboard | 8 |
| `crm_campaigns.py` | Counselor CRM — Campaigns | 15 |
| `crm_chat.py` | Counselor CRM — Chat | 12 |
| `crm_calendar.py` | Counselor CRM — Calendar | 5 |
| `crm_performance.py` | Counselor CRM — Performance | 6 |
| `crm_intelligence.py` | Counselor CRM — AI Insights | 6 |
| `crm_enrollment.py` | Counselor CRM — Enrollment | 3 |
| `leads.py` | Public / External leads | 20 |
| `portal.py` | Student Portal (main) | 80 |
| `kai.py` | Student Portal — AI Mentor | 14 |
| `student_portfolio.py` | Student — Portfolio / Resume | 20 |
| `student_dashboard.py` | Student — Dashboard | 3 |
| `student_analytics.py` | Student — Analytics | 5 |
| `student_assignments.py` | Student — Assignments | 4 |
| `student_certificate.py` | Student — Certificates | 4 |
| `student_onboarding.py` | Student — Onboarding | 3 |
| `learning_path.py` | Student — Learning path | 7 |
| `payments.py` | Student / Finance — Payments | 14 |
| `tracks.py` | Content — Track browsing | 3 |
| `content.py` | Content — CMS | 11 |
| `track_management.py` | Admin — Track / module CRUD | 19 |
| `grading.py` | Faculty — Grading | 5 |
| `notifications.py` | All portals — Notifications | 4 |
| `employer.py` | Employer portal | 17 |
| `alumni.py` + `alumni_portal.py` | Alumni portal | 9 |
| `parent_portal.py` | Parent portal | 2 |
| `college.py` | College portal | 5 |
| `corporate.py` | Corporate portal | 6 |
| `recruiter.py` | Recruiter portal | 4 |
| `reviewer.py` | Reviewer portal | 6 |
| `partner.py` | Partner portal | 8 |
| `counselor_matching.py` | CRM — Counselor matching | 9 |
| `features.py` | Feature flags (public) | 10 |
| `ai_command.py` | AI command bar | 4 |
| `ai_costs.py` | Admin — AI cost reporting | 10 |
| `integrations_ingest.py` | Integrations (webhook ingest) | 4 |
| `integrations_odoo.py` | Integrations (Odoo) | 2 |
| `public_resume.py` | Public — Resume viewer | 2 |
| `telegram_linking.py` | All portals — Telegram | 3 |
| `settings_public.py` | Public — App settings | 1 |
| `system_config.py` | System Config portal | 4 |
| `uploads.py` | File uploads | 3 |
| `audit.py` + `audit_logs.py` | Admin — Audit | 4 |
| `health.py` | System health | 3 |
| `ws_whatsapp.py` | WebSocket — WhatsApp | 1 |
| `whatsapp_templates.py` | Admin — WhatsApp templates | 9 |
| **api/v1/ Subtotal** | | **620** |

---

## API Modules — `app/routers/`

| Module | Portal / Domain | Endpoints |
|--------|----------------|-----------|
| `assessment_management.py` | Faculty — Assessment admin | 20 |
| `student_assessments.py` | Student — Assessments | 7 |
| `assessment_analytics.py` | Faculty / Admin — Analytics | 3 |
| `faculty_content.py` | Faculty — Content management | 12 |
| `faculty_batches.py` | Faculty — Batch management | 6 |
| `faculty_communication.py` | Faculty — Communication | 8 |
| `faculty_analytics.py` | Faculty — Analytics | 5 |
| `faculty_review.py` | Faculty — Content review | 6 |
| `hr_dashboard.py` | HR — Dashboard | 4 |
| `hr_integrity.py` | HR — Hubstaff integrity | 8 |
| `hr_policies.py` | HR — Policies | 4 |
| `leave_management.py` | HR — Leave | 8 |
| `payroll.py` | HR — Payroll | 7 |
| `performance.py` | HR — Performance reviews | 8 |
| `attendance.py` | HR / Faculty — Attendance | 6 |
| `batch_admin.py` | Admin — Batch admin | 5 |
| `batch_attendance.py` | Faculty — Batch attendance | 4 |
| `staff_profiles.py` | Admin — Staff profiles | 6 |
| `finance_dashboard.py` | Finance — Dashboard | 6 |
| `fee_collection.py` | Finance — Fee collection | 4 |
| `emi_management.py` | Finance — EMI plans | 6 |
| `invoices.py` | Finance — Invoices | 7 |
| `refunds.py` | Finance — Refunds | 6 |
| `revenue.py` | Finance — Revenue | 2 |
| `scholarships.py` | Finance — Scholarships | 7 |
| `discount_codes.py` | Finance — Discount codes | 5 |
| `razorpay_webhooks.py` | Payments — Razorpay webhook | 1 |
| `placement_dashboard.py` | Placement — Dashboard | 5 |
| `placement_outcomes.py` | Placement — Outcomes | 9 |
| `placement_students.py` | Placement — Student listing | 4 |
| `job_matching.py` | Placement — Job matching AI | 4 |
| `interview_prep.py` | Placement — Interview prep | 8 |
| `recruitment.py` | HR — Recruitment | 11 |
| `employer_portal.py` | Employer portal | 11 |
| `employer_admin.py` | Admin — Employer admin | 7 |
| `student_applications.py` | Student — Job applications | 4 |
| `nl_query.py` | Reports — NL Query | 6 |
| `anomaly_reports.py` | Reports — Anomaly detection | 7 |
| `cohort_reports.py` | Reports — Cohort analysis | 4 |
| `marketing_reports.py` | Reports — Marketing BI | 10 |
| `scheduled_reports.py` | Reports — Scheduled reports | 9 |
| `business_config.py` | System — Business config | 15 |
| `feature_flags.py` | System — Feature flags | 10 |
| `system_health.py` | System — Health monitoring | 9 |
| `security.py` | System — Security | 13 |
| `integration_manager.py` | System — Integration config | 9 |
| `skill_audit.py` | Student — Skill audit | 5 |
| `onboarding.py` | Student — Onboarding flows | 4 |
| `parent_portal.py` | Parent portal (extended) | 9 |
| `integrity.py` | HR / Faculty — Integrity | 4 |
| `meta_whatsapp_webhook.py` | Integrations — Meta webhook | 8 |
| `seo.py` | Public — SEO endpoints | 2 |
| `website.py` | Public — Website content | 9 |
| **routers/ Subtotal** | | **367** |

**Grand total: 987 endpoints across 120 route modules**

---

## RBAC — Role-Based Access Control

Roles (highest → lowest privilege):

```
super_admin → admin → counselor → faculty → student → parent → employer → partner
```

### Default Role Permissions

Permissions follow `<resource>.<action>`. Key entries:

| Permission | Roles with default access |
|-----------|--------------------------|
| `mock_interviews.view` | admin, super_admin, counselor |
| `ai_mentor_logs.view` | admin, super_admin, counselor |
| `support_tickets.manage` | admin, super_admin, counselor |
| `student_leaderboard.view` | admin, super_admin |
| `leads.*` | admin, super_admin, counselor |
| `students.*` | admin, super_admin |
| `finance.*` | admin, super_admin, finance |
| `hr.*` | admin, super_admin, hr |

### RBAC Enforcement

```python
# app/core/security.py — FastAPI dependency injected into routes
async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    ...
    # Returns decoded JWT claims including role + permissions
    # Raises HTTPException(401) if invalid/expired
    # Routes check current_user["role"] or current_user["permissions"]
```

Admins can grant additional permissions per user via the System Config portal (`/admin/system-config/users/{id}/permissions`).

---

## Key Endpoint Groups

### Authentication (`/api/v1/auth/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/login` | Login — returns access + refresh token |
| `POST` | `/auth/refresh` | Refresh access token |
| `POST` | `/auth/logout` | Invalidate refresh token |
| `POST` | `/auth/request-otp` | Request SMS OTP |
| `POST` | `/auth/verify-otp` | Verify OTP + login |
| `POST` | `/auth/change-password` | Change password (first-login flow) |

### CRM Leads (`/api/v1/crm/leads/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/crm/leads` | Paginated list — filters: status, source, counselor, score |
| `POST` | `/crm/leads` | Create manual lead |
| `GET` | `/crm/leads/:id` | Detail with AI scores + interaction history |
| `PATCH` | `/crm/leads/:id` | Update stage, assignment, fields |
| `DELETE` | `/crm/leads/:id` | Soft delete (DPDP compliance) |
| `POST` | `/crm/leads/:id/interactions` | Log call/WA/visit + schedule follow-up |
| `POST` | `/crm/leads/:id/schedule-followup` | Set `followup_due_at` directly |
| `POST` | `/crm/enroll` | Convert lead → student (atomic transaction) |

### Student Portal (`/api/v1/portal/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/portal/dashboard` | XP, streak, enrolled tracks, KPIs |
| `GET` | `/portal/my-tracks` | All enrollments with progress |
| `GET` | `/portal/achievements` | Badges, XP sources, level progress |
| `GET` | `/portal/leaderboard` | Weekly/monthly/all-time XP leaderboard |
| `GET` | `/portal/placements` | Placement hub data (readiness, counselor, jobs) |
| `GET` | `/portal/community` | Feed posts, online counts |
| `POST` | `/portal/doubts` | Create a doubt/question post |
| `POST` | `/portal/doubts/:id/vote` | Up/down vote with toggle |
| `POST` | `/portal/study-buddies/opt-in` | Join study buddy pool |
| `GET` | `/portal/study-buddies` | Top 10 matched buddies (weighted score) |

### AI Mentor Kai (`/api/v1/kai/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/portal/kai/chat` | Send message + get AI response |
| `GET` | `/portal/kai/conversations` | List conversation history |
| `POST` | `/portal/kai/escalate` | Escalate chat to human support |

### Payments (`/api/v1/payments/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/payments/summary` | Enrollment plan tier + fee totals |
| `GET` | `/payments/emi-schedule` | List EMI installments |
| `POST` | `/payments/create-order` | Create Razorpay order |
| `POST` | `/payments/verify` | Verify Razorpay payment + update status |
| `POST` | `/payments/upgrade-request` | Request plan upgrade |

### Admin (`/api/v1/admin/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/admin/dashboard` | Platform KPIs, recent enrolments |
| `GET` | `/admin/students` | Paginated student tracker (all filters) |
| `GET` | `/admin/students/:id` | Full student profile (used by detail page) |
| `GET` | `/admin/ai-mentor/conversations` | All student-Kai conversations |
| `GET` | `/admin/mock-interviews` | All mock interview sittings |
| `GET` | `/admin/student-leaderboard` | Admin view of leaderboard |
| `GET` | `/admin/achievements-config/badges` | Badge catalog CRUD |
| `GET` | `/admin/achievements-config/levels` | Level ladder config |

---

## Integration Endpoints

### Razorpay Webhooks

```
POST /routers/razorpay/webhook
```

HMAC-SHA256 signature verified from `X-Razorpay-Signature` header before processing. Handles `payment.captured`, `payment.failed`, `order.paid`.

### Meta / WhatsApp Webhook

```
POST /routers/meta/whatsapp/webhook
GET  /routers/meta/whatsapp/webhook   (challenge verification)
```

Handles incoming messages, template approval/rejection events, delivery receipts.

### Telegram Linking

```
POST /api/v1/telegram/link   (verify deep-link token from /start command)
GET  /api/v1/telegram/status
```

Used by counselors/admins to link their Telegram account for DM escalation alerts.
