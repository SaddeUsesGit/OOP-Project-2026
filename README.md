# OOP-Project-2026

Two independent application surfaces:
- Java 21 incident management: `IncidentManagement/*.java`.
- Node/Express/SQLite web application: `server.js`, `app.js`, `index.html`.

## SQLite initialization

Install the declared web dependencies with `npm ci`, then run:

```sh
npm run db:init
```

This creates/opens this checkout's root `database.db`, creates the existing
`users(id, name, email)` table if absent, and closes the connection without
starting Express. Repeating it preserves existing records and tables; it is
not a migration or reset command.

From another working directory, use the checkout's absolute entry-point path:

```sh
node /absolute/path/to/checkout/database/initialize.js
```

The server uses the same database and prepared connection setup. Running
`node /absolute/path/to/checkout/server.js` also prepares the existing users
schema before accepting requests. Every opened connection enables foreign-key
enforcement separately; this setting is not permanently stored in the file.
No ticket tables or Java persistence changes are included.

See [Development and verification](docs/development.md) for Java prerequisites,
Maven Wrapper setup, test placement, focused selectors, execution evidence,
and surface-conditional worktree preparation. Java-only work does not need npm
dependencies or a running web server.
