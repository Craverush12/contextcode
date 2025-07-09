# PRD – FR-10 GDPR-Compliant Data Lifecycle

## 1. Objective
Ensure all user data (prompts, responses, embeddings) are stored, processed, and deleted in compliance with GDPR and similar regulations.

## 2. Key Features
1. Data classification tags (personal, sensitive, anonymous).
2. Retention policy: raw LLM text ≤ 30 days; embeddings ≤ 1 year.
3. User Right-to-Erasure: `/delete_account` deletes all traces.
4. Region-aware storage (EU vs. US).
5. Audit logging of data access.

## 3. User Stories
* **U1** – I can delete my data and get confirmation.
* **DPO1** – I can export data processing records for regulators.

## 4. System Design
### Components
| Component | Purpose |
|-----------|---------|
| Data Retention Scheduler | nightly job to purge expired rows |
| Erasure Handler | Cascading delete across tables & vector store |
| Region Router | Chooses EU or US Postgres cluster |
| Audit Log | Immutable append-only table |

### Sequence (Erasure)
1. User hits `/delete_account`.
2. Handler soft-deletes user, queues erase job.
3. Job cascades: PG rows, Redis keys, Vector embeddings.
4. Writes entry to Audit Log.

### Data Classification Table
| Table | Class | Retention |
|-------|-------|-----------|
| prompts | personal | 30 d |
| responses | personal | 30 d |
| embeddings | anonymous | 365 d |
| metrics | anonymous | 5 y |

## 5. KPIs
* Erasure request completed < 24 h.
* Zero critical findings in annual GDPR audit.

## 6. Non-Functional
* Data encrypted at rest (AES-256) and in transit (TLS1.3).
* Access via IAM roles; no shared DB users.

## 7. Risks / Mitigations
| Risk | Mitigation |
|------|------------|
| Orphaned data in backups | Implement backup retention ≤ primary |
| Cross-region data leak | Separate clusters + strict network ACLs |

## 8. Future
* Differential privacy on aggregated metrics.
* Automated data-mapping tool for new tables. 