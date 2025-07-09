# PRD – FR-1 Prompt Enhancement Engine

## 1. Objective
Convert raw user input into an optimised *Enhanced Prompt* that maximises downstream LLM performance while preserving user intent.

## 2. Key Features
1. Multi-variant generation using ControlLoop + NeuralField.
2. Resonance-based scoring (FieldResonanceMeasurer) selecting top variant.
3. Configurable style presets (formal, concise, creative).
4. Token-budget guard: prunes prompt to keep <2 K tokens.

## 3. User Stories
* **U1** – As a user I paste a question and instantly get a refined prompt.
* **U2** – As a developer I can POST `/prompt` with JSON and receive the enhanced prompt + trace id.

## 4. System Design (Web)
### Components
| Component | In Repo Source | Purpose |
|-----------|---------------|---------|
| Prompt Enhancement Service (PE) | `20_templates/control_loop.py` | Orchestrates variant generation & scoring |
| Neural Field Context Manager | same | Maintains contextual field |
| Resonance Scorer | `20_templates/field_resonance_measure.py` | Quant scoring of variants |

### Sequence
1. Gateway API → PE `/prompt` (raw_text, user_id, session_id).
2. PE spins *n* variants (default 3) via ControlLoop.
3. Each variant fed to Resonance Scorer (vs. intent vector & field state).
4. Top-scoring variant returned as `enhanced_prompt` + `trace_id`.
5. Audit log stored in Postgres; embeddings cached in Vector Store.

### Data Model (Pydantic)
```python
class PromptTrace(BaseModel):
    id: UUID
    user_id: UUID
    session_id: UUID
    raw_prompt: str
    variants: List[str]
    scores: List[float]
    selected_index: int
    created_at: datetime
```

### API
`POST /prompt`
```json
{
  "text": "Explain quantum computing in simple terms",
  "session_id": "...",
  "style": "concise"
}
```
→
```json
{
  "trace_id": "uuid",
  "enhanced_prompt": "You are a science teacher ..."
}
```

## 5. KPIs
* Avg resonance score ≥ 0.75
* P95 latency ≤ 700 ms
* Token overhead vs. raw prompt ≤ +25 %

## 6. Non-Functional
* Horizontal scaling via Gunicorn workers.
* Circuit-breaker if OpenAI/Anthropic is down → fall back to local Llama-3.
* Input sanitisation & PII redaction before persistence.

## 7. Risks / Mitigations
| Risk | Mitigation |
|------|------------|
| Variant explosion ↑ latency | Hard-cap n=5, adaptive early-stop on score ≥ 0.9 |
| Prompt drift (changes meaning) | Include semantic similarity check ≥ 0.8 |

## 8. Future
* Fine-tune a small model to predict top variant and skip scoring step.
* Support domain-specific style guides (legal, medical). 