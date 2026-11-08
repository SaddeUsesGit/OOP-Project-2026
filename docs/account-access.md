# Existing-account access

The browser is an account-access screen, not an account manager. Existing
employee, technician and administrator accounts can sign in, see their display
name/role, and sign out. There is no public registration, account list, account
editing, role-specific destination or ticket authorization in this feature.
The previously approved Storybook files remain visual review artifacts; they
are not runtime authentication.

## Explicit local provisioning

Provisioning is a deliberate write to this checkout's SQLite database. It never
runs on startup. Use a development database you intend to modify. Do not delete
or reset existing data. The initializer rejects the old prototype schema with
backup/manual-reset guidance; resolve that incompatibility explicitly first.

From the desired checkout, install declared dependencies and initialize:

```sh
npm ci
npm run db:init
```

Then, in **Bash**, collect a password without echoing it and pass it through stdin.
Choose your own display name, exact email identifier, role and password; there
are no seeded or universal credentials. Do not put passwords in command-line
arguments, shell history, source files or exported environment variables.

```bash
read -r -s -p 'Account password: ' ACCOUNT_PASSWORD
printf '\n'
printf '%s\n' "$ACCOUNT_PASSWORD" | node scripts/provision-account.js \
  --display-name 'Your Name' \
  --email 'your-address@example.invalid' \
  --role employee
unset ACCOUNT_PASSWORD
```

The role must be employee, technician or administrator. Email lookup uses the
stored identifier exactly: no trimming, lowercasing or independent uniqueness
scheme is introduced. The helper inserts one account using parameterized SQL,
reads the stored row back and verifies the generated hash using the same verifier
as sign-in. It prints only public account identity. Duplicate emails fail rather
than changing an existing account. No account-management endpoint is created.

Node's built-in `crypto.scrypt` generates/verifies
`scrypt$<32 hexadecimal salt characters>$<128 hexadecimal derived-key characters>`.
The salt is 16 random bytes, encoded as hex and passed as the scrypt salt string;
the derived key is 64 bytes. Both operations use Node's defaults
(N=16384, r=8, p=1). Verification uses `timingSafeEqual`. The database stores
only the encoded hash, not the supplied password. Unsupported/malformed hashes
do not authenticate; there is no plaintext fallback.

## Start and verify sign-in

```sh
node server.js
```

Open http://localhost:3000, sign in with the provisioned email/password, and
confirm the stored display name and role appear with sign-out. Refresh the page:
the identity should remain. Sign out, refresh again, and confirm that sign-in is
shown instead. A separate browser profile/private session starts signed out.
The helper's output contains the account ID for local inspection, not a session
credential.

## Session and API behavior

- POST /api/session accepts email/password and verifies the stored hash.
- GET /api/session returns `{account: null}` or the current public identity
  (id, display_name, email, role), fetched from SQLite.
- DELETE /api/session invalidates the current server session and clears its cookie.
- Invalid sign-in returns a generic failure without creating an account.
- All former /api/users operations, including direct calls, are retired.
- Session responses are not cacheable. Hashes and submitted passwords are not
  returned. Repository-root static serving is removed; only index.html, app.js,
  account-access.js and account-access.css are publicly served.

Sign-in uses an unpredictable token in an HttpOnly, SameSite=Lax cookie, with
no Expires or Max-Age. The token maps to an account ID in process memory; it is
not a caller-supplied identity or role. Direct HTTPS requests also use Secure
cookies. Local development uses HTTP; this is not a deployment/HTTPS setup guide.

Sessions are intentionally not persistent: server restart clears them, and no
credentials/tokens are stored in localStorage. Browser restore features may
restore session cookies after restart independently of the application. The
server cannot reliably detect browser shutdown; use explicit sign-out to end a
sign-in reliably. There is no all-device logout or persistent session database.

## Focused behavioral development check

```sh
node --test --test-reporter=tap tests/web/account-access.test.cjs
```

This runs real API and headless Chromium interactions against temporary
application/database copies. It uses the worktree's declared Playwright
installation and an available Chromium binary. Tests own their server on port
3000 and clean it up; stop a separately running development server first.
No working database is used as a fixture.
