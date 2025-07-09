# Implementation Roadmap & Team Allocation

This document aggregates prioritisation, sprint cadence, and parallel-work guidance across all Functional Requirements (FRs).

---
## 0. Pre-Work  (Sprint-0)
| Task ID | Description | Dependencies |
|---------|-------------|--------------|
| **T0_INFRA** | Repo hygiene, `pyproject.toml`, Docker-compose (Postgres + Redis), CI pipeline | — |

All further work requires Sprint-0 completed.

---
## 1. Sprint-1  – Core Services (parallel)
| Task ID | FR | Description |
|---------|----|-------------|
| **T1_PE** | FR-1 | Prompt Enhancement Service |
| **T2_ROUTER** | FR-3 | Intent Router (classifier + registry) |
| **T3_EXEC** | FR-4 | Multi-LLM Executor (Celery) |
| **T4_AUTH** | FR-9 | Auth & Rate Limiting |
| **T5_TELEM** | FR-8 | Telemetry baseline (OTel + Prom) |
| **T10_DATA** | FR-10 | GDPR Data-lifecycle plumbing |

These six tracks can run *simultaneously* after infra is ready.

---
## 2. Sprint-2 – Conversation & UX
| Task ID | FR | Description | Depends on |
|---------|----|-------------|------------|
| **T6_CM** | FR-5 | Conversation Manager (session + neural field) | T1, T2, T3 |
| **T7_QUIZ** | FR-2 | Suggestion Quiz + Refinement Loop | T1 |

T6 and T7 can progress in parallel by separate sub-teams.

---
## 3. Sprint-3 – Quality & Personalisation
| Task ID | FR | Description | Depends on |
|---------|----|-------------|------------|
| **T8_VALID** | FR-6 | Validator AI Service | T3, T6 |
| **T9_PREF** | FR-7 | Preference Tracker Worker | T3, T6 |

---
## Squads & Ownership
| Squad | Primary Tasks |
|-------|--------------|
| Core LLM Services | T1, T2, T3, T6 |
| Platform & Security | T4, T10 |
| DevOps & Quality | T5, T8, T9 |

---
## Milestone Checkpoints
1. **MVP Alpha** – End of Sprint-1 (PE + Router + Executor + Auth running).<br/>
2. **Beta** – End of Sprint-2 (Full conversation loop + quiz).<br/>
3. **GA** – End of Sprint-3 (Validator, preference learning, dashboards).

---
## Parallelisation Rationale
* **T1/T2/T3** are independent micro-services communicating via APIs – no sequencing needed.
* Auth, Telemetry, and Data-lifecycle touch shared infra but not core LLM logic.
* Conversation Manager requires core services, hence Sprint-2.
* Quality features (Validator, Preferences) depend on active conversation loop, making them ideal for Sprint-3.

---
### Legend
* *FR-x* refers to PRD documents in `PRDs/` directory.
* Task IDs correspond to TODO list (`todo.json`).

Keep this file updated as tasks move **in_progress** → **completed**. 