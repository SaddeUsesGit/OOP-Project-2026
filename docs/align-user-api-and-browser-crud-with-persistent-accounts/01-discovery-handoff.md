# Discovery handoff — user API and browser integration with persistent accounts

Todo: TODO-afef0785  
Repository: `/Users/sadde/ticket-db-dev`  
Blocking account-table todo: TODO-b505a997

## Purpose and outcome

The prototype Express `/api/users` routes and browser panel still create, list, update and delete `users(id, name, email)` records. The replacement account table is being established separately for persistent employee, technician and administrator identities. This integration retires the incompatible, unrestricted account CRUD and provides sign-in and sign-out for existing accounts without quietly introducing account management. Otherwise the browser and API would continue to operate against the wrong account contract and expose open account operations.

## Agreed feature map

### Now — retire open prototype account CRUD

- **User outcome:** Visitors can no longer use the old browser panel or `/api/users` create/list/update/delete operations based on `id`, `name` and `email` prototype assumptions.
- **In:** Retire the existing browser create/list/update/delete experience and its unrestricted API routes; align this retirement with the account-table transition.
- **Out:** Replacement administrator or self-service account management; carrying the old CRUD forward under new field names.
- **Dependencies:** Reinspect the current routes, page and worktree before implementation; coordinate with TODO-b505a997.

### Now — sign-in and sign-out for existing accounts

- **User outcome:** An existing employee, technician or administrator signs in with their email identifier and signs out, without being offered account creation or management.
- **In:** Browser sign-in/sign-out experience and corresponding API behavior against the replacement account model; verify credentials against stored password hashes without exposing hashes.
- **Out:** Registration, profile editing, account listing/deletion, administrator management, account-management access control, and ticket-workflow permissions.
- **Dependencies:** TODO-b505a997 must establish the usable account contract and a way for accounts to exist before sign-in can be exercised. It establishes email as the sign-in identifier, one employee/technician/administrator role per account, and password hashes rather than plaintext. Its exact schema names, primary key type/name and other fields are still unsettled; this handoff does not decide them.

### Later — protected account management (separate work)

- **User outcome:** If account-management operations are introduced, they have an explicitly chosen authorization model instead of inheriting unrestricted prototype CRUD.
- **In this TODO:** Nothing beyond retiring prototype CRUD; sign-in does not confer permission to reinstate account management.
- **Out of this TODO:** Selecting or implementing account-management operations and their access-control rules.
- **Dependencies:** Sign-in foundation and a separate decision about who may manage accounts.

## UX intent

Replace the generic database CRUD panel with a focused sign-in/sign-out experience for existing accounts. Do not display or imply account-management abilities. An unauthenticated visitor must not retain access to prototype CRUD. No account-viewing page or API is agreed for this work.

## Boundaries and coordination

- SQLite remains the intended persistent store. Current source inspection shows `database/connection.js` opens the checkout-root `database.db`, enables foreign keys per connection and currently creates the prototype table; `database/initialize.js` is standalone through `npm run db:init` without Express. Preserve standalone initialization while coordinating with the replacement-table work.
- The prior source inspection was not a worktree status check. At handoff, Git status showed three untracked artifacts under `docs/establish-standalone-sqlite-database-initialization/`; preserve unrelated files and recheck state before implementation.
- Prototype data may be discarded in a deliberate transition, but this integration does not authorize silently deleting `database.db` or any live file.
- Do not create the replacement users table in this integration; TODO-b505a997 owns it. Ticket and child tables, Java persistence replacement and unrelated workflows are outside scope.
- Keep Auto Merge off. This document records discovery decisions, not a final authentication protocol or implementation specification; the account contract must be resolved with the parent-table todo before downstream specification is frozen.
