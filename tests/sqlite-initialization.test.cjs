'use strict';
// Native Node test runner: node --test --test-reporter=tap tests/sqlite-initialization.test.cjs
// These tests add no dependency, use only disposable data and execute real entry points.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const sqlite3 = require('sqlite3');
const project = path.resolve(__dirname, '..');
const observer = path.join(__dirname, 'helpers/sqlite-observer.cjs');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fixture(t) {
  const home = await fsp.realpath(await fsp.mkdtemp(path.join(os.tmpdir(), 'sqlite-initialization-')));
  const stops = [];
  t.after(async () => {
    try { for (const stop of stops) await stop(); }
    finally { await fsp.rm(home, { recursive: true, force: true }); }
  });
  const selected = path.join(home, 'selected');
  const other = path.join(home, 'other');
  const outside = path.join(home, 'outside');
  await fsp.mkdir(outside);
  for (const folder of [selected, other]) {
    await fsp.cp(project, folder, { recursive: true, filter: source => {
      const rel = path.relative(project, source);
      const parts = rel.split(path.sep);
      return !parts.some(part => ['.git', 'node_modules', 'target'].includes(part)) &&
        !/\.(db|sqlite|sqlite3|dat)(-(wal|shm|journal))?$/.test(source);
    } });
  }
  return { home, selected, other, outside, stops };
}

function setupCommand(root) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json')));
  const names = Object.keys(manifest.scripts || {}).filter(name =>
    !/^(pre|post)/.test(name) && /init|setup/i.test(name));
  if (names.length === 1) return { executable: 'npm', args: ['--prefix', root, 'run', names[0]] };
  // Discover a documented direct Node entry point without asserting prose wording.
  const documents = ['README.md', 'docs/development.md'];
  const entries = new Set();
  for (const file of documents) {
    const filename = path.join(root, file);
    if (!fs.existsSync(filename)) continue;
    for (const match of fs.readFileSync(filename, 'utf8').matchAll(/(?:^|\n)\s*node\s+([\w./-]+\.(?:js|cjs|mjs))\s*(?:\n|$)/g)) {
      if (/init|setup/i.test(match[1]) && fs.existsSync(path.resolve(root, match[1]))) entries.add(match[1]);
    }
  }
  assert.equal(names.length > 1 || entries.size > 1, false, 'Standalone setup invocation must be unambiguous in scripts/documented commands');
  assert.equal(entries.size, 1, 'A runnable standalone SQLite setup command must be available independently of Express');
  return { executable: process.execPath, args: [path.resolve(root, [...entries][0])] };
}

function events(trace) {
  return fs.existsSync(trace) ? fs.readFileSync(trace, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line)) : [];
}

function launch(t, context, root, command, cwd) {
  const trace = path.join(context.home, `trace-${Math.random().toString(16).slice(2)}.jsonl`);
  const env = { ...process.env, NODE_PATH: path.join(project, 'node_modules'),
    NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --require=${observer}`.trim(), SQLITE_TEST_TRACE: trace };
  const child = spawn(command.executable, command.args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', data => { output += data; });
  child.stderr.on('data', data => { output += data; });
  let finished = false;
  const completion = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code, signal) => { finished = true; resolve({ code, signal }); });
  });
  completion.catch(() => {});
  const stop = async () => {
    if (!finished) {
      child.kill('SIGTERM');
      const killed = await Promise.race([completion.then(() => true), delay(2000).then(() => false)]);
      if (!killed) { child.kill('SIGKILL'); await completion; }
    }
  };
  context.stops.push(stop);
  return { trace, completion, stop, done: () => finished, output: () => output };
}

async function initialize(t, context, cwd = context.selected) {
  const command = setupCommand(context.selected);
  const proc = launch(t, context, context.selected, command, cwd);
  const result = await Promise.race([proc.completion, delay(12000).then(() => null)]);
  if (!result) { await proc.stop(); assert.fail('Standalone initialization must terminate without retaining an HTTP listener or database handle'); }
  assert.equal(result.code, 0, `Standalone setup must succeed: ${proc.output()}`);
  const observed = events(proc.trace);
  assert.equal(observed.some(event => event.kind === 'listen'), false, 'Initializer must not listen for HTTP');
  const opened = observed.filter(event => event.kind === 'open');
  assert.ok(opened.length > 0, 'Initializer must open a real SQLite connection');
  for (const open of opened) assert.ok(observed.some(event => event.kind === 'close' && event.pid === open.pid && event.file === open.file && event.ok), 'Initializer must close its connections successfully');
  return observed;
}

async function sql(file, action) {
  const db = await new Promise((resolve, reject) => {
    const connection = new sqlite3.Database(file, error => error ? reject(error) : resolve(connection));
  });
  const api = {
    all: (statement, args = []) => new Promise((resolve, reject) => db.all(statement, args, (error, rows) => error ? reject(error) : resolve(rows))),
    run: (statement, args = []) => new Promise((resolve, reject) => db.run(statement, args, function (error) { error ? reject(error) : resolve({ id: this.lastID, changes: this.changes }); }))
  };
  try { return await action(api); }
  finally { await new Promise((resolve, reject) => db.close(error => error ? reject(error) : resolve())); }
}

async function checkSchema(file) {
  return sql(file, async db => {
    const columns = await db.all('PRAGMA table_info(users)');
    assert.deepEqual(columns.map(c => ({ name: c.name, type: c.type, pk: c.pk, required: c.notnull })), [
      { name: 'id', type: 'INTEGER', pk: 1, required: 0 },
      { name: 'display_name', type: 'TEXT', pk: 0, required: 1 },
      { name: 'email', type: 'TEXT', pk: 0, required: 1 },
      { name: 'password_hash', type: 'TEXT', pk: 0, required: 1 },
      { name: 'role', type: 'TEXT', pk: 0, required: 1 }
    ]);
    const indexes = await db.all('PRAGMA index_list(users)');
    const unique = [];
    for (const index of indexes.filter(i => i.unique)) unique.push((await db.all(`PRAGMA index_info("${index.name.replaceAll('"', '""')}")`)).map(c => c.name));
    assert.deepEqual(unique, [['email']]);
    return columns;
  });
}

async function backend(t, context, cwd = context.outside) {
  const proc = launch(t, context, context.selected,
    { executable: process.execPath, args: [path.join(context.selected, 'server.js')] }, cwd);
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const listen = events(proc.trace).find(event => event.kind === 'listen');
    if (listen) return { ...proc, url: `http://127.0.0.1:${listen.port}` };
    if (proc.done()) throw new Error(`Backend launch failed: ${proc.output()}`);
    await delay(25);
  }
  await proc.stop();
  throw new Error(`Backend did not become reachable: ${proc.output()}`);
}

async function request(app, method, data) {
  const response = await fetch(`${app.url}/api/users`, { method, signal: AbortSignal.timeout(5000),
    headers: data ? { 'Content-Type': 'application/json' } : undefined,
    body: data ? JSON.stringify(data) : undefined });
  return { status: response.status, body: await response.json() };
}

function assertPrepared(observed, expected) {
  const opened = observed.filter(e => e.kind === 'open');
  const uses = observed.filter(e => e.kind === 'use');
  assert.ok(opened.length > 0);
  assert.ok(uses.length > 0, 'Application must actually use its prepared connection');
  for (const open of opened) {
    assert.equal(open.file, expected);
    const used = uses.filter(e => e.pid === open.pid && e.file === open.file);
    assert.ok(used.length > 0);
    for (const use of used) assert.equal(use.enabled, 1, 'Each real application connection must enforce foreign keys before data/schema use');
  }
}

test('standaloneFreshSetupCreatesUsersAndClosesWithoutHttp', async t => {
  const context = await fixture(t);
  await initialize(t, context);
  const database = path.join(context.selected, 'database.db');
  assert.equal(fs.existsSync(database), true);
  await checkSchema(database);
  await sql(database, async db => {
    const first = await db.run('INSERT INTO users(display_name,email,password_hash,role) VALUES (?,?,\'fixture-hash\',\'employee\')', ['first', 'first@example.invalid']);
    await assert.rejects(db.run('INSERT INTO users(display_name,email,password_hash,role) VALUES (?,?,\'fixture-hash\',\'employee\')', [null, 'missing-name@example.invalid']), e => e.code === 'SQLITE_CONSTRAINT');
    await assert.rejects(db.run('INSERT INTO users(display_name,email,password_hash,role) VALUES (?,?,\'fixture-hash\',\'employee\')', ['missing email', null]), e => e.code === 'SQLITE_CONSTRAINT');
    await assert.rejects(db.run('INSERT INTO users(display_name,email,password_hash,role) VALUES (?,?,\'fixture-hash\',\'employee\')', ['duplicate', 'first@example.invalid']), e => e.code === 'SQLITE_CONSTRAINT');
    await db.run('DELETE FROM users WHERE id = ?', [first.id]);
    const next = await db.run('INSERT INTO users(display_name,email,password_hash,role) VALUES (?,?,\'fixture-hash\',\'employee\')', ['next', 'next@example.invalid']);
    assert.ok(Number.isInteger(next.id), 'SQLite must assign an integer identity');
  });
});

test('repeatInitializationPreservesSchemaAndExistingUsers', async t => {
  const context = await fixture(t);
  const database = path.join(context.selected, 'database.db');
  await sql(database, async db => {
    await db.run('CREATE TABLE users(id INTEGER PRIMARY KEY,display_name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN (\'employee\',\'technician\',\'administrator\')))');
    await db.run('INSERT INTO users(id,display_name,email,password_hash,role) VALUES (41,?,?,\'fixture-hash\',\'employee\')', ['persisted', 'kept@example.invalid']);
  });
  const before = await checkSchema(database);
  await initialize(t, context);
  await initialize(t, context);
  assert.deepEqual(await checkSchema(database), before);
  await sql(database, async db => {
    assert.deepEqual(await db.all('SELECT id,display_name,email FROM users'), [{ id: 41, display_name: 'persisted', email: 'kept@example.invalid' }]);
    const next = await db.run('INSERT INTO users(display_name,email,password_hash,role) VALUES (?,?,\'fixture-hash\',\'employee\')', ['later', 'later@example.invalid']);
    assert.ok(next.id > 41);
  });
});

test('outsideCwdUsesOnlySelectedCheckoutDatabaseAcrossInitializerAndBackend', async t => {
  const context = await fixture(t);
  const selectedDb = path.join(context.selected, 'database.db');
  const otherDb = path.join(context.other, 'database.db');
  await sql(otherDb, async db => {
    await db.run('CREATE TABLE users(id INTEGER PRIMARY KEY,display_name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN (\'employee\',\'technician\',\'administrator\')))');
    await db.run('INSERT INTO users(display_name,email,password_hash,role) VALUES (?,?,\'fixture-hash\',\'employee\')', ['other', 'other@example.invalid']);
  });
  const otherBefore = await fsp.readFile(otherDb);
  const initial = await initialize(t, context, context.outside);
  for (const event of initial.filter(e => e.kind === 'open')) assert.equal(event.file, selectedDb);
  await sql(selectedDb, db => db.run('INSERT INTO users(display_name,email,password_hash,role) VALUES (?,?,\'fixture-hash\',\'employee\')', ['selected', 'selected@example.invalid']));
  const app = await backend(t, context);
  const read = await request(app, 'GET');
  assert.equal(read.status, 200);
  assert.deepEqual(read.body.map(row => row.email), ['selected@example.invalid']);
  await sql(selectedDb, db => db.run('INSERT INTO users(display_name,email,password_hash,role) VALUES (?,?,\'fixture-hash\',\'employee\')', ['added', 'added@example.invalid']));
  await app.stop();
  await sql(selectedDb, async db => assert.equal((await db.all('SELECT id FROM users')).length, 2));
  assert.deepEqual(await fsp.readFile(otherDb), otherBefore);
  assert.equal(fs.existsSync(path.join(context.outside, 'database.db')), false);
  for (const event of events(app.trace).filter(e => e.kind === 'open')) assert.equal(event.file, selectedDb);
});

test('initializerAndBackendPrepareTheirOwnForeignKeyConnections', async t => {
  const context = await fixture(t);
  const database = path.join(context.selected, 'database.db');
  const initial = await initialize(t, context);
  assertPrepared(initial, database);
  const app = await backend(t, context, context.selected);
  assert.equal((await request(app, 'GET')).status, 200);
  await app.stop();
  const observed = events(app.trace);
  assertPrepared(observed, database);
  assert.equal(initial.some(a => a.kind === 'open' && observed.some(b => b.kind === 'open' && b.pid === a.pid)), false);
});

test('freshBackendPreparesSharedDatabaseBeforeFirstUserRoute', async t => {
  const context = await fixture(t);
  const database = path.join(context.selected, 'database.db');
  assert.equal(fs.existsSync(database), false);
  const app = await backend(t, context);
  const read = await request(app, 'GET');
  assert.equal(read.status, 200);
  assert.deepEqual(read.body, []);
  await sql(database, db => db.run('INSERT INTO users(display_name,email,password_hash,role) VALUES (?,?,\'fixture-hash\',\'employee\')', ['first route', 'route@example.invalid']));
  const after = await request(app, 'GET');
  assert.equal(after.status, 200);
  assert.equal(after.body.length, 1);
  assert.ok(Number.isInteger(after.body[0].id));
  assert.equal(after.body[0].email, 'route@example.invalid');
  assert.equal(fs.existsSync(database), true, 'Backend must use project-root database even when launched elsewhere');
  await checkSchema(database);
  assertPrepared(events(app.trace), database);
  await app.stop();
  assert.equal(fs.existsSync(path.join(context.outside, 'database.db')), false);
});
