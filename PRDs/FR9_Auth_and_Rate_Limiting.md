# PRD – FR-9 Authentication & Rate Limiting

## 1. Objective
Secure the web platform, providing user identity, session management, and fair usage controls.

## 2. Key Features
1. OAuth2 (Google, GitHub) + email magic-link fallback.
2. JWT access tokens; refresh via HTTP-Only cookies.
3. Role-based access (free, pro, admin).
4. Global & per-endpoint rate limits (Redis sliding window).
5. Anonymous session support with stricter limits.

## 3. User Stories
* **U1** – I login with GitHub and see my history.
* **U2** – Excessive requests get 429 with retry-after.
* **Admin1** – I can revoke a user’s token.

## 4. System Design
### Components
| Component | Purpose |
|-----------|---------|
| Auth Service | OAuth flow & JWT issuance |
| Session Middleware | Verifies JWT on each request |
| RateLimiter | Redis sorted-set sliding window |

### Sequence (Auth)
1. UI → `/auth/github` → OAuth handshake.
2. Service exchanges code, issues JWT (`access`, `refresh`).
3. Tokens stored in cookie; UI redirects.

### Sequence (Rate Limit)
1. Middleware checks Redis key `user:{id}:endpoint:{name}`.
2. If over quota → 429.
3. Otherwise increments counter and passes request.

### Config Defaults
| Tier | RPM | Concurrency |
|------|-----|-------------|
| Anonymous | 20 | 2 |
| Free | 60 | 5 |
| Pro | 200 | 10 |

## 5. KPIs
* Auth success rate ≥ 99.8 %.
* Rate-limit false positive < 0.1 %.

## 6. Non-Functional
* Passwordless only – reduces PII.
* JWT signed with rotating HS256 key.

## 7. Risks / Mitigations
| Risk | Mitigation |
|------|------------|
| Burst attack | Per-IP limits + Cloudflare WAF |
| Token theft | Short TTL + refresh rotation |

## 8. Future
* SSO (SAML) for enterprise.
* Usage-based billing integration. 