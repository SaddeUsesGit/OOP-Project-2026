# Discovery handoff: incident categories and IT services parent tables

Todo: TODO-f4b8685e  
Repository: `/Users/sadde/ticket-db-dev`  
Status: agreed discovery; field definitions and the business-criticality scale are not yet specified.

## Outcome and decisions

Create two SQLite parent tables that future tickets can reference: `incident_categories` for configurable incident classifications and `it_services` for administrator-managed affected services with business criticality available to later priority determination. Each table needs a stable record identity suitable for a future ticket foreign key. Fresh standalone initialization creates both tables **empty**, without default records. The project statement's category and service examples are illustrative, not a mandatory or exhaustive seed set.

## Feature map

| Candidate and priority | User outcome | In this table task | Out of this task | Dependencies |
| --- | --- | --- | --- | --- |
| Configurable incident categories — **now** | Persistent classifications can be referenced by future tickets, and adding a category need not require major code changes. | Empty-on-initialization `incident_categories` parent table with stable record identities. | Seeded examples, administrator UI/API, category-management workflows and the tickets table. | Existing standalone SQLite initialization; later setup or management work to add records and later ticket integration to reference them. |
| IT services with business criticality — **now** | Persistent affected-service identities and criticality values are available for later ticket-priority determination. | Empty-on-initialization `it_services` parent table with stable identities and business-criticality representation. | Seeded examples, administrator UI/API, service-management workflows, priority calculation and the tickets table. | Existing SQLite initialization; criticality scale to settle during specification; later setup/management and ticket integration. |
| Management and ticket consumption — **next, separate work** | Administrators can maintain the records and ticket workflows can select and reference them. | No interface or workflow in this parent-table task. | Category/service management, ticket selection and references. | Parent-table identity and data contracts. |
| SLA policy persistence — **later, separate decision** | Administrator-configurable, persistent response and resolution targets can vary by service and priority. | No SLA storage or policy table in this task. | Choosing SQLite versus another persistent mechanism, creating `sla_policies`, and SLA monitoring. | Explicit storage choice before specifying a policy table. |

## UX intent

This parent-table task delivers no administrator screen or ticket UI. Newly initialized databases contain empty category and service lists until separately scoped setup or management work adds records. No examples become defaults.

## Boundaries and unresolved specification choices

- Clarify category and service fields and constraints, and the service business-criticality scale, before implementation. The empty-table seed policy is settled. Do not treat example category/service lists or example SLA targets as fixed requirements.
- Use the existing standalone SQLite initialization path; preserve account records and other working database data. Use temporary databases for tests.
- Do not create tickets or child tables, administrator UI/API, priority calculation, category/service-management workflows, technician profiles or SLA policy storage in this work.
- Do not alter Java persistence, delete `incidents.dat` or prototype data as a side effect, or add unrelated migration infrastructure. Keep Auto Merge off and preserve unrelated work.

## Repository context

At handoff inspection, `database/connection.js` opens checkout-relative `database.db`, enables foreign keys per connection, detects the old prototype `users` schema, and creates the replacement `users` table when absent. `database/initialize.js` uses that shared connection without Express. The existing checkout also contains a database file and unrelated generated/artifact paths; no live data or other files are to be deleted or changed as a side effect of handoff. Git status has not been established by this source read; check it before staging.
