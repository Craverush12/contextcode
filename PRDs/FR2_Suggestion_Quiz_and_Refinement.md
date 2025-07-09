# PRD – FR-2 Suggestion Quiz & Prompt Refinement

## 1. Objective
Offer guided, multi-choice questions to help the user further refine the enhanced prompt, producing a higher-quality *Refined Prompt*.

## 2. Key Features
1. Dynamic quiz generation via `ProtocolShell` template.
2. Multi-select answers (checkbox UI) – supports ≥ 1 correct choices.
3. RecursiveFieldControlLoop ingests answers and updates Neural Field.
4. Resonance re-scoring to produce Refined Prompt vN.
5. Traceability: maps each quiz answer to prompt diff.

## 3. User Stories
* **U1** – I click “Improve” and see 1-3 clarifying questions.
* **U2** – Selecting answers instantly updates the prompt preview.
* **U3** – Dev can POST `/suggestions` → quiz; POST `/refine` with selections.

## 4. System Design
### Components
| Component | Source | Purpose |
|-----------|--------|---------|
| Suggestion Service | new `suggestion_service.py` (wraps ProtocolShell) | Generates quiz JSON |
| Refinement Loop | `RecursiveFieldControlLoop` | Incorporates selections & reruns scoring |
| UI | React/Svelte checkbox modal | present quiz, live preview |

### Sequence
1. Gateway `/suggestions` (trace_id) → Suggestion Service.
2. Service looks at PromptTrace + UserProfile to craft `Quiz{question,options}`.
3. UI renders quiz.
4. `/refine` (trace_id, selections[]) → Refinement Loop.
5. Loop injects answers into Neural Field → generates new variants → scores.
6. Returns `refined_prompt`, `revision_id`.

### Data Models
```python
class QuizQuestion(BaseModel):
    id: UUID
    text: str
    options: List[str]
```

```python
class RefinementTrace(BaseModel):
    id: UUID
    trace_id: UUID  # parent PromptTrace
    selections: Dict[UUID, List[int]]  # qid -> chosen index list
    refined_prompt: str
    created_at: datetime
```

### API
* `POST /suggestions` → `[QuizQuestion]`
* `POST /refine` → `{refined_prompt, revision_id}`

## 5. KPIs
* ≥ 60 % of users use quiz at least once.
* Avg resonance score improvement ≥ 0.05.
* P95 round-trip latency ≤ 1.2 s.

## 6. Non-Functional
* Quiz generation capped at 3 questions to avoid UX fatigue.
* All prompts & quiz texts localised (i18n EN/zh).

## 7. Risks / Mitigations
| Risk | Mitigation |
|------|------------|
| Over-complex quizzes | UX research; dynamic limit by prompt size |
| User ignores quiz | Provide “Skip” and show benefit tooltip |

## 8. Future
* Personalised quiz templates based on historic selections.
* A/B test auto-apply “best guess” refinement without quiz. 