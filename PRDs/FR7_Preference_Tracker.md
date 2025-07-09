# PRD – FR-7 Preference Tracker

## 1. Objective
Continuously learn from user selections & feedback to personalise routing, prompt style, and quiz generation.

## 2. Key Features
1. Event consumer reads selection & thumbs-up/down events.
2. Updates `UserProfile.model_weights` (Dirichlet) and `style_vectors`.
3. Feeds weights back to Intent Router & Prompt Engine.
4. Privacy-preserving: stores only hashed identifiers.

## 3. User Stories
* **U1** – My favourite model appears first more often over time.
* **U2** – The system automatically answers in my preferred tone.
* **U3** – Admin can query aggregated preferences.

## 4. System Design
### Components
| Component | Purpose |
|-----------|---------|
| Preference Worker | Celery task consuming Redis Stream |
| UserProfile Store | pgvector table storing embeddings |
| Feedback API | `/feedback` endpoint pushing events |

### Sequence
1. UI emits `{event_type, model_id, score}` to `/feedback`.
2. Worker updates user Dirichlet alpha counts.
3. Normalised weights cached in Redis.
4. Intent Router reads weights during decision.

### Data Model
```python
class UserProfile(BaseModel):
    id: UUID
    model_weights: Dict[str, float]
    style_vector: List[float]
    last_updated: datetime
```

## 5. KPIs
* Personalisation lift (click@1) ≥ +15 % after 4 sessions.
* Worker throughput ≥ 500 events/s.

## 6. Non-Functional
* Idempotent event handling (dedup by event_id).
* GDPR delete: drop profile on request.

## 7. Risks / Mitigations
| Risk | Mitigation |
|------|------------|
| Feedback sparsity | Back-off to global priors |
| Privacy concerns | Hash user_id; allow opt-out |

## 8. Future
* Federated learning mode for enterprise on-prem installs. 