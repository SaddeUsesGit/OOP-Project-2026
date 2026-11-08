# Discovery handoff — Standalone SQLite database initialization

- Todo: TODO-c3b79fe2
- Repository: `/Users/sadde/ticket-db-dev`
- Slug: `establish-standalone-sqlite-database-initialization`

## Why this matters
The I-ITSM project is moving to SQLite as its sole database. At discovery, the Express server opens `./database.db` relative to the process working directory and creates the existing `users` table during startup. This makes database setup dependent on starting the website and risks opening a different database when launched from another directory. Before subsequent incident schema work, the team needs standalone setup that targets the same database as the server, with foreign-key enforcement on each SQLite connection. This task establishes that foundation without adding incident tables or converting Java persistence.

## Intended outcome and UX
The project team can run a straightforward standalone database setup command without launching Express. It creates or opens the same SQLite database used by the backend, then exits cleanly. Running the server from a different working directory does not select a different database. No browser UI or end-user workflow is added.

## Agreed feature map

| Candidate | Priority | User outcome | In scope | Out of scope | Dependencies |
| --- | --- | --- | --- | --- | --- |
| Standalone database setup | Now | The team can create/open the SQLite database without starting the website. | A separate initialization entry point that finishes and closes cleanly. | Incident-table design, migrations, Java persistence conversion, legacy-file deletion. | Existing Node/SQLite backend and database location. |
| One predictable database for setup and server use | Now | Setup and the website use the same database regardless of launch directory; existing user records and behavior are preserved. | Shared backend database location and connection behavior. | A competing database or changes to the current `users` schema. | Current Express server connection. |
| Reliable relational enforcement | Now | Each application and initializer connection enforces foreign keys, preparing for later relational schema. | Connection-level foreign-key enforcement. | Ticket foreign keys or parent tables in this task. | Shared connection behavior; later schema work. |
| Incident schema and persistence integration | Later, separate work | Incident records ultimately use SQLite as the sole database. | None in this task. | Tickets and related tables, Java/SQLite identity unification, replacing `incidents.dat`, existing incident-data migration. | Initialization foundation and separately agreed schema/integration scope. |

## Current context and boundaries
- At inspection, `server.js` opened `./database.db` and created `users` on server startup; the table has `id INTEGER PRIMARY KEY AUTOINCREMENT`, `name TEXT NOT NULL`, and `email TEXT NOT NULL UNIQUE`. Preserve existing user data and behavior. `CREATE TABLE IF NOT EXISTS` does not migrate an existing table.
- The selected worktree is `/Users/sadde/ticket-db-dev`; Auto Merge is off for this todo. Git status was clean at the last check, but must be rechecked before implementation or a commit. Previously reported hello-world code has not been conclusively accounted for; identify its disposition and ensure it is removed before committing anything else, without disturbing unrelated work.
- Keep this handoff limited to database initialization and connection setup. Do not add ticket or other new schema tables, Java/SQLite identity unification, incident-file deletion, or unrelated cleanup. Do not introduce `incidents.dat` as a second store.

## Handoff to later specification
Specify the observable standalone setup outcome, consistent database selection across launch directories, preservation of the existing `users` data and behavior, connection-level foreign-key enforcement, and clean completion. Keep the exact entry-point filename and implementation mechanics open unless a later decision requires them. The incident schema and Java persistence integration require separate work.
