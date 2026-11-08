'use strict';
// Run: node --test --test-reporter=tap tests/sqlite-accounts.test.cjs
// Diagnostic actionability is inspected from failing initializer output, not wording assertions.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFile } = require('node:child_process');
const sqlite3 = require('sqlite3');
const project = path.resolve(__dirname, '..');
const observer = path.join(__dirname, 'helpers/sqlite-observer.cjs');
const replacement = `CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('employee','technician','administrator'))
)`;

async function fixture(t) {
  const home = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'sqlite-accounts-')));
  t.after(() => fs.rm(home, { recursive: true, force: true }));
  const root = path.join(home, 'checkout');
  await fs.mkdir(root);
  await fs.cp(path.join(project, 'database'), path.join(root, 'database'), { recursive: true });
  return { home, root, file: path.join(root, 'database.db'), sequence: 0 };
}

async function sql(file, action) {
  const db = await new Promise((resolve, reject) => {
    const connection = new sqlite3.Database(file, error => error ? reject(error) : resolve(connection));
  });
  const api = {
    all: (statement, args = []) => new Promise((resolve, reject) => db.all(statement, args, (e, rows) => e ? reject(e) : resolve(rows))),
    run: (statement, args = []) => new Promise((resolve, reject) => db.run(statement, args, function (e) {
      e ? reject(e) : resolve({ id: this.lastID, changes: this.changes });
    }))
  };
  try { return await action(api); }
  finally { await new Promise((resolve, reject) => db.close(e => e ? reject(e) : resolve())); }
}

async function initialize(context) {
  const trace = path.join(context.home, `trace-${++context.sequence}.jsonl`);
  const result = await new Promise((resolve, reject) => {
    execFile(process.execPath, [path.join(context.root, 'database/initialize.js')], {
      cwd: context.home, timeout: 10000,
      env: { ...process.env, NODE_PATH: path.join(project, 'node_modules'),
        NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --require=${observer}`.trim(),
        SQLITE_TEST_TRACE: trace }
    }, (error, stdout, stderr) => {
      if (error && (error.killed || typeof error.code !== 'number')) return reject(error);
      resolve({ code: error ? error.code : 0, stdout, stderr });
    });
  });
  const events = (await fs.readFile(trace, 'utf8')).trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
  const opened = events.filter(e => e.kind === 'open');
  assert.ok(opened.length > 0, 'Initializer must open SQLite');
  for (const open of opened) {
    assert.equal(open.file, context.file);
    assert.ok(events.some(e => e.kind === 'close' && e.pid === open.pid && e.file === open.file && e.ok),
      'Initializer must close its connection, including on rejection');
  }
  return result;
}

async function schema(db) {
  const columns = await db.all('PRAGMA table_info(users)');
  const indexes = [];
  for (const index of await db.all('PRAGMA index_list(users)')) {
    indexes.push({ ...index, columns: await db.all(`PRAGMA index_info("${index.name.replaceAll('"', '""')}")`) });
  }
  return { columns, indexes };
}

async function assertAccountShape(db) {
  const { columns, indexes } = await schema(db);
  assert.deepEqual(columns.map(c => ({ name: c.name, type: c.type, pk: c.pk, required: c.notnull })), [
    { name: 'id', type: 'INTEGER', pk: 1, required: 0 },
    { name: 'display_name', type: 'TEXT', pk: 0, required: 1 },
    { name: 'email', type: 'TEXT', pk: 0, required: 1 },
    { name: 'password_hash', type: 'TEXT', pk: 0, required: 1 },
    { name: 'role', type: 'TEXT', pk: 0, required: 1 }
  ], 'users must expose the replacement account fields, not prototype fields');
  assert.ok(indexes.some(i => i.unique === 1 && i.columns.length === 1 && i.columns[0].name === 'email'));
}
const insert = (db, values) => db.run(
  'INSERT INTO users(display_name,email,password_hash,role) VALUES (?,?,?,?)', values);
const account = ['Example account', 'account@example.invalid', 'supplied-opaque-hash', 'employee'];

test('freshInitializerStoresAccountWithGeneratedStableId', async t => {
  const context = await fixture(t);
  const result = await initialize(context);
  assert.equal(result.code, 0, result.stderr);
  await sql(context.file, async db => {
    await assertAccountShape(db);
    const saved = await insert(db, account);
    assert.ok(Number.isInteger(saved.id));
    const expected = [{ id: saved.id, display_name: account[0], email: account[1], password_hash: account[2], role: account[3] }];
    assert.deepEqual(await db.all('SELECT * FROM users'), expected);
    assert.deepEqual(await db.all('SELECT * FROM users WHERE id=?', [saved.id]), expected);
  });
});

test('accountConstraintsRejectInvalidWritesAndAllowEverySupportedRole', async t => {
  const context = await fixture(t);
  assert.equal((await initialize(context)).code, 0);
  await sql(context.file, async db => {
    // A missing account schema is the behavioral prerequisite failure, not a fixture SQL error.
    await assertAccountShape(db);
    await insert(db, account);
    const initial = await db.all('SELECT * FROM users ORDER BY id');
    const invalid = account.map((_, index) => {
      const values = [...account];
      values[1] = `null-${index}@example.invalid`;
      values[index] = null;
      return values;
    });
    invalid.push(['Duplicate', account[1], 'another-hash', 'technician']);
    invalid.push(['Unsupported', 'unsupported@example.invalid', 'another-hash', 'owner']);
    for (const values of invalid) {
      await assert.rejects(insert(db, values), e => e.code === 'SQLITE_CONSTRAINT');
      assert.deepEqual(await db.all('SELECT * FROM users ORDER BY id'), initial);
    }
    for (const role of ['employee', 'technician', 'administrator']) {
      const values = [role, `${role}@example.invalid`, `opaque-${role}`, role];
      const saved = await insert(db, values);
      assert.deepEqual(await db.all('SELECT display_name,email,password_hash,role FROM users WHERE id=?', [saved.id]),
        [{ display_name: values[0], email: values[1], password_hash: values[2], role }]);
    }
  });
});

for (const populated of [false, true]) {
  test(populated ? 'populatedPrototypeIsRejectedWithoutDataLoss' : 'emptyPrototypeIsRejectedWithoutDataLoss', async t => {
    const context = await fixture(t);
    await sql(context.file, async db => {
      await db.run('CREATE TABLE users(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE)');
      if (populated) await db.run('INSERT INTO users(id,name,email) VALUES (41,?,?)', ['Kept account', 'kept@example.invalid']);
    });
    const before = await sql(context.file, async db => ({ schema: await schema(db), rows: await db.all('SELECT * FROM users') }));
    const bytes = await fs.readFile(context.file);
    const result = await initialize(context);
    // Make diagnostics available for semantic review without asserting any prose wording.
    t.diagnostic(JSON.stringify(result));
    const after = await sql(context.file, async db => ({ schema: await schema(db), rows: await db.all('SELECT * FROM users') }));
    assert.deepEqual(after, before);
    assert.deepEqual(await fs.readFile(context.file), bytes);
    assert.notEqual(result.code, 0, 'Standalone initialization must reject the prototype schema');
    assert.ok((result.stdout + result.stderr).trim().length > 0, 'Failure must provide a diagnostic');
  });
}

test('repeatInitializerPreservesReplacementAccountsAndWritableSchema', async t => {
  const context = await fixture(t);
  await sql(context.file, async db => {
    await db.run(replacement);
    await db.run('INSERT INTO users(id,display_name,email,password_hash,role) VALUES (41,?,?,?,?)', account);
  });
  const before = await sql(context.file, async db => ({ schema: await schema(db), rows: await db.all('SELECT * FROM users') }));
  const result = await initialize(context);
  assert.equal(result.code, 0, result.stderr);
  await sql(context.file, async db => {
    await assertAccountShape(db);
    assert.deepEqual({ schema: await schema(db), rows: await db.all('SELECT * FROM users') }, before);
    const values = ['Later account', 'later@example.invalid', 'later-hash', 'administrator'];
    const saved = await insert(db, values);
    assert.notEqual(saved.id, 41);
    assert.deepEqual(await db.all('SELECT * FROM users WHERE id=?', [saved.id]),
      [{ id: saved.id, display_name: values[0], email: values[1], password_hash: values[2], role: values[3] }]);
    // CHECK remains effective, not just the PRAGMA-visible columns/indexes.
    await assert.rejects(insert(db, ['Invalid', 'invalid@example.invalid', 'hash', 'owner']), e => e.code === 'SQLITE_CONSTRAINT');
  });
});
