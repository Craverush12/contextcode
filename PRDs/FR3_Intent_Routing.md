# PRD – FR-3 Intent Detection & Model Routing

## 1. Objective
Routes each enhanced/refined prompt to the most suitable set of LLMs based on *intent vectors*, cost, latency, and user preference.

## 2. Key Features
1. Multi-vector intent embedding (task, domain, format, style).
2. Model registry with capability embeddings & cost/latency stats.
3. Bandit algorithm (Thompson Sampling) weighted by resonance × cost.
4. Real-time drift detection: re-run routing if context attractor changes.
5. Observability: per-decision trace + feature weights.

## 3. User Stories
* **U1** – My coding question is automatically routed to code-optimised models.
* **U2** – Budget-constrained org can cap cost/model.
* **U3** – Dev calls `/route` and sees selected model_ids + scores.

## 4. System Design
### Components
| Component | Source | Purpose |
|-----------|--------|---------|
| IntentClassifier | new `intent_classifier.py` | Embed + classify prompt |
| ModelRegistry | `llm_registry.yaml` + loader | Stores capabilities |
| RouterPolicy | new `router_policy.py` | Bandit & constraints |

### Sequence
1. Gateway `/route` (trace_id, prompt) → IntentClassifier.
2. Generate intent vector; compute resonance with each model embedding.
3. RouterPolicy filters by SLA/cost, runs bandit to pick top-K (default 3).
4. Return `{model_ids[], scores[]}` to caller.
5. Log decision to Postgres & Prometheus.

### Data Models
```python
class ModelCard(BaseModel):
    id: str
    provider: str
    embedding: List[float]
    cost_per_1k: float
    latency_p95: float
    capabilities: List[str]
```

### API
`POST /route` → `{candidate_models: [str], scores: [float]}`

## 5. KPIs
* Routing accuracy (chosen model = user pick) ≥ 70 %.
* Cost per request ≤ 80 % of GPT-4 baseline.
* Policy decision latency ≤ 150 ms.

## 6. Non-Functional
* Registry hot-reload without downtime.
* Fallback list if classifier confidence < 0.5.

## 7. Risks / Mitigations
| Risk | Mitigation |
|------|------------|
| Model embedding drift | Nightly cron recomputes capability embeddings |
| Cost spike | Hard budget caps & alerting |

## 8. Future
* Reinforcement learning policy using reward = user thumbs-up.
* Fine-grained domain routers (medical, legal) behind feature flags. 