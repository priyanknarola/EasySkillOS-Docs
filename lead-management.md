---
layout: default
title: Lead Management & CRM
subtitle: Complete lead lifecycle, AI scoring, 4-tier escalation, and CRM API
permalink: /lead-management
---

EasySkillOS manages **12,375+ CRM leads** through a 10-stage pipeline with AI scoring, intelligent stage recommendations, and a 4-tier Telegram escalation system.

---

## Lead Stages

The pipeline has **10 stages** in order:

| Stage | Meaning | Terminal? |
|-------|---------|-----------|
| `new` | Just created — uncontacted | No |
| `contacted` | First call/WhatsApp logged | No |
| `interested` | Track interest confirmed | No |
| `visit_scheduled` | Branch visit booked | No |
| `center_visited` | Student physically visited | No |
| `demo_scheduled` | Demo session booked | No |
| `seat_reserved` | Strong intent, pending payment | No |
| `admission_done` | Enrolled — student created | **Yes** |
| `lost` | Soft-lost (resurface allowed) or hard-lost | **Yes** (hard) |
| `dormant` | 60+ days silent — auto-moved | Soft |

> **`LEAD_CLOSED_STATUSES`** constant: `{"admission_done", "lost", "dormant"}` — leads in these states are suppressed from all follow-up alerts.

---

## Lead Sources

Leads enter the system from 6 paths:

| Source | Mechanism | `source` field |
|--------|-----------|---------------|
| **Counselor manual** | `POST /api/v1/crm/leads` | `counselor` |
| **Branch walk-in** | `POST /api/v1/leads/branch-visit` (public) | `walkin` |
| **Meta Ads** | Webhook ingest from Facebook/Instagram | `meta` |
| **Referral** | Student referral link | `referral` |
| **Discover10x / Priya Bot** | Pre-qualified via AI bot | `discover10x` |
| **Odoo bulk import** | CSV import | `odoo` |

---

## Lead Key Fields

```python
class Lead(Base):
    id                      # UUID
    name                    # str
    phone                   # str (deduplicated)
    alternate_phone         # str (also deduplicated)
    email                   # str (optional)
    city                    # str
    track_interest          # str (course interest)
    status                  # 10-stage enum
    source                  # lead source enum
    assigned_counselor_id   # FK → users
    lead_partner_id         # FK → users (for escalation)
    followup_due_at         # datetime UTC — canonical follow-up time
    last_followup_alert_tier  # int (-1 = fresh, 0-3 = tier fired)
    last_followup_alert_at  # datetime
    ai_score                # float 0-100
    ai_temperature          # hot | warm | cold | frozen
    ai_recommended_stage    # str (pending counselor acceptance)
    lost_reason             # str (for terminal closes)
    enrolled_at             # datetime (set on admission_done)
    won_at                  # datetime
    meta_lead_id            # str (Meta Ads unique ID)
    utm_source / utm_medium # str (marketing attribution)
    is_deleted              # bool (soft delete — DPDP compliance)
```

---

## AI Scoring

Every lead is scored asynchronously by the `LeadScoringEngine` after each interaction:

### 4-Dimension Score (0-100)

| Dimension | Weight | What it measures |
|-----------|--------|-----------------|
| **Engagement** | 35% | Interaction frequency, recency, response quality |
| **Recency** | 25% | Days since last contact |
| **Intent** | 25% | Positive signals: demo attended, questions asked |
| **Qualification** | 15% | Budget signals, decision-maker status, education fit |

### Temperature Bands

| Temperature | Score Range | Last Contact | Action |
|------------|-------------|--------------|--------|
| 🔥 **HOT** | ≥ 70 | ≤ 3 days | Priority queue |
| 🌡️ **WARM** | ≥ 40 | ≤ 7 days | Regular follow-up |
| ❄️ **COLD** | ≥ 15 | any | Nurture sequence |
| 🧊 **FROZEN** | < 15 | > 30 days | Re-engagement campaign |

---

## Stage Recommendation Engine

The `StageRecommendationEngine` runs 3 tiers in sequence:

```
Tier 1 — Hard rules
  ├── If won_at or enrolled_at set → admission_done
  ├── If lost_reason is hard-lost pattern → lost
  └── If Odoo text contains CNR/DNP → contacted → dormant logic

Tier 2 — Heuristic signal scoring
  ├── Recency bucket: same-day / 1-3d / 4-7d / 8-14d / 14d+
  ├── Interaction type weights: visit > demo > call > WA > note
  ├── Positive/negative sentiment flags from interaction summary
  └── Composite score → stage candidate

Tier 3 — GPT-4o-mini adjudicator (optional)
  └── Only invoked for ambiguous mid-funnel leads when tier 2 score < 0.6 confidence
```

Recommendations are stored in `LeadStageRecommendationLog` and **not applied automatically** — a counselor or admin must accept/override.

---

## Follow-up System

`followup_due_at` is the canonical field. Every change to it:

1. Clears `last_followup_alert_tier` to `-1` (fresh slate)
2. An ORM `after_commit` event listener fires **immediately after the transaction commits**
3. A Celery ETA task `fire_followup_tier_0_for_lead` is enqueued with `eta=followup_due_at`
4. Celery wakes exactly at that time — **instant Tier 0 delivery**

### Setting a follow-up (6 supported paths)

| Endpoint | Description |
|----------|-------------|
| `POST /leads/:id/interactions` | Log interaction with follow-up scheduling |
| `POST /leads/:id/schedule-followup` | Explicit follow-up schedule |
| `PATCH /crm/calendar/events/:id` | Calendar rescheduling |
| `POST /crm/calendar/events` | New calendar event |
| `POST /portal/kai/escalate` | AI mentor escalation (auto-followup) |
| AI auto-rescheduler | `recommend_stage_single` post-interaction logic |

---

## Escalation Tiers

When a follow-up passes `followup_due_at` without rescheduling, escalating alerts fire:

| Tier | Trigger | Recipients | Channel |
|------|---------|-----------|---------|
| **0** | Instantly at `followup_due_at` | Assigned counselor | Telegram DM + In-app |
| **1** | `followup_due_at` + 4 hours | + `lead_partner_id` (deduped if same as counselor) | Telegram DM + In-app |
| **2** | `followup_due_at` + 24 hours | + Counselor's `User.manager_id` | Telegram DM + In-app |
| **3** | `followup_due_at` + 72 hours | + `settings.telegram_escalation_user_id` (admin) | Telegram DM + In-app |

**Suppression rules:**
- Closed leads (`admission_done`, `lost`, `dormant`) are suppressed entirely
- Counselor == lead_partner deduplicates to one message (not two)
- Reschedule via any of the 6 setter paths resets tier to `-1` and the cycle re-arms

**The 30-minute Beat task** `detect_overdue_followups_telegram` runs as a safety net (catches any leads the ETA task may have missed) and as the primary trigger for Tiers 1-3.

---

## AI Features in CRM

| Feature | Description | When it runs |
|---------|-------------|-------------|
| **Lead Scoring** | 4-dimension weighted score + temperature | After every interaction (Celery async) |
| **Stage Recommendation** | 3-tier engine → suggests next stage | After every interaction |
| **Duplicate Detection** | Cross-match phone + alternate_phone | On lead creation |
| **Call Script Generation** | GPT-4o-mini Hinglish script per lead stage | On-demand via counselor portal |
| **CRM Intelligence** | Churn risk, engagement gaps, contact frequency | Counselor Intelligence page |
| **Campaign Targeting** | AI-segmented lead lists for bulk outreach | Campaign builder |
| **Counselor Matching** | Skill/availability-based assignment | On new lead creation (Celery) |

---

## CRM API Endpoints

### Lead CRUD

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/crm/leads` | Paginated lead list (search, filters, status) |
| `POST` | `/api/v1/crm/leads` | Create manual lead |
| `GET` | `/api/v1/crm/leads/:id` | Lead detail with AI scores + interactions |
| `PATCH` | `/api/v1/crm/leads/:id` | Update stage, fields |
| `DELETE` | `/api/v1/crm/leads/:id` | Soft delete (DPDP compliance) |
| `GET` | `/api/v1/crm/leads/check-duplicate` | Pre-creation duplicate check |

### Interactions & Follow-ups

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/crm/leads/:id/interactions` | Log interaction + schedule follow-up |
| `POST` | `/api/v1/crm/leads/:id/schedule-followup` | Explicit follow-up scheduling |
| `POST` | `/api/v1/crm/leads/:id/quick-whatsapp` | Send WhatsApp template |
| `GET` | `/api/v1/crm/leads/:id/ai-score` | Fetch latest AI score |
| `POST` | `/api/v1/crm/leads/:id/stage-recommendation/request` | Request AI stage change |
| `POST` | `/api/v1/crm/leads/:id/stage-recommendation/:id/accept` | Accept recommendation |

### Enrollment

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/crm/enroll` | Convert lead → student (atomic) |
| `GET` | `/api/v1/crm/enrollment-options/:leadId` | Tracks + fee options |

### Dashboard & Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/crm/dashboard` | KPIs, funnel metrics, today tasks |
| `GET` | `/api/v1/crm/performance` | Counselor conversion stats |
| `GET` | `/api/v1/crm/intelligence` | Duplicate alerts, churn risks |
| `GET` | `/api/v1/crm/calendar/events` | Follow-up calendar |

---

## Enrollment Atomicity

`POST /api/v1/crm/enroll` creates all records **in a single database transaction**:

```python
async with db.begin():
    user    = User(role="student", phone=lead.phone, ...)
    profile = Profile(user_id=user.id, full_name=lead.name, ...)
    student = Student(user_id=user.id)
    enrollment = Enrollment(
        student_id=student.id,
        track_id=payload.track_id,
        status="active",
        plan_tier=payload.plan_tier,
    )
    fee_payment = FeePayment(enrollment_id=enrollment.id, ...)
    if payload.emi_plan:
        emi = EMIPlan(...)
        installments = [EMIInstallment(...) for i in range(count)]

    lead.status = "admission_done"
    lead.enrolled_at = utcnow()
```

If any step fails, the entire transaction rolls back — no orphan records.
