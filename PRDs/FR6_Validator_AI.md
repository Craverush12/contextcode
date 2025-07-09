# PRD – FR-6 Validator AI

## 1. Objective
Provide on-demand validation of any assistant reply for factual correctness, coherence, and safety, returning a structured `ValidationReport` and optional revised plan.

## 2. Key Features
1. Uses `ProtocolShellControlLoop` with configurable rubric weights.
2. Multi-model ensemble (fast + accurate) to reduce hallucination.
3. Highlights erroneous claims inline.
4. Option to switch conversation to Validator AI.

## 3. User Stories
* **U1** – I click “Validate” and get a checklist verdict within 5 s.
* **U2** – Validation highlights numbers that are likely wrong.
* **U3** – Dev POSTs `/validate` and receives JSON report.

## 4. System Design
### Components
| Component | Purpose |
|-----------|---------|
| Validator Service | Runs ProtocolShellControlLoop |
| Rubric Library | YAML rubrics stored per domain |
| Diff Highlighter | Marks mismatches in answer text |

### Sequence
1. `/validate` (session_id, turn_id) → Validator Service.
2. Service builds validation prompt (goal + context + answer).
3. Fast model (e.g., gpt-3.5) produces initial verdict.
4. Accurate model (gpt-4o) cross-checks; merge with majority vote.
5. Return `ValidationReport`.

### Data Model
```python
class ValidationReport(BaseModel):
    id: UUID
    turn_id: UUID
    verdict: str  # correct / partially_correct / incorrect
    issues: List[str]
    suggestions: List[str]
    revised_plan: Optional[str]
    created_at: datetime
```

### API
`POST /validate` → `ValidationReport`

## 5. KPIs
* ≥ 85 % alignment with human evaluator ground-truth.
* P95 latency ≤ 5 s.

## 6. Non-Functional
* Heavy models executed off critical path via Celery; stream partial verdict.
* Rate-limit 3 validations/min/user.

## 7. Risks / Mitigations
| Risk | Mitigation |
|------|------------|
| Validation disagrees with user | Provide override & feedback capture |
| High cost | Tiered model cascade; skip accurate model if confidence high |

## 8. Future
* Auto-apply minor fixes to original answer.
* Train a lightweight evaluator model to cut cost further. 