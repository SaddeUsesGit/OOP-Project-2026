# OOP-Project-2026

Two independent application surfaces:
- Java 21 incident management: `IncidentManagement/*.java`.
- Node/Express/SQLite web application: `server.js`, `app.js`, `index.html`.

## SQLite initialization

Install the declared web dependencies with `npm ci`, then run:

```sh
npm run db:init
```

This creates/opens this checkout's root `database.db` and closes the connection
without starting Express. A fresh database gets the account table:

- `id INTEGER PRIMARY KEY`: stable account identity; SQLite assigns it when omitted.
- `display_name TEXT NOT NULL`
- `email TEXT NOT NULL UNIQUE`: sign-in identifier using ordinary SQLite uniqueness.
- `password_hash TEXT NOT NULL`: stores a hash supplied by future credential work,
  not plaintext; initialization does not hash passwords or create accounts.
- `role TEXT NOT NULL`: exactly one of `employee`, `technician`, `administrator`.

Repeating initialization preserves replacement-schema accounts and their IDs.
An old `users(id, name, email)` prototype table, even empty, causes an unsuccessful
exit with backup/fresh-start guidance. Its table and records are not changed;
there is no automatic migration or reset.

For a **deliberate manual fresh start**, stop the server and any other database
users, back up `database.db` together with any `database.db-wal`, `database.db-shm`
or `database.db-journal` sidecars, and explicitly move that database set out of the
checkout. Only then rerun initialization to create an empty account database.
Keep the backup if the old data is needed; do not remove sidecars while clients
are using the database.

From another working directory, use the checkout's absolute entry-point path:

```sh
node /absolute/path/to/checkout/database/initialize.js
```

The server uses the same database and prepared connection setup. Running
`node /absolute/path/to/checkout/server.js` also prepares the account schema
before accepting requests and uses its existing startup-failure path on prototype
incompatibility. The prototype browser CRUD and `/api/users` integration remain
unchanged and are not compatible account-creation interfaces; their adaptation,
authentication, credential creation and role enforcement are deferred. Every opened connection enables foreign-key
enforcement separately; this setting is not permanently stored in the file.
No ticket tables or Java persistence changes are included.

See [Development and verification](docs/development.md) for Java prerequisites,
Maven Wrapper setup, test placement, focused selectors, execution evidence,
and surface-conditional worktree preparation. Java-only work does not need npm
dependencies or a running web server.
