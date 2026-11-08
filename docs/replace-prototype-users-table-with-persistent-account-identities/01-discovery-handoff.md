# Discovery handoff: replacement users accounts

Todo: TODO-b505a997  
Repository: `/Users/sadde/ticket-db-dev`  
Status: discovery agreed; this handoff is not implementation or a frozen schema.

## Purpose and outcome

Replace the SQLite prototype `users(id, name, email)` table with a persistent account foundation for employees, technicians and administrators. Future tickets will reference stable user identities for reporter, assignee, verifier and closer; these are ticket relationships, not four columns on `users`. The prototype cannot store protected credentials or represent the needed roles. Do not preserve its schema simply for compatibility.

## Agreed decisions

- Each account has **one** employee, technician or administrator role.
- **Email address** is the sign-in identifier.
- Store password **hashes, never plaintext passwords**. This table supports later authentication and authorization; it does not implement either flow.
- SQLite is the project's intended persistent database. The user permits starting fresh and discarding prototype users data, but that is not an instruction to silently delete a live database or alter Java persistence in this work.
- Adaptation or retirement of the existing `/api/users` routes and browser CRUD belongs in a separate TODO. No decision to adapt versus retire has been made.

## Feature map

| Candidate and priority | User outcome | In this table task | Out of this task | Dependencies |
| --- | --- | --- | --- | --- |
| Stable account identity — **now** | Every employee, technician and administrator has a persistent account suitable for future ticket references. | Replacement users-table identity and account data; email as sign-in identifier. | Creating tickets or finalizing ticket foreign-key column names here. | Shared SQLite initialization; settle the account key contract before dependent ticket foreign keys. |
| Protected credentials and single-role representation — **now** | Stored accounts can support future sign-in and role-based authorization without plaintext passwords; each account has exactly one role. | Password-hash storage and representation of employee, technician or administrator role. | Login UI/API, credential verification, permission enforcement, technician skills or availability. | Later authentication and account-integration work consumes this table's contract. |
| Deliberate prototype-schema replacement — **now** | A fresh database can initialize the intended table without mistaking `CREATE TABLE IF NOT EXISTS` for an existing-database migration. | Define a safe, explicit fresh-database transition given permission to discard prototype data. | Silent deletion of working files, broad migration infrastructure and Java incident-file changes. | Current shared initializer creates the prototype table. |
| Prototype API/browser integration — **next, separate TODO** | Account-facing flows eventually work with the new account model. | No API or browser integration in this task. | Adapt or retire `/api/users` and browser CRUD; full authentication UI/API. | Depends on the replacement account identity and role contract. |

## UX intent

No new end-user interface is delivered by this table task. Email sign-in describes the later account experience, not a login flow to implement here.

## Scope and constraints for later specification

- Define a stable account primary key and its contract before ticket foreign keys are frozen. Exact column list, primary-key name/type and other account fields are **not yet finalized**.
- Specify the email identifier and single-role representation without silently adding a username, multiple roles or an entire authentication system.
- `CREATE TABLE IF NOT EXISTS` does not transform an existing `users` table. Distinguish fresh setup from handling an existing prototype database; do not silently discard user data or working files.
- Do not include tickets, ticket child tables, Java persistence replacement, unrelated migration infrastructure, or existing `/api/users` and browser CRUD integration.
- Preserve unrelated work, keep Auto Merge off, and use temporary databases for tests rather than working project data.

## Repository observations

At handoff inspection, `database/connection.js` opened checkout-root `database.db`, enabled foreign keys per connection and created the prototype `users(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE)` table. `database/initialize.js` called the shared connection outside Express; `server.js` used it and retained prototype `/api/users` routes. The prior discovery recorded three untracked Write Spec artifacts for the separate initialization TODO; that Git status has not been reverified here. Recheck repository and working data state before implementation. No files or data are to be deleted as a side effect of this handoff.
