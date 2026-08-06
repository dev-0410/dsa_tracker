# Migrating to the v2 baseline

## Read this before applying migrations

**The old prelaunch prototype migration was replaced by a greenfield v2 baseline. Existing prototype databases require an intentional export/reset; this repository does not provide or claim an in-place migration from the prototype schema.**

The deleted prototype migration was identified as `20250212082818_init`. The current history begins with `20260805214216_init` and adds focused v2 constraints after it. Because the baseline redefines identity, profiles, attempts, mastery, recommendations, plans, integrations, and catalog relations, applying it over a database that already recorded the prototype migration is not a supported upgrade path.

Do not:

- point the v2 application at a prototype database and assume `prisma migrate deploy` will transform it;
- delete rows from Prisma’s migration table or mark the new baseline resolved to suppress drift;
- run a destructive reset before creating and verifying a backup;
- import prototype rows directly into v2 tables without an explicit mapping and validation pass.

## Identify the database you have

On a copy or with read-only access, inspect Prisma migration history:

```sql
SELECT migration_name, finished_at, rolled_back_at
FROM "_prisma_migrations"
ORDER BY started_at;
```

You have a v2 database only when its migration history begins with the checked-in v2 baseline and `npm run db:deploy` reports no drift. A database showing `20250212082818_init` is a prototype database for the purposes of this guide.

If there is any ambiguity, stop and preserve the database before continuing.

## New installation or disposable prototype data

For a new empty database:

```bash
npm ci
npm run db:deploy
npm run db:seed
```

Verify:

```bash
npx prisma migrate status
npm run catalog:validate
```

For a disposable local Compose environment, first confirm that nothing in the named volumes is needed. The following command permanently deletes the local PostgreSQL and Redis volumes:

```bash
docker compose down -v
docker compose up --build
```

Do not run that reset against a shared environment or before backing up data you may need.

## Preserving prototype data

There is no universal row-for-row importer because the prototype and v2 models have different semantics. Use a side-by-side migration:

1. Freeze writes to the prototype or record a final export timestamp.
2. Create a complete database backup.
3. Restore or retain that backup under a separate database/cluster name.
4. Provision a new, empty v2 database.
5. Apply the checked-in v2 migrations and seed the v2 catalog.
6. Write a project-specific import that reads the legacy copy and writes through an explicit mapping.
7. Reconcile counts, identities, timezones, unique handles, topic mappings, and referential integrity.
8. Test authentication and core product flows against the imported copy.
9. Switch application traffic only after verification and with a rollback plan.

A PostgreSQL custom-format backup is one reasonable preservation artifact:

```bash
pg_dump "$LEGACY_DATABASE_URL" --format=custom --file=invariant-prototype.dump
pg_restore --list invariant-prototype.dump > invariant-prototype.contents.txt
```

Store the dump as sensitive data. Verify that `pg_restore --list` succeeds and, for material data, perform a test restore before resetting anything.

## Import mapping considerations

An import should make every conversion explicit. At minimum review:

| Prototype concept | v2 destination/decision |
| --- | --- |
| User identity | `User` plus Google `Account`; do not invent OAuth provider identifiers. |
| Authentication/session rows | Do not migrate active sessions. Require a fresh Google sign-in. |
| Profile | `UserProfile`; create a unique lowercase handle, valid IANA timezone, goals, routine, and onboarding timestamp. |
| Platform usernames | `PlatformIdentity`; normalize handles and fetch a fresh snapshot after import. |
| Platform aggregate history | Keep as a separate archive unless it can be safely represented as dated `PlatformSnapshot` rows. |
| Topics | Map legacy labels to seeded v2 `Topic.slug` values; never assume database IDs match. |
| Solved counts | Do not fabricate `Attempt` rows from an aggregate total. Preserve the total separately or rely on a new platform snapshot. |
| Detailed practice records | Import as `Attempt` only when problem identity, outcome, timestamp, duration, and an idempotency key can be defined reliably. |
| Problem references | Map by stable platform/external ID or reviewed slug, not by old database ID. |
| Mastery | Prefer recomputing from trustworthy imported attempts; otherwise initialize from experience and retain legacy estimates outside the live model. |
| Recommendations/plans | Treat as historical archive unless all referenced catalog and state semantics can be mapped. Starting fresh is safer. |

V2’s account export endpoint emits v2 NDJSON and is intended for user portability. It is not a prototype-to-v2 migration tool.

## Validation after an import

Use an isolated candidate environment and verify at least:

- every imported user can complete a fresh Google sign-in and reaches the correct onboarding state;
- profile handles and platform identities satisfy uniqueness/normalization rules;
- all attempt/problem/topic foreign keys resolve to seeded v2 records;
- imported attempts have unique per-user idempotency keys;
- mastery values are finite, bounded, and consistent with attempt counts;
- no user has more than one active study plan;
- recommendation generation returns owned items and does not reuse stale prototype artifacts;
- account export and deletion work for an imported test account;
- private profiles are not available at `/u/[handle]`;
- `npm run test:integration` passes against a separate migrated/seeded test database;
- `npx prisma migrate status`, readiness, and catalog validation are clean.

Compare source/export counts to imported counts by category and document every intentional omission. Aggregate totals alone are insufficient when the destination records carry different meaning.

## Cutover and rollback

- Keep the prototype database read-only and intact through the agreed rollback window.
- Take a v2 pre-cutover backup after import and verification.
- Stop prototype writes before the final delta/import.
- Deploy migrations as a one-off release step, then start v2 application instances.
- Confirm `/api/health/ready`, Google callback configuration, onboarding, recommendations, attempts, and platform sync.
- If cutover fails, restore routing to the untouched prototype application/database; do not try to downgrade the v2 schema in place.

After acceptance, apply the organization’s retention policy to prototype backups. Their user and OAuth data remains sensitive even when the application is no longer running.

## Future v2 migrations

Once a database is on the v2 baseline, make forward-only Prisma migrations from `prisma/schema.prisma`, review the generated SQL, and test it against a recent scrubbed backup. Do not rewrite already-deployed migration files.

The greenfield exception in this document applies specifically to the unreleased prototype-to-v2 transition; it is not a policy for discarding production migration history.
