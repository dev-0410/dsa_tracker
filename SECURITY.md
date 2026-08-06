# Security policy

## Supported versions

| Version | Security support |
| --- | --- |
| Current `main` / v2.x | Supported |
| Pre-v2 prototype | Unsupported; see [docs/migration-v2.md](docs/migration-v2.md) |

This repository is a self-hosted reference application. Operators are responsible for patching, secret management, network policy, TLS, database/Redis security, backups, logging, and incident response for their deployment.

## Reporting a vulnerability

Please report suspected vulnerabilities privately through the repository’s [GitHub Security Advisory form](https://github.com/Pheonix-dev0410/dsa_tracker/security/advisories/new). Do not open a public issue for an undisclosed vulnerability.

Include, when possible:

- the affected commit or version;
- the vulnerable route/component and required preconditions;
- clear reproduction steps or a minimal proof of concept;
- expected impact and whether user interaction is required;
- suggested mitigations;
- only redacted test data.

Do not include live credentials, OAuth tokens, session tokens, raw account exports, or another person’s private data. Do not perform destructive testing, denial of service, social engineering, or testing against infrastructure you do not own or have explicit permission to assess.

Maintainers should keep the report private while reproducing, determining impact, preparing a fix, and coordinating disclosure. This project does not currently publish a response-time SLA or bug-bounty program.

## Security model

### Authentication

- Google OAuth is the only configured provider.
- Sign-in accepts only Google identities reporting a verified email.
- NextAuth stores accounts and revocable sessions through Prisma/PostgreSQL.
- Sessions have a 30-day maximum age and a one-day update interval.
- OAuth callbacks must exactly match the configured canonical origin.
- Authentication configuration is included in production readiness checks; placeholder/weak secrets do not count as configured.

The NextAuth adapter may store Google access, refresh, and ID tokens in the `Account` table. They are not application-level encrypted by this repository. Production deployments must use least-privilege database access, encrypted connections/storage/backups, and tightly controlled administrative access.

### Authorization and onboarding

- Protected pages and APIs authorize on the server using the current database session.
- Most product operations require both an authenticated user and completed onboarding/profile.
- Ownership checks scope attempts, recommendation events, plans, platform identities, exports, and deletion to the current user.
- UI state and hidden controls are never treated as authorization.
- Account deletion relies on user-owned cascade relations; curated catalog records are not user data.

### Request integrity

- State-changing application routes require a valid same origin in addition to the session cookie.
- Strict Zod schemas reject unknown or malformed fields.
- The shared JSON reader enforces content type, UTF-8, and route-specific byte limits where used.
- Attempt and recommendation-event writes use per-user idempotency keys and reject reuse with different payloads.
- Serializable transactions and database uniqueness constraints protect multi-record state transitions and active-plan uniqueness.
- Standard API failures return stable, non-sensitive error codes plus a request ID.

### Rate limiting

- Authenticated API limits are namespaced per user or user/platform.
- Public profiles are limited per derived client address.
- Redis uses an atomic fixed-window script and hashed identifiers.
- A bounded in-process fallback keeps local development usable during Redis outages.

The fallback is not shared across processes and must not be considered a distributed production control. Configure Redis in production and alert when it is unavailable.

The public-profile limiter uses `x-forwarded-for`/`x-real-ip`. A production reverse proxy must remove untrusted client-supplied values and set the canonical client address itself. Otherwise an attacker may evade or poison address-based limits.

### External requests

LeetCode and Codeforces integration uses public handles only; no third-party password or private API token is requested. The shared HTTP client:

- uses fixed HTTPS endpoints built by the server;
- blocks redirects;
- applies timeouts and response-size caps;
- disables caching;
- validates response JSON with explicit schemas;
- maps upstream errors without returning raw bodies.

Platform-sync rate limits and a compare-and-set identity version prevent excessive refreshes and stale results being committed after a handle change.

### Public profiles and privacy

- Profiles are private by default and require an explicit `isPublic` setting.
- `/u/[handle]` queries only completed profiles where `isPublic=true`.
- The public projection allowlists display profile fields, aggregate progress, mastery, and active public-platform snapshots.
- It does not select or expose email, OAuth account records/tokens, sessions, notes, individual attempts, recommendation history, or plans.
- Invalid, private, incomplete, and unknown handles share not-found behavior and noindex metadata.
- Public data is cached for 60 seconds and tagged; relevant profile, topic, attempt, integration, and deletion mutations expire the tag.

Changing visibility to private invalidates the public cache. Operators should still treat CDN/proxy caches and search-engine removal as separate concerns if they add caching outside the application.

### Browser and response controls

The application disables the framework signature header and sets:

- `X-Content-Type-Options: nosniff`;
- `X-Frame-Options: DENY`;
- `X-DNS-Prefetch-Control: off`;
- `Referrer-Policy: strict-origin-when-cross-origin`;
- `Cross-Origin-Opener-Policy: same-origin-allow-popups`;
- `Cross-Origin-Resource-Policy: same-origin`;
- a restrictive `Permissions-Policy` for camera, microphone, geolocation, payment, and USB.

It also sets a Content Security Policy that limits content, connections, workers, images, framing, forms, and object embedding to the application’s needs, plus HSTS in production builds. If a deployment adds or tightens proxy-level policy, test Google OAuth and every application asset in that environment.

### Data portability and deletion

Authenticated users can request a rate-limited streamed NDJSON export. It contains sensitive account and learning data and must be downloaded and stored carefully. The export intentionally excludes stored OAuth token values but includes account identifiers and user-generated data.

Permanent account deletion requires the exact `DELETE` confirmation, same-origin validation, authentication, and a daily rate limit. Deleting the user cascades user-owned records and invalidates the public-profile cache.

### Data retention

`npm run db:cleanup` deletes:

- expired sessions;
- expired verification tokens;
- expired recommendation runs older than `RECOMMENDATION_RETENTION_DAYS` (default 90);
- platform snapshots older than `PLATFORM_SNAPSHOT_RETENTION_DAYS` (default 365), except the newest snapshot for each identity.

Cleanup is not automatic in the web process. Schedule it from a trusted maintenance environment, monitor its result, and include retention behavior in backup policy. Attempts, profiles, plans, and activity are retained until account deletion under the current model.

## Deployment hardening checklist

- Use a supported Node.js 22 runtime and apply dependency/security updates intentionally.
- Use HTTPS and set identical canonical `NEXTAUTH_URL`/`NEXT_PUBLIC_SITE_URL` origins.
- Generate a unique, high-entropy `NEXTAUTH_SECRET`; never reuse the example value.
- Keep Google client secrets, database credentials, Redis passwords, and OAuth data out of source control and logs.
- Restrict PostgreSQL and Redis to private networks/security groups; require Redis authentication.
- Use encrypted database/Redis transport where the provider/network boundary requires it.
- Run the standalone container as its included unprivileged user with dropped capabilities.
- Configure the reverse proxy to normalize forwarding headers and retain `x-request-id`.
- Apply reviewed migrations before traffic and follow [the v2 migration warning](docs/migration-v2.md).
- Back up PostgreSQL and practice restoring it; protect and expire backups as sensitive data.
- Schedule and monitor `npm run db:cleanup`.
- Limit outbound traffic to required OAuth and public-platform HTTPS endpoints where practical.
- Alert on readiness failures, repeated 401/403/429/5xx responses, and Redis fallback warnings.
- Run lint, typecheck, unit tests, integration tests, catalog validation, production build, and container build for releases.
- Test sign-in/sign-out, onboarding enforcement, cross-user ownership, public/private profile transitions, export, and deletion in the target environment.

The local Compose credentials are for loopback-bound development only. Replace them in any shared environment.

## Security testing coverage and limitations

CI runs static lint/type checks, pure unit tests, PostgreSQL-backed product integration tests, a production build, and a container build. Integration coverage includes concurrent attempt idempotency and stale platform-sync rejection.

The repository does not currently include browser end-to-end security tests, a live Google OAuth callback test, DAST, dedicated SAST beyond lint/type checks, penetration-test results, or formal compliance certification. CI does gate high/critical dependency advisories, but operators must still review reachability and apply security updates intentionally.

## Dependency and secret incidents

For a vulnerable dependency:

1. confirm the reachable affected surface;
2. update the lockfile with the smallest compatible fixed version;
3. run the complete quality and integration suite;
4. rotate secrets if exposure is possible;
5. rebuild and redeploy immutable images;
6. document impact and remediation without disclosing user data.

For a leaked Google, session, database, or Redis secret, revoke/rotate it immediately, invalidate affected sessions where appropriate, review logs without copying tokens, and assess whether database or export data was accessed.
