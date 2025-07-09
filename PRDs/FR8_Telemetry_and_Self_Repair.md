# PRD – FR-8 Telemetry & Self-Repair

## 1. Objective
Provide full-stack observability and automated corrective actions when system metrics degrade.

## 2. Key Features
1. OpenTelemetry traces covering prompt → validation chain.
2. Prometheus metrics (latency, cost, resonance, success_rate).
3. Alert rules + Grafana dashboards.
4. Nightly self-repair job: runs `field.self_repair.shell` if metric < SL.

## 3. User Stories
* **Ops1** – I can view latency heatmaps per LLM.
* **Ops2** – If resonance average drops 10 %, PagerDuty alert triggers.
* **Eng1** – System auto-patches prompt template regression.

## 4. System Design
### Components
| Component | Purpose |
|-----------|---------|
| OTEL SDK | Instrument FastAPI & Celery |
| Prometheus | Metrics scrape & alerting |
| Grafana | Dashboards |
| Self-Repair Worker | Executes repair protocol shells |

### Sequence (Self-Repair)
1. Cron job queries Prom for failing SLO.
2. Generates repair request → Self-Repair Worker.
3. Worker runs `field.self_repair.shell.md` via ControlLoop.
4. Proposed patch stored; engineer reviews & applies.

### Metrics Schema
`context_engine_latency_seconds`, `context_resonance_score`, `router_cost_cents`, `validation_fail_ratio` …

## 5. KPIs
* Mean time to detect (MTTD) < 2 min.
* ≥ 50 % issues auto-resolved or recommended.

## 6. Non-Functional
* No PII in traces.
* Dashboards public-read for org members.

## 7. Risks / Mitigations
| Risk | Mitigation |
|------|------------|
| Alert fatigue | Multi-level alerting w/ quiet hours |
| Automated patch causes regressions | Human approval gate |

## 8. Future
* Reinforcement learning based continuous tuning. 