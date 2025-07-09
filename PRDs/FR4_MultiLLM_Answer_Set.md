# PRD – FR-4 Multi-LLM Answer Set

## 1. Objective
Display responses from multiple selected LLMs side-by-side with metadata so the user can choose the best answer.

## 2. Key Features
1. Parallel execution via Celery; streaming support for fast first token.
2. Response envelope includes model_id, latency, cost_estimate, resonance.
3. Front-end grid view sortable by quality or cost.
4. Persist raw completions for validator/offline analysis.

## 3. User Stories
* **U1** – I see 3 answers, each labelled with model + time.
* **U2** – I can sort by “Cheapest” or “Highest Score.”
* **U3** – Dev calls `/execute` and gets JSON array of LLMResponse.

## 4. System Design
### Components
| Component | Purpose |
|-----------|---------|
| Multi-LLM Executor | Spawns async tasks, aggregates responses |
| ResponseFormatter | Adds cost/latency/resonance fields |
| Front-End Panel | React Table with sorting & expandable code blocks |

### Sequence
1. Router passes `(prompt, model_ids)` to Executor via Redis queue.
2. Worker pool calls vendor APIs in parallel, streams tokens.
3. After all complete (or timeout), ResponseFormatter computes metrics.
4. Gateway returns `[LLMResponseEnvelope]` to UI.

### Data Model
```python
class LLMResponseEnvelope(BaseModel):
    id: UUID
    model_id: str
    answer: str
    latency_ms: int
    cost_cents: float
    resonance: float
    created_at: datetime
```

### API
`POST /execute` → `[LLMResponseEnvelope]`

## 5. KPIs
* P95 executor overhead ≤ 250 ms (plus vendor latency).
* ≥ 99 % of executions return ≥ 2 answers.
* Streaming start < 800 ms for first token.

## 6. Non-Functional
* Vendor error isolation: failure of one model doesn’t fail the set.
* Timeout configurable per model SLA.

## 7. Risks / Mitigations
| Risk | Mitigation |
|------|------------|
| Vendor rate limits | Concurrency caps + exponential back-off |
| Large answers blow UI | Truncate w/ expandable accordion |

## 8. Future
* Real-time diffing to highlight answer deltas.
* Auto-collapse similar answers to save screen space. 