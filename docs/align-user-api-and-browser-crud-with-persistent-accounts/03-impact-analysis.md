# Impact analysis — User API/browser account alignment

Todo: TODO-afef0785
Repository: /Users/sadde/ticket-db-dev
Blocked by: TODO-b505a997
Specification readiness: READY

## Functional Impact
### In scope
Retire all four prototype account CRUD operations through direct HTTP and the browser. Add existing-account email/password verification, browser-session authentication, active display name/role, failure indication, sign-out and no-secret-disclosure behaviour.

### Out of scope / unchanged
Public registration or account management, ticket permissions/workflows, parent/child schema creation, Java persistence, migration/reset/data deletion, OAuth, recovery and general security infrastructure.

### User-visible behaviour changes
The CRUD database panel is replaced by a signed-out sign-in form or signed-in identity/role and sign-out action. The three supported roles can sign in but receive no account-management capability. Refresh/navigation retains an active session; sign-out and a new browser session show signed-out state.

### Cross-feature dependencies
Account foundation TODO-b505a997 supplies users(id, display_name, email, password_hash, role), with three scalar roles and unique email. Its Write Spec resolves the handoff's earlier column uncertainty. Execution remains blocked on its implementation; this packaging changes no dependency metadata.

## Technical Impact
### Evidence and impacted code
- server.js still exposes POST/GET/PUT /api/users and DELETE /api/users/:id; GET uses SELECT * and writes assume prototype name/email.
- server.js serves express.static(__dirname), including repository files; that cannot remain a path to credential-bearing database content.
- app.js registers create/update/refresh/delete handlers and fetches all records on load.
- index.html presents the CRUD forms/table; replace these with the agreed sign-in/session states.
- database/connection.js and database/initialize.js are shared setup/standalone authorities, not schema responsibilities of this integration.
- package.json declares Express/sqlite3 and db:init, but no auth/browser-testing dependencies; root npm test remains a placeholder.
- docs/replace-prototype-users-table-with-persistent-account-identities/02-feature-spec.md supplies the concrete account contract.
- docs/align-user-api-and-browser-crud-with-persistent-accounts/01-discovery-handoff.md supplies agreed retirement/sign-in scope; clarified todo supplies session lifetime and identity presentation.

### Interfaces/contracts
Retire old CRUD rather than adapting or protecting it. Provide sign-in, active-session read and sign-out behaviour with implementation-selected endpoint names. Return only active-account public fields, never password_hash or credentials. The server establishes/validates session identity against persistent accounts.

### Data/storage implications
No replacement table/schema changes. Verify compatible stored hashes; document local explicit provisioning so existing accounts can be created outside public UI/API. No auto-seeded credentials or silent live-data deletion. Session mechanism need not introduce persistent session infrastructure; credentials must not become persistent plaintext or browser storage.

### Integration touchpoints
Retain cwd-independent checkout-root database selection, per-connection foreign keys, schema readiness before route use and standalone initializer semantics. Limit static serving to intended public assets to satisfy the explicit credential confidentiality outcome.
Keep parent incompatibility handling, Java conversion and downstream ticket authorization outside this work.

### Test impact surfaces
Direct old-route refusal both signed out/in without account mutations/listing; successful existing-account sign-in for each role; unknown-email/wrong-password failure; public identity projection/no hashes; real browser form/state and absent CRUD controls; refresh/navigation continuity; sign-out invalidation; new browser-session isolation.
Reconcile old tests requiring successful prototype CRUD while preserving applicable unrelated initialization/path/enforcement checks. Use real isolated hash/account fixtures and temporary databases. Do not assert exact prose or substitute source searches for browser behaviour. API/browser runner details belong to preparation; no tests run during packaging.

## Risks & Unknowns
- Parent schema implementation is pending; do not falsely claim the source already supports account rows.
- Matching verifier and local provisioning format must be selected coherently; do not add plaintext fallback.
- A client-only identity flag is not authentication or sign-out invalidation.
- Browser restore settings can retain session cookies; document limitations without intentionally implementing persistent login.
- No account-management operations/access-control model is authorized.
- Existing untracked spec artifacts belong to other work and remain untouched.

## Implementation Readiness Verdict
READY for planning with dependency retained. Clarified intent covers retirement, identity presentation and session lifetime; routine endpoint, credential-format and session implementation choices remain open within that intent.
