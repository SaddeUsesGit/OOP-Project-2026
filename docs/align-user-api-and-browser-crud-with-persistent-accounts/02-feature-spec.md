# Feature specification — Existing-account sign-in and prototype CRUD retirement

Todo: TODO-afef0785
Repository: /Users/sadde/ticket-db-dev
Slug: align-user-api-and-browser-crud-with-persistent-accounts
Specification readiness: READY
Execution dependency: TODO-b505a997 (unchanged)
Auto Merge: off

## Authority and sources
- Primary: TODO-afef0785 Outcome, Clarified specification, Required proof and boundaries, Out of scope and Dependency.
- Supporting discovery: `docs/align-user-api-and-browser-crud-with-persistent-accounts/01-discovery-handoff.md`. The clarified todo supersedes its open session-lifetime and active-account presentation questions.
- Account contract: TODO-b505a997 and `docs/replace-prototype-users-table-with-persistent-account-identities/02-feature-spec.md`. Use users(id, display_name, email, password_hash, role); roles employee, technician, administrator; one role per account. This package consumes that contract and does not create or redefine the table.
- Current evidence: `server.js`, `app.js`, `index.html`, `package.json`, `database/connection.js`, `database/initialize.js`, and `tests/sqlite-initialization.test.cjs`.

## Outcome
Visitors cannot perform prototype account CRUD, even through direct HTTP calls. Existing accounts authenticate by email and password, remain signed in through navigation/refresh within one browser session, see only their active identity/role, and can sign out. Sign-in is not account management or ticket authorization.

## Behaviour
### AUTH-01 — Retire prototype account CRUD
Retire POST /api/users, GET /api/users, PUT /api/users and DELETE /api/users/:id, and remove their browser create/list/update/delete experience. Direct requests must not list/read account records or create, change or delete them, whether signed out or signed in as any supported role.
A response indicating unavailable/retired/not found/method disallowed is acceptable; exact retirement status and prose are implementation choices. Do not redirect these paths into replacement account-management operations or expose an account list behind sign-in.
Remove the old fetch-on-load, table refresh and CRUD submission/deletion behaviour, rather than merely renaming its fields.

### AUTH-02 — Verify existing accounts
Offer email/password sign-in in the browser and corresponding API behaviour. Look up the existing persistent account and verify the supplied password against its stored password_hash using an appropriate password-hash verifier. Valid credentials for employee, technician and administrator establish the current sign-in.
Do not compare a password directly with the stored hash or treat the role/display name supplied by the browser as authoritative. Account identity and role come from SQLite.
The parent schema uses ordinary unique email values. Use the agreed stored identifier consistently; no independent case-insensitive uniqueness scheme or account-schema change is introduced here.

### AUTH-03 — Invalid credentials remain signed out
An unknown email or wrong password submitted by a signed-out visitor does not establish authentication. Show a clear failure indication and leave the visitor in the sign-in experience. API failure must not produce authenticated session state. Responses and rendered output must not expose stored hashes or plaintext credentials.
Failure indication wording is not fixed. Do not silently create an account on failed sign-in.

### AUTH-04 — Browser-session continuity and identity presentation
After successful sign-in, show the active account's display name and role and a sign-out control, without account lists or account-management controls. Navigation/refresh in the same browser session restores authenticated state through corresponding API/session behaviour, not merely a client-side flag. A signed-out visitor is shown the sign-in experience, not a stale active-account view.
Authentication is session-scoped, not a persistent remember-me feature, and does not persist into a new browser session after normal browser shutdown/restart. Do not use persistent localStorage credentials/tokens or a persistent cookie lifetime.
Endpoint names, HTTP success status and session representation remain implementation choices. A minimal server-validated session mechanism is sufficient; no general-purpose session database is mandated.
Browser restore features can independently restore session cookies. Document any such limitation; do not claim that the server can reliably observe browser shutdown. This does not authorize an intentional persistent sign-in feature.

### AUTH-05 — Sign-out ends the current sign-in
Provide corresponding API and browser sign-out behaviour. End the current authenticated session, return to signed-out presentation, and ensure subsequent session reads and refresh/navigation do not restore that ended sign-in. Do not implement sign-out as only hiding identity elements or deleting a client display flag.
No all-device logout, session-management dashboard or unrelated account controls are required.

### AUTH-06 — Keep secrets private
Return/render only an explicit public projection of the active account, such as id, display_name and role. Do not return password_hash or plaintext credentials in API payloads or browser state/output. Sign-in is for the current account, not an account-viewing/list endpoint.
Current Express static serving exposes the entire repository; ensure direct requests cannot retrieve the SQLite database or internal credential-bearing files through that path. Serve only intended public assets or equivalently restrict internal-file access. This bounded change is necessary to the requested no-secret-disclosure outcome, not a general web-hardening project.
Use protected session proof and server-side verification sufficient to identify the signed-in account; do not make a caller-supplied account ID an authentication bypass.

## Provisioning existing accounts
Sign-in needs existing rows containing supported hashes, but no public registration or management endpoint/UI is added.
Provide a documented explicit local/developer provisioning procedure with compatible password-hash generation and account insertion. It may use a small local helper or an existing supported tool; exact command/file is implementation-selected. It must not run automatically on startup, seed universal credentials, reset live data or store plaintext passwords.
Choose and document a vetted password hashing/verifying method and encoded storage format so local provisioning and API verification interoperate. Prefer existing runtime/library support where adequate. This task does not add password recovery, password changes, hash upgrades or multiple hash formats unless needed to consume an already-established account contract.

## UX contract
- Signed out: labelled email and password inputs, sign-in action and failure indication when needed. No prototype CRUD panel or registration link.
- Signed in: current display name/role and sign-out action; no account list or editing/deletion controls.
- Refresh/navigation: reflect server-validated current session rather than trusting cached browser identity.
- Failure: visible unsuccessful-sign-in state without secret values.
Layout, wording, CSS and DOM identities remain implementation choices. Use ordinary accessible forms and controls; no frontend framework conversion is required.

## Technical and data boundaries
Reuse the existing shared SQLite setup, checkout-root database.db and per-connection foreign keys. Preserve standalone npm run db:init without Express startup. Parent TODO owns schema creation and legacy-schema incompatibility handling; do not delete/reset/convert project data here.
Likely surfaces: server.js, app.js, index.html, bounded auth/session/hash support, developer documentation/local provisioning support and focused tests. Exact module layout is not prescribed.
Current account rows are durable; a general-purpose persistent session store is not required by browser-session sign-in. Use parameterized account queries and explicit response projections when consuming those rows.
Existing legacy CRUD success tests are intentionally superseded; update conflicting API portions without weakening unrelated initializer/path/enforcement proof. Keep tests isolated from working database.db/incidents.dat.

## Out of scope
Replacement users-table creation/design, new tables for tickets or other parent/child records, public account creation/management, administrator management authorization, ticket-workflow permissions, Java persistence, migration/reset infrastructure, deployment and broad security infrastructure. Do not add new rate-limit, audit, recovery, distributed-session, OAuth or all-device session requirements merely because this is authentication.
Preserve unrelated work, including existing untracked spec artifacts. Do not automatically merge or push.

## Acceptance coverage guidance
Later planning should cover direct retirement for all old operations and unchanged persisted account records; valid and invalid sign-in; all three roles; active public identity with no secrets; current-session refresh/navigation; sign-out invalidation; independent new browser sessions starting signed out; and removal of browser CRUD through actual rendered interactions.
Prove outcomes and structured state, not prose strings, source-text absence searches or documentation wording. Session lifetime needs actual browser/session mechanics, not cookie existence alone; credential verification needs real compatible hashes, not a plaintext bypass.
No browser runner is currently declared in package.json. Later test preparation must establish suitable executable browser/API coverage without inventing success or treating the existing npm test placeholder as evidence.
This spec package is not implementation, a test plan, or verification evidence.

## Risks and readiness
- Parent schema is specified but not implemented in the inspected source; keep TODO-b505a997 as execution blocker.
- Hash verification/provisioning and session mechanism must be coherently selected during implementation; routine mechanics are deliberately left open by the todo.
- Browser-controlled restore semantics require honest documentation; do not promise reliable browser-close detection.
- Repository-root static serving and SELECT * expose secrets if left unchanged.
READY for downstream planning; no unresolved product choice blocks specification. No production files, data, dependencies, branches or test execution changed in this packaging.
