# Discovery handoff: SQLite tickets table

Todo: TODO-dda0407f  
Repository: `/Users/sadde/ticket-db-dev`  
Status: agreed discovery, not a frozen table specification.

## Why this work matters

SQLite already has parent tables for user accounts, incident categories and IT services, but no ticket table to hold an incident's current state and link it to them. People reporting, handling and later reviewing incidents need a stable ticket identity and dependable references to those records. Without that foundation, future ticket workflows, history and monitoring lack a consistent record. A stored response and resolution deadline snapshot also prevents later edits to separately persisted SLA policies from silently moving an existing ticket's monitoring deadlines.

## Outcome and agreed decision

Create a SQLite `tickets` current-state table for incidents. Its stable identity supports future ticket-linked records. It references existing `users`, `incident_categories` and `it_services` parent tables. **Store each ticket's calculated response and resolution SLA deadlines as a snapshot**, rather than deriving them from the current policy at every read. SLA policy configuration is persistent but **not** an SQLite table; do not add `sla_policies` or a `sla_policy_id` foreign key. Calculation and policy storage are separate work.

## Feature map

| Candidate and priority | User outcome | In this table task | Out of this task | Dependencies |
| --- | --- | --- | --- | --- |
| Ticket identity and parent relationships — **now** | Each incident has a stable current-state record associated with its reporter, classification and affected service, and user references for technician, verifier and closer when applicable. | Ticket primary key, foreign keys to `users`, `incident_categories` and `it_services`, and current-state storage. | Ticket API/UI, authorization, technician eligibility rules and child records. | Existing parent tables; settle which references are mandatory at specification. |
| Incident lifecycle and priority state — **now** | Tickets retain description, impact/urgency and priority state, status, and relevant lifecycle, resolution and closure information. | Current-state columns and timestamps. | Priority calculation, status-transition and assignment workflows, reporting. | Settle exact fields, constraints, nullability and calculation ownership during specification; later application logic supplies and changes values. |
| Per-ticket SLA deadline snapshot — **now** | Existing ticket deadlines do not silently change when external SLA policies are edited. | Persist calculated response and resolution deadlines on each ticket. | Non-SQLite policy storage, policy selection, deadline calculation, SLA monitoring and violation events. | Define the policy-to-ticket calculation/write contract separately; settle exact snapshot field rules during specification. No SQLite policy foreign key. |
| History and integrated workflows — **next, separate work** | Audit/assignment history, notes, messages, feedback and SLA violations can be linked to tickets; application users can operate on incidents. | Stable ticket identity as the future linking target. | Child tables, API/UI, notifications, full workflows. | Ticket identity/lifecycle contract. A separate assignments table is not required if audit entries later capture changes. |

## UX intent

This is a database-table task, not a screen or user-facing ticket workflow. Later interfaces will consume ticket current state and stored SLA deadlines.

## Boundaries and specification questions

- Future tickets may reference `users` as reporter, assigned technician, verifier and closer; these roles are ticket relationships, not new `users` columns. Technician eligibility belongs to later application logic. Specify mandatory versus optional foreign keys, including category and service, before freezing the schema.
- Specify ticket fields and nullability for description, impact, urgency, priority, status, lifecycle timestamps, resolution and closure. Decide whether service business criticality is stored as a ticket snapshot or read from `it_services`, and distinguish a calculated priority value from the later service that calculates it. Do not treat earlier suggested column names or status transitions as frozen.
- Specify when deadline snapshot fields can be null and what supplies/updates them; do not silently assume a non-SQLite policy implementation or freeze example P1–P4 targets.
- Do not create audit, assignment, investigation-note, message, feedback or SLA-violation child tables here. Do not implement ticket API/UI, authorization, assignment, priority/SLA computation, notifications or reporting.
- Use existing SQLite initialization and preserve users, categories, services and other working data. Use temporary databases for tests; do not delete `incidents.dat`, change Java persistence or add unrelated migration infrastructure. Keep Auto Merge off.

## Repository observation

At handoff inspection, `database/connection.js` prepares `users`, `incident_categories` and `it_services` and enables foreign keys on each connection; `database/initialize.js` invokes that shared setup outside Express. No tickets creation was present in those files at that inspection. This is source context, not a claim about the live database's current contents. No live record may be deleted as part of handoff or verification.
