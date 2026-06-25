# Product Context

Business context, domain concepts, and product rules for Prescribe v2. This is the canonical reference for *what* the product does and *who* it serves — consult [`ARCHITECTURE.md`](ARCHITECTURE.md) for *how* the system is built.

## Vision

Prescribe v2 is a **prescription management application** with an AI-powered doctor assistant layer. At its core, it gives patients a single place to store and manage their complete medical history — past prescriptions, lab tests, diagnostic reports, and other health documents. Doctors and patients connect through a relationship model (similar to adding friends on a social platform), and once linked, doctors gain access to the patient's medical history. An AI layer sits on top of these documents, available **exclusively to doctors**, enabling them to quickly query, summarize, and reason over a patient's health records through natural-language chat. Patients do not have access to the AI assistant.

> **Educational prototype.** This is not a certified medical device. It does not provide real medical advice. All patient data is synthetic. Production deployment would require security review, compliance work (HIPAA, etc.), and clinical validation.

## Core product pillars

1. **Medical history hub** — Patients consolidate all their health documents (prescriptions, lab results, imaging reports, clinical notes) in one place, creating a portable personal health record.
2. **Doctor–patient connections** — Doctors and patients establish relationships by sending and accepting connection requests, much like a social network. A connection grants the doctor access to the patient's medical history.
3. **Prescription management** — Connected doctors can view a patient's full history and write new prescriptions grounded in that context.
4. **AI assistant (doctor-only)** — The conversational AI layer is accessible only to doctors and can query a connected patient's medical history. Patients may receive bounded, source-grounded automation attached to their own uploads (for example, the lab-report analyzer), but cannot use the clinician chat assistant.
5. **Transparent shared notes** — Doctors publish reviewed encounter notes and after-visit summaries that patients can read and flag for factual correction.

## User roles

| Role | Summary | Key capabilities |
|------|---------|-----------------|
| **Patient** | End-user with health records | Manage their medical history (upload documents, store prescriptions and test results), review bounded analysis of their own lab uploads, connect with doctors, view their own records |
| **Doctor** | Clinician who connects with patients | Send/accept connection requests, view linked patients' medical history, write prescriptions, chat with AI assistant about a patient's records |
| **Admin** | System administrator | Manage users, roles, system configuration |

Roles are mutually exclusive per account. A single `users` collection stores all roles with role-specific data in nested fields.

## Domain concepts

| Term | Definition |
|------|-----------|
| **Medical history** | The collection of a patient's health information — demographics, conditions, medications, allergies, family history, lifestyle — stored on each patient's `patient_profile` in MongoDB, together with uploaded attachments in the `documents` collection |
| **Doctor–patient connection** | A mutual relationship between a doctor and a patient, initiated by either party via a connection request. Once accepted, the doctor can access the patient's medical history. Similar to a friend request on a social platform |
| **Connection request** | A pending invitation from a doctor to a patient (or vice versa) to establish a doctor–patient connection |
| **Prescription** | A doctor-created medication order for a connected patient, stored as part of the patient's medical history |
| **Document upload** | Patient-submitted files (PDFs, images) representing medical tests, reports, or other health records, added to their medical history |
| **Lab report analysis** | A read-only, source-grounded summary attached to a patient-owned lab upload. It groups report metrics by the report's own flags/ranges, exposes uncertainty, and is not a diagnosis or profile update. |
| **Chat session** | A conversation between a **doctor** and the AI, scoped to a single connected patient's medical history. Persisted in MongoDB (`chat_sessions` + `chat_messages`). Patients cannot initiate chat sessions |
| **Shared clinical note** | A doctor-authored encounter note or after-visit summary explicitly published to a connected patient; AI may draft text but cannot publish it |
| **Correction request** | A patient-authored, auditable request for the note author to review a specific factual issue |

## Business rules

1. **Medical history ownership** — Each patient owns their medical history. Documents are stored per-patient and only accessible through established connections.
2. **Connection-based access** — Doctors can only view a patient's medical history and write prescriptions after the patient has accepted their connection request (or vice versa). Enforced at the service layer.
3. **Mutual connections** — Either party (doctor or patient) can initiate a connection request. The other party must accept before access is granted.
4. **Prescription authority** — Only doctors may create prescriptions, and only for patients they are connected to.
5. **Conversational AI is doctor-only** — Only doctors can access the clinician AI assistant. Every clinician chat session is tied to exactly one connected patient, and the agent retrieves records only for that patient. Patient-facing upload automation is limited to the patient's own documents, remains read-only, shows uncertainty/source evidence, and never becomes a diagnosis or treatment recommendation.
6. **AI grounding** — The AI must base responses on actual patient record content. The system prompt instructs it to not fabricate medical data.
7. **Admin access** — Admins manage users and system configuration but do not participate in clinical workflows or connections.
8. **Data safety** — All seeded patient records in MongoDB are synthetic and educational. Never treat them as real PHI.
9. **Clinical authorship** — AI-generated note text is an editable suggestion only. A connected doctor must review and explicitly publish it, and only the author may revise it or resolve its correction requests.
10. **Patient transparency** — Patients can read notes published to them and may keep one correction request open per note. A correction request never edits clinical content automatically.

## Build sequence

The product is built role-by-role, with authentication applied last:

1. **Phase A (done)** — Data models and MongoDB schema
2. **Phase B** — Full patient experience (medical history management, document uploads)
3. **Phase C** — Doctor–patient connections and doctor experience (connection requests, patient history access, prescriptions, AI chat)
4. **Phase D** — Full admin experience (user/role management)
5. **Phase E** — Authentication, JWT, route protection

Detailed phasing is in [`plans/PLAN_PRODUCT_BUILD_ORDER.md`](plans/PLAN_PRODUCT_BUILD_ORDER.md).

## Current scope vs. future

| In scope now | Out of scope / future |
|-------------|----------------------|
| Doctor-only AI chat (single patient) | Multi-patient queries, patient-facing AI |
| Markdown-based patient records | FHIR or HL7 integration |
| File-based document context | Full vector search / RAG pipeline |
| Dev-mode identity (patient/doctor picker) | OAuth, SSO, password reset |
| Doctor–patient connection model | Connection notifications, real-time updates |
| Synthetic data only | Real PHI handling, HIPAA compliance |
| Docker Compose local deployment | Cloud deployment, CI/CD |

## Constraints

- **No real medical advice.** Disclaimers must be visible to users.
- **No real PHI.** The system is designed for synthetic/educational data only.
- **Single LLM provider at a time.** Configured via `LLM_PROVIDER` env var (Google Gemini or OpenAI).
- **No offline mode.** Requires network access to the LLM provider.
