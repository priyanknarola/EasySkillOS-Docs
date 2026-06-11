---
layout: default
title: Database Schema
subtitle: 136 tables, 14 domains, 200 FK relationships — PostgreSQL 16 with SQLAlchemy 2.0
permalink: /database
---

## Overview

| Metric | Value |
|--------|-------|
| Total tables | 136 |
| Domains | 14 |
| FK relationships | 200+ |
| Migration files | 58 (Alembic) |
| Primary key type | UUID (`varchar 36`) |
| Timestamps | All UTC (`timestamptz`) — displayed in IST |

The database backs a multi-portal career academy serving 400+ students, 12,375+ CRM leads, and 6–8 counselors across 3 centres (Adajan, Vesu, Bhestan) plus online delivery.

### Engine Details

```
Database:    PostgreSQL 16
ORM:         SQLAlchemy 2.0 (async via asyncpg)
Migrations:  Alembic — backend/migrations/versions/
Host port:   5436 (non-standard — avoids conflicts with local PG)
Pool:        SQLAlchemy async default; asyncpg driver
```

---

## Auth & Users

**8 tables:** `users`, `profiles`, `user_backup_codes`, `api_keys`, `audit_logs`, `active_sessions`, `security_events`, `erasure_requests`

| Table | Purpose |
|-------|---------|
| `users` | Central identity; `phone` is the login credential (unique, not null) |
| `profiles` | 1-to-1 extension of `users` — full name, avatar, telegram_chat_id, linkedin |
| `active_sessions` | Live JWT sessions via `jwt_jti` for blacklist checks |
| `user_backup_codes` | 2FA recovery codes (bcrypt-hashed); invalidated per `batch_id` |
| `api_keys` | Only `key_hash` stored (bcrypt) — plaintext never persisted |
| `security_events` | Login failures, anomalies, IP changes |
| `erasure_requests` | DPDP Act 2023 right-to-erasure workflow |

**Key constraints:**
- `users.phone` — unique, not null (login credential)
- `users.role` — drives RBAC across all 17 portals
- `users.manager_id` — self-reference for counselor hierarchy
- `profiles.telegram_chat_id` — unique; enables per-counselor Telegram DM alerts
- `users.is_deleted` — soft delete for compliance

---

## CRM & Leads

**15 tables:** `leads`, `lead_interactions`, `lead_ai_scores`, `lead_stage_recommendations_log`, `lead_attachments`, `counselor_profiles`, `counselor_match_logs`, `campaigns`, `campaign_steps`, `campaign_executions`, `campaign_step_results`, `chat_messages`, `ai_conversations`, `counselor_tasks`, `prompt_versions`

| Table | Purpose |
|-------|---------|
| `leads` | CRM core — 12,375+ prospects with 10-stage pipeline |
| `lead_interactions` | Every call, WhatsApp, visit touchpoint per lead |
| `lead_ai_scores` | Score history (multiple records per lead over time) |
| `lead_stage_recommendations_log` | AI stage suggestions with accept/override decisions |
| `counselor_profiles` | CRM metrics + 1536-dim RAG narrative embedding |
| `counselor_match_logs` | AI counselor assignment decisions |
| `campaigns` | Multi-channel drip automation definitions |
| `campaign_steps` + `_executions` + `_results` | Drip step state machines |
| `ai_conversations` | 1-to-1 with `leads` — WhatsApp AI conversation state |

**Key constraints:**
- `leads.phone` — unique (dedup key)
- `leads.meta_lead_id` — unique (prevents duplicate Meta Ads imports)
- `leads.followup_due_at` + `last_followup_alert_tier` — drive 4-tier Telegram escalation
- Closed statuses `{admission_done, lost, dormant}` suppress all follow-up alerts
- `counselor_profiles.narrative_embedding` — 1536-dim float array for cosine similarity

---

## Learning & Content

**12 tables:** `tracks`, `modules`, `sub_modules`, `milestones`, `tasks`, `enrollments`, `progress_records`, `sub_module_progress`, `earned_milestones`, `resources`, `certificates`, `grades`

| Table | Purpose |
|-------|---------|
| `tracks` | Course catalog; **slug PK** e.g. `meta-ads` (not UUID) |
| `modules` | Curriculum chapter within a track |
| `sub_modules` | Lesson within a module |
| `tasks` | Practical assignment; accepts file/text submissions |
| `enrollments` | Student-track binding; links user + track + batch + payment |
| `progress_records` | Module-level progress per enrollment |
| `sub_module_progress` | Lesson-level progress + quiz scores |
| `certificates` | Issued on enrollment completion; `certificate_number` unique |

**Key constraints:**
- `tracks.id` — slug string PK (e.g. `meta-ads`), referenced across many tables
- `certificates.certificate_id` — canonical cert identifier for public `/verify/{cert_id}`
- `enrollments.freeze_count` — supports streak-freeze feature
- `milestones` — 1-to-1 with `modules` (badge awarded on completion)

---

## Students

**10 tables:** `students`, `learner_profile_deep`, `student_learning_paths`, `student_notes`, `achievements`, `badge_catalog`, `level_config`, `xp_rule`, `referral_commissions`, `audit_responses`

| Table | Purpose |
|-------|---------|
| `students` | 1-to-1 extension of `users` for student-specific profile |
| `learner_profile_deep` | AI onboarding deep data (goals, learning style, etc.) |
| `achievements` | Earned badges per user; references `badge_catalog.slug` |
| `badge_catalog` | Admin-editable badge definitions (PR #81 — no more hardcoded arrays) |
| `level_config` | Admin-editable 10-level XP ladder |
| `xp_rule` | Admin-editable 6 XP source buckets with formula types |
| `audit_responses` | Career audit answers + AI track recommendations |

**Key constraints:**
- `badge_catalog.slug` — PK (referenced by `achievements.badge_id`)
- `level_config.level` — PK (integer 1–10)
- `xp_rule.source_key` — PK (`tasks`, `quiz`, `community`, `streak`, `attendance`, `badges`)

---

## Assessment

**7 tables:** `assessments`, `questions`, `question_bank`, `submissions`, `answers`, `ai_grading_results`, `grade_disputes`

| Table | Purpose |
|-------|---------|
| `assessments` | Quiz or exam; linked to module or track |
| `question_bank` | Reusable question pool scoped to track + optional module |
| `submissions` | Student task or assessment submission |
| `answers` | Per-question answer within a submission |
| `ai_grading_results` | GPT-4o-mini grade per answer (1-to-1 with `answers`) |
| `grade_disputes` | Student challenges to AI scores |

**Key constraints:**
- `ai_grading_results.answer_id` — unique (one AI grade per answer)
- `grades.submission_id` — unique (one overall grade per submission)
- Grading modes: `ai_primary`, `human_primary`, `hybrid`
- `submissions.attempt_number` tracked; `assessments.max_attempts` enforced

---

## Finance

**12 tables:** `payments`, `fee_payments`, `emi_plans`, `emi_installments`, `invoices`, `coupons`, `scholarship_schemes`, `scholarship_applications`, `scholarships`, `refunds`, `revenue_forecasts`, `document_sequences`

| Table | Purpose |
|-------|---------|
| `payments` | Razorpay transaction records (any item type) |
| `fee_payments` | Structured per-enrollment fee payments |
| `emi_plans` + `emi_installments` | EMI schedules; installments track per-due-date status |
| `invoices` | Generated per enrollment; `invoice_number` unique |
| `scholarship_schemes` + `_applications` | Scholarship pools + AI-scored applications |
| `refunds` | Multi-step approval workflow per enrollment |
| `document_sequences` | Per-centre per-year sequential numbering (INV/REC/EMI) |

**Key constraints:**
- All monetary amounts: `numeric(10,2)` — never `float`
- `payments.currency` — defaults to `"INR"`
- `fee_payments.razorpay_payment_id` — unique (idempotent webhook handling)

---

## Placement

**13 tables:** `employers`, `job_listings`, `job_applications`, `job_matches`, `generated_resumes`, `student_portfolios`, `employer_interactions`, `mock_interview_sessions`, `interview_prep_plans`, `placement_outcomes`, `success_stories`, `justnaukri_sync`, `jobs`

| Table | Purpose |
|-------|---------|
| `employers` | Hiring companies; optional portal login via `user_id` |
| `job_listings` | Open positions posted by employers |
| `job_applications` | Student applications; optional `resume_id` FK |
| `generated_resumes` | AI-generated versioned resumes; versioned per `(student_id, target_role)` up to 10 |
| `mock_interview_sessions` | Grouped by `sitting_id` — one start-to-finish attempt |
| `placement_outcomes` | Verified job placements |

**Key constraints:**
- `generated_resumes` — UNIQUE on `(student_id, target_role, version)`; partial index on `is_public IS TRUE`
- `job_applications.resume_id` — SET NULL on `generated_resumes` delete
- `mock_interview_sessions.prep_plan_id` — nullable (portal sessions have no prep plan)
- `jobs` table is legacy — `job_listings` is canonical

---

## Community

**7 tables:** `community_posts`, `community_replies`, `community_post_votes`, `study_buddy_opt_ins`, `study_groups`, `support_tickets`, `support_ticket_messages`

| Table | Purpose |
|-------|---------|
| `community_posts` | Student forum doubts/questions |
| `community_replies` | Answers; `is_accepted` flag marks chosen answer |
| `community_post_votes` | Up/down toggle voting; `vote_count` cached on post |
| `study_buddy_opt_ins` | 1-to-1 with users — study matching pool |
| `support_tickets` | Help desk tickets |
| `support_ticket_messages` | Threaded staff-student conversation per ticket |

**Key constraints:**
- `community_post_votes` — UNIQUE on `(post_id, user_id)`
- `study_buddy_opt_ins.user_id` — unique (one opt-in per user)
- `support_ticket_messages.ticket_id` — CASCADE deletes messages with ticket

---

## AI & Config

**15 tables:** `kai_conversations`, `kai_attachments`, `knowledge_chunks`, `ai_usage_cap_policy`, `feature_flags`, `ai_model_configs`, `ai_system_prompts`, `nl_query_logs`, `saved_queries`, `centre_configs`, `pricing_tiers`, `global_settings`, `brand_configs`, `system_announcements`, `platform_settings`

| Table | Purpose |
|-------|---------|
| `kai_conversations` | Student-AI chat turns; `task_id` scopes task-help chats |
| `knowledge_chunks` | RAG vector store; 1536-dim embeddings |
| `feature_flags` | Per-centre/role feature toggles with cost tracking |
| `ai_model_configs` | Per-feature model/temperature/token overrides |
| `ai_system_prompts` | Versioned prompt text with test I/O pairs |
| `global_settings` + `brand_configs` | Singleton tables (always `id=1`) |
| `centre_configs` | Per-centre operating hours, pricing, QR attendance |

**Key constraints:**
- `feature_flags.name` — unique
- `knowledge_chunks.embedding` — JSON in dev (SQLite); pgvector in prod
- `centre_configs.name` — unique (`adajan|vesu|bhestan`)

---

## Key Tables Quick Reference

| Table | Domain | PK | Purpose |
|-------|--------|----|---------|
| `users` | Auth | UUID | Central identity — all portals authenticate here |
| `profiles` | Auth | UUID | Extended profile, Telegram, portfolio slug |
| `leads` | CRM | UUID | 12,375+ prospect records with AI scoring |
| `lead_interactions` | CRM | UUID | Every call, WA, visit touchpoint |
| `tracks` | Learning | **slug** | Course catalog — PK is human-readable slug |
| `enrollments` | Learning | UUID | Core student-course binding |
| `students` | Students | UUID | Student-specific profile data |
| `achievements` | Students | UUID | Earned badges + XP |
| `submissions` | Assessment | UUID | Task and assessment submissions |
| `ai_grading_results` | Assessment | UUID | GPT-4o-mini grading with rubric |
| `payments` | Finance | UUID | Razorpay transaction records |
| `fee_payments` | Finance | UUID | Structured enrollment fee payments |
| `emi_installments` | Finance | UUID | Individual EMI due dates and statuses |
| `employers` | Placement | UUID | Hiring companies |
| `job_applications` | Placement | UUID | Student job applications |
| `generated_resumes` | Placement | UUID | AI-generated versioned resumes |
| `mock_interview_sessions` | Placement | UUID | AI mock interview Q&A with GPT feedback |
| `community_posts` | Community | UUID | Student forum doubts |
| `support_tickets` | Community | UUID | Help desk tickets |
| `notifications` | Communication | UUID | In-app SSE notifications |
| `kai_conversations` | AI & Config | UUID | Student-Kai message history |
| `knowledge_chunks` | AI & Config | UUID | RAG vector store content |
| `feature_flags` | AI & Config | UUID | Per-centre/role feature toggles |
| `batches` | Batches | UUID | Class batches at centres |
| `session_attendance` | Batches | UUID | Per-session attendance records |
| `staff` | HR | UUID | Staff HR records |
| `leave_requests` | HR | UUID | Leave approval workflow |
| `parent_student_links` | Parent | UUID | Parent-student relationship with consent |

---

## Design Decisions

### UUID Primary Keys
All tables use `varchar(36)` UUIDs generated in Python (`uuid4()`). Exception: `tracks.id` uses human-readable slug strings (e.g. `meta-ads`).

### Soft Deletes
`users.is_deleted` and `leads.is_deleted` implement soft delete for DPDP Act 2023 compliance. Hard deletes only via the `erasure_requests` workflow.

### JSON Columns
Extensively used for flexible data (`permissions`, `tags`, `tools`, `ai_curriculum`, `schedule`, `filters`). PostgreSQL JSONB in production for indexability.

### Numeric Precision
All monetary amounts use `numeric(10,2)` — never `float` — to avoid floating-point rounding in financial calculations.

### Embedding Storage
`knowledge_chunks.embedding` and `counselor_profiles.narrative_embedding` store 1536-dim float arrays. In development (SQLite): JSON arrays. In production (PostgreSQL): intended for pgvector `vector(1536)` with cosine-similarity search.

### Singleton Tables
`global_settings` and `brand_configs` always have `id=1`. Application code enforces this. Used for platform-wide configuration that changes infrequently.

---

## Migration History (Notable Milestones)

| Migration | What it added |
|-----------|-------------|
| Initial schema | `users`, `profiles`, `leads`, `tracks`, `enrollments`, `payments` |
| CRM expansion | `campaigns`, `chat_messages`, `ai_conversations`, `counselor_profiles` |
| Assessment | `assessments`, `questions`, `submissions`, `answers`, `ai_grading_results` |
| Finance | `emi_plans`, `emi_installments`, `invoices`, `scholarships`, `refunds` |
| Placement | `employers`, `job_listings`, `job_applications`, `mock_interview_sessions` |
| Community | `community_posts`, `community_replies`, votes, `study_buddy_opt_ins`, `support_ticket_messages` |
| AI config | `feature_flags`, `ai_model_configs`, `ai_system_prompts`, `ai_usage_cap_policy` |
| Achievements | `badge_catalog`, `level_config`, `xp_rule` (PR #81 — replaces hardcoded constants) |
| Resume Builder | `generated_resumes`, `job_applications.resume_id` FK |
| Follow-up alerts | `leads.last_followup_alert_at` + `last_followup_alert_tier` (PR #132) |
| Mock interview grouping | `mock_interview_sessions.sitting_id` backfill migration |
| WhatsApp templates | `whatsapp_templates`, `whatsapp_template_events` |
| Security | `active_sessions`, `security_events`, `user_backup_codes`, `erasure_requests`, `api_keys` |

---

## Download Full Schema

The complete DBML schema (136 tables, 200 FK relationships) is available as a downloadable file:

[Download database-schema.dbml](./assets/database-schema.dbml)

Import into [dbdiagram.io](https://dbdiagram.io) for an interactive ER diagram.
