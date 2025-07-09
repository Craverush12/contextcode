# PRD – FR-5 Conversation Manager

## 1. Objective
After the user selects a preferred answer, lock conversation to that LLM and continually maintain context via Neural Field, enabling seamless chat.

## 2. Key Features
1. `POST /select` endpoint pins chosen LLMResponse.
2. Context tracking with ResidueEnhancedNeuralField; automatic decay.
3. `POST /chat` streams assistant replies.
4. Turn history persists; snapshot hash stored per turn.
5. Supports “Switch Model” command to re-route mid-session.

## 3. User Stories
* **U1** – I pick an answer and continue chatting naturally.
* **U2** – Long threads (>50 messages) still recall key facts.
* **U3** – Dev can programmatically switch models.

## 4. System Design
### Components
| Component | Purpose |
|-----------|---------|
| Conversation Manager Service | Maintains session state & neural field |
| NeuralFieldContext | Same as FR1 but session-scoped |
| TokenBudgetGuard | Trims context before each call |

### Sequence
1. `/select` stores `active_model_id` in Session.
2. `/chat` injects user msg → neural field → build context string.
3. Call active model via Executor; stream reply.
4. Append reply + updated field snapshot to SessionTurns table.

### Data Model (additional)
```python
class Session(BaseModel):
    id: UUID
    user_id: UUID
    active_model_id: str
    field_state_hash: str
    created_at: datetime
```

## 5. KPIs
* Session memory loss incidents < 0.5 %.
* P90 latency Δ vs. simple chat ≤ +300 ms.

## 6. Non-Functional
* WebSocket support for low-latency streams.
* Soft limit 100 turns; can archive older.

## 7. Risks / Mitigations
| Risk | Mitigation |
|------|------------|
| Context blow-up | Decay + attractor summarisation |
| Model drift mid-chat | Allow “switch model” command & confirm prompt |

## 8. Future
* Topic segmentation to spawn sub-sessions automatically. 