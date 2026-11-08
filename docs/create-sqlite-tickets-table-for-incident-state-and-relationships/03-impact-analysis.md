# Impact analysis — SQLite tickets current state

Todo: TODO-dda0407f
Repository: /Users/sadde/ticket-db-dev
Readiness: READY

## Functional Impact

### In scope
SQLite tickets current-state identity; required reporter/category/service links; nullable assigned-technician/verifier/closer links; required description, low/medium/high impact and urgency, and caller-supplied four-value service-criticality snapshot.
Nullable P1–P4 priority; six-value status defaulting to open; required creation time; nullable assigned/resolved/verified/closed times, resolution/closure summaries and response/resolution SLA deadline snapshots.
Preserve existing parents and tickets on repeat initialization.

### Out of scope / unchanged
Ticket API/UI, assignment/authorization/eligibility, transition/completion rules, priority/SLA calculation, external policy persistence, child/history/communications records, notifications/reporting, account management, Java persistence and live-data migration/reset.

### User-visible behavior changes
No end-user interface or ticket workflow. Later workflows gain persistent current state, parent integrity and independently stored snapshots.
Parent/configuration changes do not automatically rewrite historical criticality or deadline values.

### Cross-feature dependencies
Existing users(id), incident_categories(id), it_services(id) in shared setup; future workflows/child records consume tickets(id).
Separate callers/calculators supply the service snapshot, priority and SLA deadlines. No policy FK/table or dependency metadata change.
The clarified todo supersedes discovery's open questions and the earlier NEEDS_CLARIFICATION artifacts.

## Technical Impact

### Evidence and impacted areas
- `database/connection.js`: creates established parent tables, enables foreign keys, resolves checkout-root database.db and rejects prototype users. No tickets definition is present in inspected source; add shared table preparation after the existing parents without altering them.
- `database/initialize.js`: invokes shared setup and closes without Express; retain this lifecycle.
- `server.js`: consumes shared readiness before listening; no ticket endpoint or authentication change is needed.
- `package.json`: existing CommonJS/sqlite3 setup and db:init are sufficient; no runtime dependency or runner acquisition is specified.
- `README.md`, `docs/development.md`: later initialization documentation should describe the new contract and focused isolated SQLite coverage.
- `tests/sqlite-initialization.test.cjs`: useful temporary database/path/lifecycle patterns; some old CRUD-success assumptions are an unrelated known mismatch, not a reason to restore retired routes.
- `IncidentManagement/Incident.java`: free-form legacy status, names and serialized embedded history; unchanged and not the authority for this SQL model.
- `docs/create-sqlite-tickets-table-for-incident-state-and-relationships/01-discovery-handoff.md`: feature boundaries; current todo resolves its earlier choices.
This package changes documentation and todo context only, not production setup.

### Interfaces/contracts affected
New tickets(id) primary identity; six parent foreign keys, with three required and three nullable.
Fixed structured enums: impact/urgency low/medium/high; criticality low/medium/high/critical; nullable priority P1/P2/P3/P4; status open/assigned/in_progress/resolved/verified/closed, default open.
created_at required and caller-supplied; later lifecycle times, both summaries and SLA deadlines nullable.
Default SQLite NO ACTION relationships; no cross-table role checks, cascades or event/status gates.
Full names, types, defaults and constraints are specified in `02-feature-spec.md`.

### Data/storage implications
All snapshots are ordinary persisted ticket values, not computed joins.
Service-criticality capture is caller-owned and required at insertion; no copy trigger or continuous equality check.
Priority and deadlines allow NULL pending separately scoped calculation; no default targets/algorithm.
Use consistent UTC ISO-8601 TEXT timestamps without a format/chronology validation framework.
Required fields mean non-NULL, not new empty-string/length/normalization rules.
Repeated setup must preserve parents, tickets, summaries and snapshots. No existing-table migration framework is added.

### Integration touchpoints
Shared setup keeps standalone initialization/server schema behavior aligned.
Preserve checkout-root file selection, connection-local foreign keys, no-HTTP standalone completion and old-user-schema rejection.
Later audit can reference ticket identity and summary changes; no child schema is introduced.
Later policy persistence/calculation/revision remains external and separately specified.

### Test impact surfaces
Fresh creation and usable identity; FK enforcement with valid/invalid/non-NULL/NULL references; required inputs and status omission/default versus explicit NULL; enum acceptance/rejection; nullable future values and summary/timestamp/deadline round trips; service snapshot independence; persisted deadlines and parent/ticket preservation on repeat setup.
Use temporary data only. No working database, exact prose tests, source-text proof, invented policy integration, transition rules or unrelated account/Java regression expansion.
Existing Node SQLite coverage conventions can inform preparation; this package does not author the canonical plan, tests or execution evidence.

## Risks & Unknowns

- OPEN-01 resolved: required impact/urgency low/medium/high; priority nullable P1–P4, no algorithm or fixed target durations.
- OPEN-02 resolved: six agreed statuses, omitted status defaults open; explicit NULL is invalid, with no transition graph.
- OPEN-03 resolved: description and caller-supplied criticality snapshot required; four nullable event timestamps and both nullable summaries stored on tickets.
- Timestamp encoding/names are routine selections in the spec, not open product questions.
- External SLA persistence/calculation/revision contracts remain separate and must not be invented here.
- Keep schema CHECKs separate from future authorization/transition/completion logic.
- Existing users/category/service records must survive setup; no reset/migration permission is implied.
- Preserve locally modified database.db/node_modules metadata and unrelated spec packages.
- No blocking implementation-relevant unknown remains.

## Implementation Readiness Verdict

READY — current todo resolves all material discovery/draft ambiguities. The feature spec and JSONL now define the same complete table contract.
No production changes, database execution, tests, merge or push are performed by specification packaging.
