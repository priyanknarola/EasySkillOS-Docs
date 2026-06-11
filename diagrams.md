---
layout: default
title: Architecture Diagrams
subtitle: Interactive Mermaid diagrams — rendered live in the browser
permalink: /diagrams
---

All diagrams below render using [Mermaid.js](https://mermaid.js.org). Use the **☀️/🌙** toggle in the header to switch themes — diagrams re-render automatically.

---

## System Architecture

<div class="diagram-section">
<div class="diagram-title">High-Level System Architecture</div>

<div class="mermaid">
graph TD
    subgraph Users["17 Portal User Types"]
        U1[Admin]
        U2[Counselor]
        U3[Student]
        U4[Faculty]
        U5[Finance / HR / Placement]
        U9[Employer · Recruiter · Partner · Corporate · College · Alumni · Parent · Reviewer]
    end

    subgraph Frontend["Frontend — React 18 + TypeScript 5 + Vite"]
        FE[React App<br/>shadcn/ui · Tailwind CSS 3.4 · Radix UI<br/>Zustand · 17 Portal Pages]
    end

    subgraph Nginx["Nginx Reverse Proxy"]
        NG[SSL Termination · Static Assets<br/>proxy /api → FastAPI :8000<br/>proxy / → Vite :5173]
    end

    subgraph Backend["Backend — FastAPI Python 3.11"]
        MW[Middleware<br/>JWT Auth · RBAC · Rate Limit · CORS]
        API[API Layer<br/>987 Endpoints · 120 Route Modules<br/>/api/v1/portal/resource]
        SVC[Service Layer<br/>Business Logic · AI Orchestration<br/>Integration Wrappers]
    end

    subgraph DataStores["Data Stores"]
        PG[(PostgreSQL 16<br/>136 tables · asyncpg<br/>SQLAlchemy 2.0 · Alembic)]
        RD[(Redis 7<br/>Celery broker · OTP cache<br/>Rate limits · Sessions)]
        S3[(Cloudflare R2<br/>S3-compatible<br/>Uploads · Certs · Resumes)]
    end

    subgraph Celery["Async Processing"]
        CW[Celery Worker<br/>Queue: default · ai · notifications]
        CB[Celery Beat<br/>Follow-up alerts · Reports<br/>Cache refresh · Stale-lead detection]
        FL[Flower Monitor :5555]
    end

    subgraph External["External Services"]
        OAI[OpenAI<br/>GPT-4o-mini · GPT-4o]
        RZP[Razorpay<br/>Payments · EMI · Webhooks]
        MSG[MSG91<br/>SMS · OTP]
        AIS[AiSensy / Meta WhatsApp<br/>Business API]
        RES[Resend<br/>Email]
        TG[Telegram Bot<br/>Follow-up alerts]
        SNT[Sentry<br/>Error tracking]
    end

    Users --> FE
    FE --> NG
    NG --> Backend
    MW --> API --> SVC
    SVC --> PG & RD & S3 & CW
    CB --> CW
    CW --> OAI & RES & MSG & AIS & TG
    SVC --> RZP
    Backend --> SNT
</div>
</div>

---

## Module-Wise Backend

<div class="diagram-section">
<div class="diagram-title">Backend Module Architecture</div>

<div class="mermaid">
graph LR
    subgraph Auth["Auth Module"]
        A1[JWT / HS256<br/>Access + Refresh tokens]
        A2[OTP / Redis 10-min TTL]
        A3[RBAC Engine<br/>Role defaults · Permission catalog]
    end

    subgraph CRM["CRM Module"]
        C1[Lead Management<br/>12,375+ leads · 10 stages]
        C2[Stage Recommendation<br/>GPT-4o-mini → heuristic → static]
        C3[Lead Scoring<br/>4-dim: engagement · recency · intent · fit]
        C4[Follow-up Alerts<br/>4-tier Telegram escalation<br/>ORM after_commit listener]
        C5[Campaign Engine<br/>WhatsApp · SMS · Email · Bulk]
    end

    subgraph StudentPortal["Student Portal"]
        SP1[Dashboard XP · Streak]
        SP2[Kai AI Mentor<br/>RAG · task-scoped chat]
        SP3[Assessments · AI Grading]
        SP4[Portfolio · Resume Builder<br/>WeasyPrint PDF · /r/slug]
        SP5[Community Doubts · Buddies]
        SP6[Placement Hub · Mock Interviews]
    end

    subgraph Admin["Admin Module"]
        AD1[Student Tracker · Full Profile]
        AD2[AI Mentor Audit Viewer]
        AD3[Mock Interview Viewer]
        AD4[Achievements Config CRUD]
        AD5[BI Queries · Anomaly Detection]
        AD6[Support Ticket Queue]
    end

    subgraph Finance["Finance"]
        F1[Razorpay Orders · Verify · Webhook]
        F2[EMI Schedule · Installments]
        F3[Fee Plans · Invoices · Refunds]
    end

    subgraph AIEngine["AI Engine"]
        AI1[Task Grading — GPT-4o-mini]
        AI2[Stage Recommendation]
        AI3[Lead Scoring — 4-dim]
        AI4[Kai Chat — RAG context]
        AI5[Mock Interview — track Q-bank]
        AI6[Resume Builder — ATS coach]
        AI7[Usage Tracker — daily cap]
    end

    subgraph Integrations["Integrations"]
        I1[WhatsApp — Meta + AiSensy]
        I2[Resend Email]
        I3[MSG91 SMS / OTP]
        I4[Telegram Alerts]
        I5[Razorpay Checkout]
        I6[Cloudflare R2 Storage]
    end

    Auth --> DB1[(Core DB)]
    CRM --> DB2[(CRM DB)] & AIEngine & Integrations
    StudentPortal --> DB3[(Student DB)] & AIEngine
    Admin --> DB1 & DB2 & DB3
    Finance --> DB4[(Finance DB)] & Integrations
    AIEngine --> DB3
    Integrations --> Cache[(Redis Cache)]
</div>
</div>

---

## Student Portal Flow

<div class="diagram-section">
<div class="diagram-title">Student User Journey</div>

<div class="mermaid">
flowchart TD
    A(["/login<br/>LoginPage"]):::start --> B(["/portal/dashboard<br/>DashboardPage"]):::dashboard

    B --> C(["/portal/my-tracks<br/>MyTracksPage"]):::learning
    C --> C1(["/portal/track<br/>TrackViewPage"]):::learning
    C1 --> C2(["/portal/module/:id<br/>ModulePlayer"]):::learning
    C2 --> C4(["/portal/tasks/:taskId<br/>TaskWorkspace · Submit"]):::learning
    C4 --> C5(["/portal/assessments/:id<br/>Live Exam"]):::learning
    C5 --> C7(["/portal/grading-history"]):::learning

    B --> D(["/portal/mentor<br/>AI Mentor Kai"]):::ai
    D --> D1(["/portal/kai<br/>Full-screen Kai Chat"]):::ai
    D --> D2(["Task AI Help<br/>inline per task"]):::ai

    B --> E(["/portal/portfolio<br/>PortfolioPage"]):::profile
    E --> E1(["/portfolio/:id<br/>Public Portfolio"]):::profile
    E --> E2(["/portal/resume<br/>AI Resume Builder"]):::profile
    E2 --> E3(["/r/:slug<br/>Public Resume Link"]):::profile

    B --> F(["/portal/placements<br/>PlacementHub"]):::placement
    F --> F1(["Browse Jobs"]):::placement
    F --> F2(["Mock Interview<br/>GPT-4o-mini scored"]):::placement
    F --> F3(["/portal/my-applications"]):::placement

    B --> G(["/portal/community<br/>Community"]):::community
    G --> G1(["Doubts Forum<br/>vote · answer · solve"]):::community
    G --> G2(["Study Buddy Matching"]):::community

    B --> H(["/portal/achievements"]):::gamify
    H --> H1(["/portal/leaderboard"]):::gamify

    B --> I(["/portal/payments<br/>Payments + EMI"]):::finance
    B --> J(["/portal/settings"]):::settings
    B --> K(["/portal/support<br/>Help & Support"]):::support
    B --> M(["/portal/certificates"]):::profile
    M --> M1(["/verify/:certId<br/>Public Verify"]):::profile

    classDef start fill:#4F46E5,stroke:#3730A3,color:#fff
    classDef dashboard fill:#7C3AED,stroke:#6D28D9,color:#fff
    classDef learning fill:#059669,stroke:#047857,color:#fff
    classDef ai fill:#7C3AED,stroke:#6D28D9,color:#fff
    classDef profile fill:#0891B2,stroke:#0E7490,color:#fff
    classDef placement fill:#D97706,stroke:#B45309,color:#fff
    classDef community fill:#16A34A,stroke:#15803D,color:#fff
    classDef gamify fill:#F59E0B,stroke:#D97706,color:#0F172A
    classDef finance fill:#DC2626,stroke:#B91C1C,color:#fff
    classDef settings fill:#475569,stroke:#334155,color:#fff
    classDef support fill:#0F172A,stroke:#1E293B,color:#fff
</div>
</div>

---

## Admin Panel Flow

<div class="diagram-section">
<div class="diagram-title">Admin Operations Flow</div>

<div class="mermaid">
flowchart TD
    A(["/login<br/>AdminLogin"]):::start --> B(["/admin/dashboard<br/>KPIs · Revenue · Lead Funnel"]):::dashboard

    B --> C(["/admin/students<br/>StudentTracker"]):::students
    C --> C1(["/admin/students/:id<br/>Full Profile · 6 tabs"]):::students
    C1 --> C2(["AI Mentor tab<br/>conversation audit"]):::ai
    C1 --> C3(["Mock Interviews tab"]):::ai
    C --> C6(["/admin/ai-mentor<br/>Cross-student search"]):::ai
    C --> C7(["/admin/mock-interviews"]):::ai
    C --> C8(["/admin/student-leaderboard"]):::students

    B --> D(["/admin/leads<br/>CRM Lead View"]):::crm
    D --> D2(["/admin/leads/:id/enroll<br/>→ Student Created"]):::crm
    D --> D6(["/admin/whatsapp<br/>Broadcast"]):::crm
    D --> D7(["/admin/campaigns"]):::crm

    B --> E(["/admin/cms/tracks<br/>Course Tracks"]):::cms
    E --> E1(["AI Track Generator<br/>3-stage: shell → resources → lessons"]):::cms
    E1 --> E2(["Module Builder"]):::cms
    E --> E5(["/admin/achievements-config<br/>Badge · Level · XP"]):::cms

    B --> F(["/admin/revenue"]):::finance
    F --> F1(["/admin/refunds"]):::finance

    B --> G(["/admin/staff"]):::hr
    G --> G2(["/admin/support-tickets<br/>Threaded queue"]):::hr

    B --> H(["/admin/ask-anything<br/>NL BI Query"]):::bi
    H --> H2(["/admin/anomalies"]):::bi
    H --> H3(["/admin/cohort-analysis"]):::bi

    B --> I(["/admin/system/health"]):::system
    I --> I2(["/admin/system/feature-flags"]):::system
    I --> I5(["/admin/ai-credits-policy"]):::ai
    I --> I6(["/admin/audit"]):::system

    classDef start fill:#4F46E5,stroke:#3730A3,color:#fff
    classDef dashboard fill:#7C3AED,stroke:#6D28D9,color:#fff
    classDef students fill:#059669,stroke:#047857,color:#fff
    classDef crm fill:#D97706,stroke:#B45309,color:#fff
    classDef cms fill:#0891B2,stroke:#0E7490,color:#fff
    classDef finance fill:#DC2626,stroke:#B91C1C,color:#fff
    classDef hr fill:#475569,stroke:#334155,color:#fff
    classDef bi fill:#7C3AED,stroke:#6D28D9,color:#fff
    classDef system fill:#0F172A,stroke:#1E293B,color:#fff
    classDef ai fill:#7C3AED,stroke:#6D28D9,color:#fff
</div>
</div>

---

## Counselor CRM Flow

<div class="diagram-section">
<div class="diagram-title">Counselor Daily Workflow</div>

<div class="mermaid">
flowchart TD
    A(["/login"]):::start --> B(["/counselor/dashboard<br/>KPIs · Escalations · Today Tasks"]):::dashboard

    B --> B2(["/counselor/priya-escalations<br/>Discover10x pre-qualified leads"]):::ai
    B --> C(["/counselor/queue<br/>HOT → WARM → COLD priority"]):::queue

    C --> D(["/counselor/leads/:id<br/>Lead Profile"]):::lead
    D --> D0(["AI Score 0-100<br/>Temperature · Sentiment"]):::ai
    D --> D3(["Stage Recommendation<br/>StageRecommendationEngine"]):::ai

    D --> E(["POST /leads/:id/interactions<br/>Log: call · WA · visit · demo"]):::action
    E --> E1(["Celery: score_single_lead<br/>async AI re-score"]):::ai
    E --> E2(["recommend_stage_single<br/>AI stage candidate"]):::ai

    D --> F(["POST /leads/:id/schedule-followup"]):::action
    F --> F1(["ORM after_commit listener<br/>Celery ETA task at followup_due_at"]):::alert
    F1 --> FA(["Tier 0 · at due time<br/>counselor Telegram DM"]):::alert
    FA --> FB(["Tier 1 · +4h<br/>+ lead partner"]):::alert
    FB --> FC(["Tier 2 · +24h<br/>+ manager"]):::alert
    FC --> FD(["Tier 3 · +72h<br/>+ admin"]):::alert

    D --> I(["/counselor/enroll/:leadId"]):::enroll
    I --> I2(["POST /crm/enroll<br/>User + Student + Enrollment created"]):::enroll
    I2 --> I3(["Lead → admission_done<br/>Student portal activated"]):::enroll

    classDef start fill:#4F46E5,stroke:#3730A3,color:#fff
    classDef dashboard fill:#7C3AED,stroke:#6D28D9,color:#fff
    classDef queue fill:#D97706,stroke:#B45309,color:#fff
    classDef lead fill:#0891B2,stroke:#0E7490,color:#fff
    classDef ai fill:#7C3AED,stroke:#6D28D9,color:#fff
    classDef action fill:#059669,stroke:#047857,color:#fff
    classDef alert fill:#E11D48,stroke:#BE123C,color:#fff
    classDef enroll fill:#059669,stroke:#047857,color:#fff
</div>
</div>

---

## Lead Lifecycle State Machine

<div class="diagram-section">
<div class="diagram-title">Lead Stage Transitions</div>

<div class="mermaid">
stateDiagram-v2
    [*] --> new : Lead created<br/>(Meta Ad · walk-in · referral · Priya · counselor · Odoo)

    new --> contacted : First call / WhatsApp logged
    new --> dormant : 60+ days no touch
    new --> lost : DND · wrong number · explicit reject

    contacted --> interested : Positive response confirmed
    contacted --> new : No answer — re-queue
    contacted --> lost : Hard-lost refusal
    contacted --> dormant : Extended silence

    interested --> visit_scheduled : Branch visit scheduled
    interested --> demo_scheduled : Demo scheduled
    interested --> lost : Budget blocker
    interested --> dormant : Gone quiet

    visit_scheduled --> center_visited : Student arrives
    visit_scheduled --> interested : Visit cancelled — reschedule

    center_visited --> demo_scheduled : Demo follow-up
    center_visited --> seat_reserved : Strong buying signal
    center_visited --> lost : Decided not to join

    demo_scheduled --> center_visited : Demo done at branch
    demo_scheduled --> seat_reserved : Post-demo commit
    demo_scheduled --> lost : No interest after demo

    seat_reserved --> admission_done : POST /crm/enroll ONLY valid path
    seat_reserved --> interested : Payment fell through
    seat_reserved --> lost : Final dropout

    admission_done --> [*] : TERMINAL — student portal activated

    lost --> contacted : Soft-lost resurfaces on inbound
    lost --> [*] : TERMINAL hard-lost — blocks AI re-engagement

    dormant --> contacted : Inbound contact or counselor re-activates
    dormant --> lost : Admin explicit close
</div>
</div>

---

## API Request Flow

<div class="diagram-section">
<div class="diagram-title">Authenticated API Request Sequence</div>

<div class="mermaid">
sequenceDiagram
    autonumber
    actor U as User
    participant FE as React 18
    participant API as FastAPI
    participant JWT as JWT Middleware
    participant RH as Route Handler
    participant RD as Redis 7
    participant DB as PostgreSQL 16
    participant CL as Celery 5
    participant AI as OpenAI GPT-4o-mini

    U->>FE: User action
    FE->>API: HTTP POST /api/v1/… + Authorization: Bearer JWT

    API->>JWT: Forward request
    JWT->>JWT: Decode & verify JWT (HS256, exp check)

    alt Token invalid
        JWT-->>API: 401 Unauthorized
        API-->>FE: 401
    else Token valid
        JWT->>RH: current_user {sub, role, permissions}
    end

    RH->>RD: GET cache:key
    alt Cache HIT
        RD-->>RH: Cached data
    else Cache MISS
        RH->>DB: SQLAlchemy SELECT / INSERT
        DB-->>RH: ORM result
        RH->>RD: SET cache:key EX TTL
    end

    opt Task > 2s (email · AI report · grading)
        RH->>CL: task.delay(payload) — fire-and-forget
        CL-->>RH: task_id (202 Accepted)
    end

    opt AI feature
        RH->>AI: GPT-4o-mini request (try/except + log_ai_usage)
        AI-->>RH: JSON response
        Note right of RH: is_ai_generated: true
    end

    RH-->>API: Pydantic response
    API-->>FE: 200 OK JSON
    FE-->>U: Render updated UI
</div>
</div>

---

## Enrollment Sequence

<div class="diagram-section">
<div class="diagram-title">Lead-to-Student Enrollment Flow</div>

<div class="mermaid">
sequenceDiagram
    autonumber
    actor CSL as Counselor
    participant CRM as CRM API
    participant DB as PostgreSQL 16
    participant RZP as Razorpay
    actor STU as Student
    participant CEL as Celery Workers
    participant RSN as Resend Email
    participant SMS as MSG91 SMS
    participant WA as AiSensy WhatsApp

    Note over CSL,DB: Lead → CRM Pipeline
    CSL->>CRM: POST /leads {name, phone, track_interest}
    CRM->>DB: INSERT Lead (status=new, score=40)
    CRM-->>CSL: 201 lead_id

    CSL->>CRM: PATCH /leads/:id {status: contacted…demo_scheduled}
    Note over CRM,DB: Stage progression via counselor interactions

    CSL->>CRM: POST /enrollments {lead_id, track_id, fee_inr}
    CRM->>DB: INSERT Enrollment (pending_payment)
    CRM->>RZP: POST /orders {amount_paise, INR}
    RZP-->>CRM: order_id + key_id
    CRM-->>STU: Razorpay checkout

    STU->>RZP: Pay (card / UPI / netbanking)
    RZP-->>STU: payment_id + signature
    STU->>CRM: POST /payments/verify {order_id, payment_id, signature}
    CRM->>CRM: HMAC-SHA256 verify
    CRM->>DB: UPDATE Payment (captured)
    CRM->>DB: INSERT User + Student (temp_password)
    CRM->>DB: UPDATE Lead (admission_done)
    CRM-->>STU: 201 {student_id, temp_password}

    Note over CRM,WA: Async welcome notifications
    CRM->>CEL: send_welcome_notifications.delay(student_id)
    CEL->>RSN: Welcome email
    CEL->>SMS: Welcome SMS
    CEL->>WA: WhatsApp welcome template

    STU->>CRM: POST /auth/login {phone, temp_password}
    CRM-->>STU: access_token + student portal active
</div>
</div>

---

## End-to-End Business Process

<div class="diagram-section">
<div class="diagram-title">Inquiry → Certification → Placement</div>

<div class="mermaid">
flowchart LR
  classDef phase fill:#4F46E5,color:#fff,stroke:none,font-weight:700
  classDef step fill:#1E293B,color:#F1F5F9,stroke:#334155
  classDef ai fill:#7C3AED,color:#fff,stroke:none
  classDef decision fill:#F59E0B,color:#1E1B4B,stroke:#D97706
  classDef success fill:#059669,color:#fff,stroke:none
  classDef alert fill:#E11D48,color:#fff,stroke:none

  subgraph P1["① Lead Acquisition"]
    WF["Website Form"] & WI["Walk-in"] & REF["Referral"] & META["Meta Ads"] & BOT["Discover10x Bot"]
  end

  subgraph P2["② Counseling"]
    FU["Schedule Follow-up"] --> INT["Log Interaction"]
    INT --> STAGE["AI Stage Rec"]
    STAGE --> DEMO["Demo"]
    DEMO --> HOT{"Lead HOT?"}
  end

  subgraph ESC["Overdue Escalation"]
    T0["T0 instant"] --> T1["T1 +4h"] --> T2["T2 +24h"] --> T3["T3 +72h"]
  end

  subgraph P3["③ Enrollment"]
    ADM["Admission"] --> PLAN["Payment Plan"]
    PLAN --> PAY["Razorpay"]
    PAY --> ENROLL["Student Created"]
  end

  subgraph P4["④ Learning"]
    AIPATH["AI Learning Path"] --> MOD["Modules + Lessons"]
    MOD --> KAI["Kai AI Mentor"]
    MOD --> ASSESS["Task Submissions"]
    ASSESS --> GRADE["AI Grading"]
    GRADE --> XP["XP + Badges"]
  end

  subgraph P5["⑤ Certification"]
    CERT["Certificate PDF<br/>WeasyPrint"]
    PORT["Public Portfolio"]
  end

  subgraph P6["⑥ Placement"]
    RES["AI Resume Builder"] --> MATCH["Job Matching AI"]
    MATCH --> APPLY["Apply"]
    APPLY --> MOCK["Mock Interview"]
    MOCK --> OFFER{"Offer?"}
    OFFER -->|Yes| PLACED["Placed → Alumni"]
    OFFER -->|No| MATCH
  end

  P1 --> FU
  FU -.->|overdue| T0
  HOT -->|Yes| ADM
  HOT -->|No| FU
  ENROLL --> AIPATH
  XP --> CERT --> PORT --> RES

  class P1,P2,P3,P4,P5,P6 phase
  class AIPATH,STAGE,KAI,GRADE,MATCH,MOCK ai
  class HOT,OFFER decision
  class PLACED success
  class T0,T1,T2,T3 alert
</div>
</div>

---

## Course Management Lifecycle

<div class="diagram-section">
<div class="diagram-title">Content Authoring → Student Completion</div>

<div class="mermaid">
flowchart TD
  subgraph ADMIN["Admin: Content Authoring"]
    ATRACK["Create Track"] --> AMOD["Add Modules"]
    AMOD --> ALES["Add Lessons"]
    ALES --> AASSESS["Create Assessments + Rubrics"]
    AASSESS --> APUB{"Publish?"}
    APUB -->|Yes| LIVE["Track LIVE"]
    APUB -->|No| ATRACK
  end

  subgraph LEARN["Student: Learning"]
    DASH["Dashboard Progress"] --> LESSON["Open Lesson"]
    LESSON --> KAI2["Kai AI Mentor<br/>RAG context"]
    LESSON --> TASK["Submit Task"]
  end

  subgraph GRADE_FLOW["AI Grading Pipeline"]
    RELEVANT{"Relevancy check"}
    AIGRADE["GPT-4o-mini<br/>score A-F + feedback"]
    FALLBACK["Heuristic fallback<br/>word-count rule"]
    PASS{"Score ≥ pass threshold?"}
    RETRY["Student notified · retry"]
  end

  subgraph ACHIEVE["Gamification"]
    XPR["XP Awarded<br/>xp_rule formula"] --> BADGE["Badge check"]
    BADGE --> BOARD["Leaderboard updated"]
  end

  subgraph COMPLETE["Completion"]
    ALLMOD{"All modules done?"}
    CERTGEN["Certificate generated<br/>WeasyPrint PDF"]
    PUBPORT["Public Portfolio updated"]
  end

  LIVE --> DASH
  TASK --> RELEVANT
  RELEVANT -->|relevant| AIGRADE
  AIGRADE -->|offline| FALLBACK
  AIGRADE --> PASS
  FALLBACK --> PASS
  PASS -->|Yes| XPR --> BOARD --> ALLMOD
  PASS -->|No| RETRY --> TASK
  ALLMOD -->|Yes| CERTGEN --> PUBPORT
  ALLMOD -->|No| LESSON
</div>
</div>
