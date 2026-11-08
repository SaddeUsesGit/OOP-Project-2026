# Feature specification — SQLite tickets current state

Todo: TODO-dda0407f
Repository: /Users/sadde/ticket-db-dev
Slug: create-sqlite-tickets-table-for-incident-state-and-relationships
Readiness: READY
Auto Merge: off

## Authority and sources

Primary authority is the current TODO-dda0407f: Clarified specification, Required proof, Outcome and Boundaries and open decisions.
Supporting discovery: `docs/create-sqlite-tickets-table-for-incident-state-and-relationships/01-discovery-handoff.md`.
The clarified todo supersedes the discovery questions and this package's earlier NEEDS_CLARIFICATION draft. OPEN-01–OPEN-03 are resolved, not deferred to implementation.
Repository evidence: `database/connection.js`, `database/initialize.js`, `server.js`, `package.json`, `README.md`, `docs/development.md`, `tests/sqlite-initialization.test.cjs`, and `IncidentManagement/Incident.java`.
Current parent contracts are established in shared SQLite setup. The legacy Java model is context only; its free-form status, serialized names, embedded history and title do not define new SQL fields or workflow rules.

## Outcome

Create `tickets` as the persistent current-state incident record, with a stable identity and references to established users, incident categories and IT services.
Store service criticality and calculated SLA deadlines as independent ticket snapshots. Keep repeatable history and communications in separate later work.
No ticket screen, API or end-user workflow is delivered by this table task.

## Concrete table contract

The following definition fixes names, types, nullability, supported values, relationships and the single agreed status default.
Physical column order and exact SQL formatting are not acceptance requirements.

```sql
CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY,
    reporter_id INTEGER NOT NULL REFERENCES users(id),
    category_id INTEGER NOT NULL REFERENCES incident_categories(id),
    service_id INTEGER NOT NULL REFERENCES it_services(id),
    assigned_technician_id INTEGER REFERENCES users(id),
    verifier_id INTEGER REFERENCES users(id),
    closer_id INTEGER REFERENCES users(id),
    description TEXT NOT NULL,
    impact TEXT NOT NULL CHECK (impact IN ('low', 'medium', 'high')),
    urgency TEXT NOT NULL CHECK (urgency IN ('low', 'medium', 'high')),
    service_criticality_snapshot TEXT NOT NULL
        CHECK (service_criticality_snapshot IN ('low', 'medium', 'high', 'critical')),
    priority TEXT CHECK (priority IN ('P1', 'P2', 'P3', 'P4')),
    status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'assigned', 'in_progress', 'resolved', 'verified', 'closed')),
    created_at TEXT NOT NULL,
    assigned_at TEXT,
    resolved_at TEXT,
    verified_at TEXT,
    closed_at TEXT,
    resolution_summary TEXT,
    closure_summary TEXT,
    response_due_at TEXT,
    resolution_due_at TEXT
);
```

- `id INTEGER PRIMARY KEY` is the stable identity and future ticket-linked FK target. SQLite may generate it when omitted. No AUTOINCREMENT/non-reuse guarantee is required.
- Required means NOT NULL. Do not add empty-string, description-length, whitespace-normalization or case-folding requirements.
- Enum values use the exact structured values above and ordinary SQLite comparison; do not silently normalize unsupported variants.
- SQLite CHECK permits NULL for nullable priority; NOT NULL independently rejects NULL for impact, urgency, criticality and status.
- Foreign keys retain ordinary SQLite NO ACTION behavior, with no cascade, automatic unlink or role-check trigger.
- Omitted optional fields are NULL; the status default applies when status is omitted, not when an explicit NULL is supplied.
- `created_at` is caller-supplied, with no automatic creation-time default. All other timestamps and both summaries are nullable.
- Routine timestamp encoding is UTC ISO-8601 TEXT, for example `2026-11-08T15:30:00.000Z`, consistently across creation, lifecycle and deadlines. This is a storage convention, not an extra CHECK, format-validation service, event-order constraint or time-generation workflow.
- There is no default priority, criticality, participant, deadline or summary.

## Behaviour

### TKT-01 — Shared creation and identity
Fresh initialization through existing SQLite setup creates the table above with a usable stable ticket identity.
Use shared `database/connection.js`, consumed by standalone `database/initialize.js` and server startup. Do not create a parallel initializer/datastore or automatically create tickets.
Parent records must exist before a ticket referencing them can be inserted; initialization does not seed them to bypass that requirement.

### TKT-02 — Parent-reference integrity
Reporter, category and service IDs are required and refer to users(id), incident_categories(id), it_services(id).
Assigned technician, verifier and closer are nullable user references; when supplied they must resolve to existing users.
Enforce this through existing connection-local foreign keys. Do not add participant-role columns to users, role validation in schema triggers, technician eligibility or application authorization.

### TKT-03 — Required incident inputs and nullable calculated priority
At insertion require description, impact and urgency; impact/urgency each accept low, medium or high.
Store supplied priority as P1, P2, P3 or P4, or NULL until a separate calculator supplies it.
Do not calculate priority, invent an impact/urgency/criticality matrix or tie labels to example SLA durations.

### TKT-04 — Caller-supplied service snapshot
At insertion the caller supplies service_criticality_snapshot from the selected service's current business_criticality.
The snapshot is required and accepts low, medium, high or critical.
Subsequent service changes leave existing ticket snapshots unchanged.
This table task stores the supplied value; it does not implement a ticket-creation workflow, copy trigger, live join/generated value, or comparison gate enforcing equality with the service row at every write.

### TKT-05 — Status default and lifecycle current state
Require status and created_at. Omitted status defaults to open.
Allow explicit open, assigned, in_progress, resolved, verified and closed values.
Store nullable assigned_at, resolved_at, verified_at and closed_at as timestamps for the corresponding assignment, resolution, verification and closure events.
Store nullable resolution_summary and closure_summary as current-state summaries.
Later workflows populate these values; no transition graph, event-order rule, status/participant correlation, completion gate or automatic timestamps are introduced.
In particular, explicit later statuses are not rejected merely because later fields remain NULL. History of summary/assignment changes belongs to future audit records.

### TKT-06 — Independent SLA deadline snapshots
Store response_due_at and resolution_due_at as nullable calculated snapshots; no deadline is required until separate SLA work calculates and writes it.
Later external SLA policy edits do not silently recalculate existing stored values.
No sla_policies table, sla_policy_id, policy FK, policy reader or calculation trigger.
External policy persistence, selection/calculation and explicit revision rules remain separate. Priority labels do not freeze target durations.

### TKT-07 — Non-destructive repeated initialization
Repeated initialization preserves existing parent data, tickets, identities, field values, lifecycle/summaries and criticality/deadline snapshots, plus unrelated data.
Do not reset database files, drop/rebuild tables, convert Java records, seed data, rewrite snapshots or add general migration infrastructure.
Retain checkout-root path resolution, per-connection foreign-key preparation, standalone connection close/no HTTP lifecycle and prototype-users incompatibility rejection.
This task adds the absent table; it does not broaden existing-table compatibility/migration policy.

## Integration and impacted surfaces

Later implementation primarily adds table preparation to `database/connection.js` and documents the contract in initialization guidance.
`database/initialize.js` and `server.js` already consume shared setup; they need no ticket routes or separate schema path.
No changes to account schema, account access, approved Storybook source, Java persistence, dependencies or runtime module format.
Ticket identity is the later audit/notes/messages/feedback/violation linking target; no such child tables are created here.

## Required proof and later planning guidance

Use temporary databases, never the working database or incidents.dat.
Prove observable SQLite behavior, not prose wording, source searches or exact SQL layout:
- Fresh shared setup creates a usable tickets record/identity with the agreed field contract.
- Required references and incident inputs reject missing/NULL values; optional participant references accept NULL; supplied references enforce parent integrity.
- Supported impact, urgency, priority, criticality and status values persist; unsupported enum values are rejected.
- A minimally valid insertion omitting status gets open; explicit NULL status is rejected.
- Priority, future participants, lifecycle timestamps, summaries and deadline snapshots can remain NULL, and populated values—including both summaries—round-trip.
- Changing a source service leaves the saved criticality and existing deadlines unchanged.
- Stored SLA deadline values remain independent persisted values and survive repeat setup. Observe later source changes only through mechanisms actually present; do not invent an external policy store, policy fixture API or calculation workflow just to claim integration proof.
- Repeat setup preserves parent data and previously stored tickets/snapshots.
No extra transition/event-order or authorization tests are authorized.

Existing `tests/sqlite-initialization.test.cjs` contains legacy /api/users success expectations inconsistent with already-retired CRUD. This is a pre-existing unrelated mismatch, not permission to restore CRUD or expand this schema task.
Keep independently applicable initialization/path/connection safeguards. Regression scope and test preparation remain downstream decisions; this package writes neither a test plan nor tests and runs no database command.

## Exclusions and preservation

No ticket API/UI, role-specific destinations, assignment/authorization workflows, status transitions, priority/SLA calculations, policy persistence, notifications/reporting, audit/assignment/notes/messages/feedback/violation tables, account management, Java persistence replacement, incidents.dat removal, live database conversion/reset, unrelated migrations or dependency changes.
Do not infer extra ticket title/history fields from the legacy Java class.
Preserve modified database.db and node_modules/.package-lock.json, unrelated untracked spec packages and existing source approval links. Auto Merge stays off; do not merge or push.

## Readiness

READY. Clarification resolves the business scales, status/default contract, lifecycle fields, summaries and required insertion snapshot.
Remaining external SLA/child/workflow responsibilities are intentional scope boundaries, not blockers. Routine names, timestamp representation and SQLite constraints are selected above.
This specification is implementation authority, not evidence that the table is implemented or tested.
