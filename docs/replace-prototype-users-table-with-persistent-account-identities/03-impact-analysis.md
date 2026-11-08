# Impact analysis — Replace prototype users with accounts

Todo: TODO-b505a997
Repository: /Users/sadde/ticket-db-dev

## Functional Impact
### In scope
Fresh account-table initialization; id INTEGER PRIMARY KEY; required display_name, unique email, password_hash and one employee/technician/administrator role; old-schema rejection without loss; repeated replacement initialization preserving records.

### Out of scope / unchanged
Authentication, hashing flows, account routes/UI, prototype CRUD adaptation/retirement, ticket/related schema, technician profiles, Java conversion, incidents.dat deletion, seeds and general migration infrastructure.

### User-visible changes
The standalone initializer produces account-capable users rather than the CRUD prototype table. Existing prototype databases fail setup with backup/explicit-reset guidance instead of being silently accepted or modified. No end-user feature is delivered.

### Cross-feature dependencies
Consumes the initialization foundation in database/connection.js and database/initialize.js. Account integration and future ticket references consume users(id) and the concrete field/role contract. Do not modify dependency metadata or create follow-up work in this packaging.

## Technical Impact
### Source evidence and impacted areas
- database/connection.js currently resolves checkout-root database.db, enables connection-local foreign keys and runs prototype CREATE TABLE IF NOT EXISTS.
- database/initialize.js calls openDatabase, closes on success and reports rejected setup via nonzero exit status.
- server.js also consumes openDatabase but retains legacy INSERT users(name,email), SELECT *, email UPDATE and DELETE routes.
- package.json exposes db:init; README.md documents the current old schema.
- tests/sqlite-initialization.test.cjs asserts old columns, AUTOINCREMENT non-reuse and successful old-shape inserts. Those schema/API assumptions must be reconciled, not treated as unchangeable compatibility requirements.
Likely edits are bounded shared schema preparation, initialization error propagation/documentation, and affected SQLite tests. Exact helper layout remains implementation-selected.

### Interfaces/contracts
Replacement users(id, display_name, email, password_hash, role); three lower-case scalar role values. No new foreign keys, extra identity names, role join table, normalization or hash algorithm. Retain connection/path responsibilities and standalone invocation.

### Storage implications
Ordinary SQLite constraints supply non-NULL required values, email uniqueness and allowed roles. A fresh schema replaces the definition prospectively; it does not transform existing prototype tables. Detect the old shape and stop without deleting or migrating data. Valid replacement data survives reinitialization.
Password-hash storage alone cannot verify that a supplied string is cryptographically hashed; credential creation/verification is deferred.

### Integration touchpoints
Shared setup means prototype schema rejection also reaches server startup. Routes are intentionally unchanged: legacy creation cannot satisfy the replacement schema. API adaptation or retirement must be resolved in its own scope, not by loosening account constraints or adding compatibility columns.

### Test impact surfaces
Fresh key/field/constraint behaviour; safe old-schema rejection with records and schema preserved; repeat replacement preservation and usability. Update obsolete fixtures/assertions only where this intentional delta invalidates them, retaining applicable lifecycle/path/enforcement proof. Do not demand the previous standalone AUTOINCREMENT non-reuse guarantee: the clarified contract is id INTEGER PRIMARY KEY.
Use temporary data and meaningful database operations, not actual project files, wording checks, broad regressions or new application APIs. Existing native sqlite3 dependency is sufficient; no production hashing dependency is needed for a schema-only task.

## Risks & Unknowns
- Existing project database may still have prototype schema. Permission to discard it is not authorization for automatic deletion in this task.
- CREATE TABLE IF NOT EXISTS alone cannot detect or repair incompatibility.
- Old API/browser assumptions are a known deferred integration gap; do not hide it in docs or claim a working account UI.
- Current untracked initialization spec artifacts are unrelated and must be preserved.
- No account normalization, empty-string validation, hash-format gates or additional roles are agreed.
- No blocking unknowns; adaptation versus retirement remains a later integration decision.

## Implementation Readiness Verdict
READY — clarified requirements settle historical discovery questions and allow concrete schema choices. This package performs no application edits, schema execution, deletion, tests, commit, merge or push.
