# Feature specification — Persistent account identities

Todo: TODO-b505a997
Repository: /Users/sadde/ticket-db-dev
Slug: replace-prototype-users-table-with-persistent-account-identities
Readiness: READY

## Authority and sources
Primary authority is the clarified TODO-b505a997 body and its Required proof and boundaries. Supporting discovery is `docs/replace-prototype-users-table-with-persistent-account-identities/01-discovery-handoff.md`. Its earlier unresolved identity/display-name/transition questions are superseded by the clarified todo and the decisions below.
Repository evidence: `database/connection.js`, `database/initialize.js`, `server.js`, `package.json`, `README.md`, and `tests/sqlite-initialization.test.cjs`.
The table is the identity parent for later reporter, assignee, verifier and closer references; those are future ticket relationships, not extra users columns.

## Outcome
A fresh SQLite database initialized by the existing standalone command contains persistent, uniquely identifiable accounts with protected-credential storage and one supported role. Existing prototype schemas are rejected without data loss; valid replacement accounts survive repeat initialization.

## Agreed table contract
The table remains named `users`. Write Spec selects these concrete columns:
- `id INTEGER PRIMARY KEY`: stable account identity and future foreign-key target `users(id)`. SQLite can generate an ID when omitted. No AUTOINCREMENT/non-reuse guarantee is required.
- `display_name TEXT NOT NULL`: account display name; not a username or sign-in key.
- `email TEXT NOT NULL UNIQUE`: unique sign-in identifier.
- `password_hash TEXT NOT NULL`: stored encoded password hash supplied by future credential creation code; no plaintext-password column.
- `role TEXT NOT NULL`: exactly one of `employee`, `technician`, `administrator`.

An appropriate SQLite definition is:
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    display_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL
        CHECK (role IN ('employee', 'technician', 'administrator'))
);
```
No default role, seeded account, username, multi-role join table or technician profile is introduced. Required means non-NULL for this table contract; empty-string rules are not added. Email uniqueness uses ordinary SQLite TEXT/BINARY comparison; trimming, canonicalization, case folding and email-format validation are not introduced. Future authentication must deliberately agree its lookup/normalization policy.

## Behaviour
### ACC-01 — Fresh standalone account setup
Using the existing `npm run db:init` command or standalone entry point on a fresh database creates the replacement users schema described above. Accounts persist with their stable integer identities and the required account fields. No tickets or ticket foreign keys are created.

### ACC-02 — Field and role constraints
SQLite rejects missing/NULL display_name, email, password_hash or role, duplicate email identifiers and unsupported role values. Each account stores one scalar role from the three agreed values. A password_hash field provides storage, not hash generation or validation: no hashing algorithm, algorithm-specific encoded format or plaintext-detection gate is added. Future callers must supply hashes rather than plaintext.

### ACC-03 — Explicit non-destructive prototype rejection
When initialization encounters the old users(id, name, email)-only schema, it detects that the account contract is incompatible and fails rather than reporting successful setup. The standalone process exits unsuccessfully and provides actionable guidance to back up the database or explicitly reset it. It closes the connection on this rejection.
Existing table definitions and records remain intact. Do not drop tables, delete database files/sidecars, rewrite records, automatically convert data or silently add columns as a migration. This also applies when the prototype table is empty.
This is a bounded compatibility check for the required schema transition, not a general-purpose schema fingerprinting/migration framework.

### ACC-04 — Repeat preservation of replacement accounts
Reinitializing a database already using the replacement schema succeeds and preserves the schema, stored identities, field values and accounts. The database remains usable for valid account reads/writes. Do not recreate destructively or reseed it.

## Retained integration boundaries
Keep the existing shared connection setup and checkout-root database location, independent of process cwd. Retain per-connection foreign-key enforcement and standalone completion without HTTP startup. Preserve the shared module's public responsibilities; no new datastore or Java conversion.
The existing Express backend also calls openDatabase. Compatibility rejection therefore propagates through its existing startup-failure path. Do not add a separate server bypass for the old schema.

## Explicitly deferred / unchanged
- Existing /api/users routes, request/response handling, app.js and index.html are not adapted or retired here.
- Those routes still insert name/email and do not satisfy the replacement account contract. Their incompatibility is an acknowledged intermediate state until the separately scoped integration TODO; successful prototype account creation is not an acceptance obligation for this schema replacement.
- No account-management/login endpoint, credential hashing or checking flow, authorization implementation or browser UI.
- No tickets/child/other parent tables, technician profile, Java identity unification, incidents.dat deletion or legacy incident conversion.
- No automatic resets, migrations, seed credentials, dependency upgrades or unrelated cleanup.
- Preserve unrelated work; do not reintroduce HelloWorld.java; Auto Merge remains off.

## Impact on existing tests and documentation
Current initialization tests require the prototype columns and create old-shape rows, including through POST /api/users. These assumptions are superseded where they directly conflict with this authorized schema replacement.
Update affected schema/data fixtures and incompatible API-dependent portions to exercise the replacement account contract. Retain independently applicable coverage for stable checkout-relative selection, prepared connections, standalone lifecycle and shared setup. Do not keep obsolete legacy-CRUD success requirements by weakening account constraints or expanding into route integration. No entire unrelated suites should be removed.
Update initialization documentation to describe the account shape, non-destructive incompatibility failure and manual fresh-start option. Documentation is not an automated exact-wording contract.

## Acceptance and later planning guidance
Required proof uses temporary databases: fresh key/fields/role constraints, rejection of a persisted prototype database without schema/record loss, and repeated replacement initialization preserving accounts. Include an empty prototype variant where useful to demonstrate detection is structural rather than dependent on existing rows.
Observe constraints through database state and operations; messages may vary as long as they provide the specified recovery guidance. Do not assert prose text or prescribe fixture/harness implementation.
No automated test plan, tests, execution evidence or production change is created by this spec package.

## Readiness
READY. The clarified todo authorizes the column and routine constraint selections above. No blocking product ambiguity remains. Adapting versus retiring prototype APIs is intentionally deferred and does not authorize work in this TODO.
