# Invariant

Invariant is a self-hosted, full-stack DSA practice product that answers a practical question: **what should I solve next, and why?**

The v2 application combines a curated problem catalog, an explainable adaptive hybrid ranker, IRT-style topic mastery, FSRS review scheduling, study plans, attempt analytics, and opt-in public profiles. It is not an LLM chatbot, and this repository does not imply that a hosted production instance exists.

## What is implemented

- Google OAuth sign-in with verified-email checks and database-backed sessions.
- Mandatory onboarding before the authenticated product can be used.
- Profile, goal, time-budget, language, focus-topic, and visibility settings.
- Explainable `DAILY`, `LEARN`, `REVIEW`, and `CHALLENGE` recommendation feeds.
- Topic mastery updates from outcome, time, hints, and problem difficulty.
- Per-problem FSRS review scheduling and due-review prioritization.
- Idempotent attempt logging with notes, confidence, language, and attribution.
- Deterministic study-plan generation with review-first, time-aware scheduling.
- Progress analytics, an activity history, and responsive light/dark UI.
- LeetCode and Codeforces public-profile snapshot sync. These snapshots are aggregate context; they do not become per-problem mastery evidence.
- Opt-in public profiles at `/u/[handle]`, exposing only an allowlisted projection and aggregate progress.
- Account export as streamed NDJSON and permanent account deletion with typed confirmation.
- PostgreSQL persistence, Redis-backed rate limits, health checks, retention cleanup, Docker images, and CI.

The seeded recommendation catalog currently contains curated LeetCode metadata and links; Invariant does not store problem statements or solutions.

## Architecture and stack

| Layer | Implementation |
| --- | --- |
| Web | Next.js 16 App Router, React 19, TypeScript |
| UI | Tailwind CSS, Heroicons, Recharts, responsive server/client components |
| Authentication | NextAuth v4, Google OAuth, Prisma adapter, database sessions |
| Data | PostgreSQL 17, Prisma ORM and migrations |
| Operational state | Redis 7.4 for distributed fixed-window rate limiting; bounded in-process fallback for local outages |
| Recommendation | Pure TypeScript `hybrid-v1` ranker, IRT-style mastery, UCB exploration, MMR diversification |
| Reviews | `ts-fsrs`, with a separate card per user/problem |
| Validation | Zod at API boundaries |
| Testing | Vitest unit and PostgreSQL-backed integration suites |
| Packaging | Multi-stage Docker build with a non-root standalone Next.js runner |

The browser talks to Next.js pages and `/api/v1` route handlers. Route handlers authorize the current session, validate input, apply per-user limits, and call server-only services. Transactional services update PostgreSQL; recommendation scoring remains a pure module so its behavior is deterministic and unit-testable.

Read the detailed [architecture](docs/architecture.md) and [recommendation-system design](docs/recommendation-system.md).

## Docker quick start

Prerequisites: Docker with Compose, plus a Google OAuth web client.

1. Create local configuration:

   ```bash
   cp .env.example .env
   openssl rand -base64 32
   ```

2. Put the generated value in `NEXTAUTH_SECRET`, then set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`.

3. Register the local Google callback described below.

4. Build and start the stack:

   ```bash
   docker compose up --build
   ```

The one-shot `migrate` service applies migrations and idempotently seeds the catalog before `web` starts. PostgreSQL and password-protected Redis are exposed only on the loopback interface; the application is available at [http://localhost:3000](http://localhost:3000).

Useful checks:

```bash
curl -fsS http://localhost:3000/api/health/live
curl -fsS http://localhost:3000/api/health/ready
docker compose logs -f web
```

`docker compose down` stops the stack without removing its named data volumes. Do not add `-v` unless the data is disposable and you intentionally want a reset; see [Migrating to v2](docs/migration-v2.md).

## Google OAuth configuration

Create an OAuth 2.0 Client ID of type **Web application** in Google Cloud Console.

For local development, configure:

- Authorized JavaScript origin: `http://localhost:3000`
- Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

For production, add the exact HTTPS origin and callback:

- `https://your-domain.example`
- `https://your-domain.example/api/auth/callback/google`

Set `NEXTAUTH_URL` and `NEXT_PUBLIC_SITE_URL` to that same canonical origin. Redirect matching is exact: scheme, host, port, and path must agree with Google’s configuration.

Invariant requests `openid email profile`, accepts only Google accounts whose email is reported as verified, and creates a 30-day database session refreshed at most once per day. A newly authenticated user must complete the profile/onboarding flow before protected product routes and most v1 APIs are usable.

## Environment variables

Start with [`.env.example`](.env.example). Never commit real values.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXTAUTH_URL` | Yes | Canonical application origin, OAuth base URL, and allowed mutation origin. Use HTTPS outside localhost. |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Canonical public/metadata URL and Docker build argument. Keep it equal to `NEXTAUTH_URL`. |
| `NEXTAUTH_SECRET` | Yes | Session/auth signing secret. The app requires at least 32 characters and reasonable character diversity. |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth web-client ID. |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret. |
| `DATABASE_URL` | Yes | PostgreSQL connection string used by Prisma, migrations, tests, and cleanup. |
| `REDIS_URL` | Production | Redis connection string used for shared rate limits. Local development can fall back to bounded process memory; production readiness requires Redis. |
| `PLATFORM_SYNC_TTL_SECONDS` | No | Reuse window for platform snapshots; defaults to `900` and is clamped to 60–86,400 seconds. |
| `RECOMMENDATION_RETENTION_DAYS` | No | Retention for expired recommendation runs during cleanup; defaults to `90`. |
| `PLATFORM_SNAPSHOT_RETENTION_DAYS` | No | Retention for older platform snapshots while preserving the newest per identity; defaults to `365`. |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Compose | Local Compose database configuration. Replace the development defaults outside local use. |
| `REDIS_PASSWORD` | Compose | Password used by the Compose Redis server and the internal `web` connection. |
| `POSTGRES_HOST_PORT`, `REDIS_HOST_PORT`, `WEB_HOST_PORT` | Compose | Optional host-port overrides; default to `5434`, `6380`, and `3000`. |

The host-facing `DATABASE_URL` and `REDIS_URL` in `.env` are used when Node runs on the host. If you reuse the Compose infrastructure with its default local credentials, use:

```dotenv
DATABASE_URL=postgresql://invariant:invariant-local-only@localhost:5434/invariant?schema=public
REDIS_URL=redis://:invariant-local-only@localhost:6380
```

Compose overrides those two URLs inside containers with service-network addresses.

## Native local development

Prerequisites: Node.js 22+, PostgreSQL, and optionally Redis.

```bash
npm ci
npm run db:deploy
npm run db:seed
npm run dev
```

For disposable local infrastructure without running the app in Docker:

```bash
docker compose up -d postgres redis
```

Then use the passworded host URLs shown above. PostgreSQL must be migrated and seeded before the app or integration suite can operate.

## Local scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server. |
| `npm run build` | Create the standalone production build. |
| `npm start` | Run a previously built application. |
| `npm run lint` | Run ESLint with zero warnings allowed. |
| `npm run audit` | Fail on high/critical dependency advisories. |
| `npm run typecheck` | Run TypeScript without emitting files. |
| `npm test` | Run pure unit tests once. |
| `npm run test:watch` | Run unit tests in watch mode. |
| `npm run test:coverage` | Run unit tests with V8 coverage output. |
| `npm run test:integration` | Run PostgreSQL-backed product-service integration tests; requires a migrated, seeded test database. |
| `npm run validate` | Run lint, typecheck, unit tests, and production build. |
| `npm run catalog:validate` | Validate curated catalog and prerequisite invariants. |
| `npm run db:generate` | Regenerate Prisma Client. |
| `npm run db:migrate` | Create/apply a migration in development. |
| `npm run db:deploy` | Apply checked-in migrations without creating new ones. |
| `npm run db:seed` | Idempotently upsert topics, prerequisites, and catalog problems. |
| `npm run db:cleanup` | Delete expired sessions/tokens, old expired recommendation runs, and old non-latest platform snapshots using configured retention windows. |
| `npm run db:studio` | Open Prisma Studio. |

Run `db:cleanup` from a trusted maintenance environment on a schedule appropriate for the deployment. It is not an in-process background job and is not automatically run by the web container. Compose exposes the same one-shot command with `docker compose --profile maintenance run --rm cleanup`.

## API map

All standard application responses use `{ data, requestId }` on success or `{ error: { code, message, details? }, requestId }` on failure and set `Cache-Control: no-store`. The streaming export and NextAuth routes are intentional exceptions.

| Method | Route | Purpose |
| --- | --- | --- |
| `GET`, `POST` | `/api/auth/*` | NextAuth Google sign-in, callback, session, CSRF, and sign-out endpoints. |
| `GET` | `/api/health/live` | Process liveness. |
| `GET` | `/api/health/ready` | Database, Redis, and production auth readiness. |
| `GET` | `/api/v1/dashboard` | Combined 30-day analytics and daily recommendations. |
| `GET` | `/api/v1/analytics?range=7\|30\|90` | Authenticated progress analytics. |
| `GET`, `POST` | `/api/v1/attempts` | Cursor-paginated attempt history and idempotent attempt recording. |
| `GET` | `/api/v1/recommendations` | Read or generate a compatible recommendation feed. |
| `POST` | `/api/v1/recommendations/refresh` | Force a newly seeded recommendation run. |
| `POST` | `/api/v1/recommendation-events` | Record owned impression/open/start/dismiss/bookmark feedback idempotently. |
| `GET`, `PUT`, `PATCH` | `/api/v1/me` | Read the account view, complete onboarding once, or update profile preferences. |
| `PUT` | `/api/v1/me/topics` | Replace the 3–12 selected focus topics and invalidate current recommendations. |
| `PUT`, `DELETE` | `/api/v1/me/platforms/[platform]` | Save or disconnect a LeetCode/Codeforces handle. |
| `POST` | `/api/v1/me/platforms/[platform]/sync` | Fetch, validate, and persist a public platform snapshot. |
| `GET` | `/api/v1/me/export` | Stream a rate-limited, sensitive NDJSON account export. |
| `DELETE` | `/api/v1/me/account` | Permanently delete the authenticated account after exact confirmation. |
| `GET`, `POST` | `/api/v1/plans` | Read plan history or create one active plan. |
| `PATCH` | `/api/v1/plans/[planId]/items/[itemId]` | Update an owned plan item and reconcile plan lifecycle. |

Except for health, auth, and opt-in public pages, the product is session-authenticated. Mutations require the expected origin, strict validated input, ownership checks, and route-specific rate limits. See [SECURITY.md](SECURITY.md) for the threat model and reporting process.

## Recommendation design

Invariant’s recommender is an **explainable adaptive hybrid ranker**, not a language model or a claim of state-of-the-art predictive accuracy.

At a high level it:

1. Filters unusable, dismissed, recently served, already-solved-not-due, premium-locked, and prerequisite-blocked candidates.
2. Estimates solve probability from topic ability and curated item difficulty.
3. Scores mastery need, goal/time fit, review urgency, difficulty fit, recent behavior, catalog quality, and bounded exploration.
4. Assigns daily review/learn/explore lanes and diversifies the slate with MMR.
5. Persists the algorithm version, inputs, scores, diagnostic exclusions, and up to three human-readable reasons.
6. Uses new attempts to update topic mastery and the FSRS review card transactionally, then expires stale feeds.

The UI’s match percentage is a normalized ranking score, not a probability; predicted solve probability is shown separately. External platform totals currently do not update mastery. Full formulas, weights, cold-start behavior, cache rules, tests, and known limitations are documented in [docs/recommendation-system.md](docs/recommendation-system.md).

## Security and privacy

- Google OAuth is the only sign-in provider; no local passwords are stored.
- Sessions are revocable database records rather than stateless long-lived JWT sessions.
- Server authorization and onboarding checks protect pages and APIs; client visibility is never the authorization boundary.
- Mutations enforce same-origin requests, strict Zod schemas, bounded request bodies where applicable, ownership, and per-route limits.
- Redis provides shared rate-limit state. The memory fallback is per process and is not a substitute for Redis in a multi-instance deployment.
- Third-party sync uses public handles only, with redirect blocking, timeouts, response-size caps, and response-schema validation.
- Public profiles are off by default, use an explicit safe-field projection, never include email/notes/account data, cache for 60 seconds, invalidate on relevant mutations, and have per-client request limiting.
- Security headers include a scoped Content Security Policy, framing/MIME protections, browser capability restrictions, and production HSTS. TLS termination and data-store encryption remain deployment responsibilities.
- Users can download their data and permanently delete their account from settings.

Provider tokens and account data reside in PostgreSQL through the NextAuth adapter; production operators must protect database access, encryption, backups, and logs accordingly. Read [SECURITY.md](SECURITY.md) before deploying.

## Testing and CI

The unit suite covers OAuth policy, recommendation scoring, filtering, diversity, mastery updates, study-plan scheduling, and plan lifecycle. The integration suite exercises PostgreSQL-backed session cleanup/cascade behavior, onboarding enforcement, idempotent attempt concurrency, recommendation caching/dismissal, plan completion, and stale platform-sync protection. It does not replace browser end-to-end testing or a live Google OAuth callback test.

GitHub Actions runs on pushes to `main` and pull requests. The quality job provisions PostgreSQL and Redis, installs locked dependencies, validates and seeds the catalog, runs lint, typecheck, coverage, integration tests, and the production build. A separate job builds the non-root `runner` image.

Before opening a pull request, run:

```bash
npm run catalog:validate
npm run lint
npm run typecheck
npm run test:coverage
npm run test:integration
npm run build
```

The integration command must target an isolated test database; it creates and deletes test users but should never be pointed at production.

## Deployment checklist

- [ ] Read [docs/migration-v2.md](docs/migration-v2.md); never apply the v2 baseline over a prototype database by assumption.
- [ ] Use Node.js 22 and immutable, reviewed dependencies (`npm ci`).
- [ ] Provision PostgreSQL with automated backups and a tested restore procedure.
- [ ] Provision authenticated Redis reachable by every application instance.
- [ ] Set a strong `NEXTAUTH_SECRET`; rotate any placeholder or exposed credential.
- [ ] Set matching HTTPS `NEXTAUTH_URL` and `NEXT_PUBLIC_SITE_URL` values.
- [ ] Register the exact production Google origin and callback URI.
- [ ] Apply migrations and seed the catalog as a one-off release step before serving traffic.
- [ ] Schedule `npm run db:cleanup` with explicit retention values and monitoring.
- [ ] Restrict database and Redis network access; do not publish local Compose credentials.
- [ ] Allow outbound HTTPS to Google, LeetCode, and Codeforces if platform sync is enabled.
- [ ] Configure the reverse proxy to replace untrusted forwarding headers so public-profile client limiting receives a trustworthy address.
- [ ] Route traffic only after `/api/health/ready` succeeds; use `/api/health/live` for liveness.
- [ ] Preserve and search `x-request-id` in application/proxy logs without logging secrets or exported user data.
- [ ] Run unit, integration, build, migration, and container checks against the release artifact.
- [ ] Test sign-in, onboarding, attempt logging, export/deletion, and public-profile privacy in the target environment.

The included Compose file is suitable for local evaluation, not a complete production platform. Deployment-specific TLS termination, secret storage, backups, observability, scaling, scheduled maintenance, and incident response remain operator responsibilities.

## Migration, security, and license

- [Architecture](docs/architecture.md)
- [Recommendation system](docs/recommendation-system.md)
- [Migrating from the prelaunch prototype](docs/migration-v2.md)
- [Security policy](SECURITY.md)
- [MIT License](LICENSE)
