'use strict';
// Focused invocation: node --test --test-reporter=tap tests/web/account-access.test.cjs
// Test adapter choices (not additional product requirements): /api/session uses
// POST/GET/DELETE and returns {account: null | {id, display_name, email, role}}.
// Hash vector: scrypt$<hex salt>$<hex 64-byte key>, using Node crypto defaults.
// Developer provisioning adapter: node scripts/provision-account.js
// --display-name NAME --email EMAIL --role ROLE; password supplied on stdin.
// These choices can be adapted to the eventual implementation without changing cases.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const { spawn, execFile } = require('node:child_process');
const { randomBytes, scryptSync } = require('node:crypto');
const { once } = require('node:events');
const sqlite3 = require('sqlite3');
const { chromium } = require('playwright');
const project = path.resolve(__dirname, '../..');
const roles = ['employee', 'technician', 'administrator'];
const password = 'Fixture-only-7!not-a-universal-password';
const sessionPath = '/api/session';
const accounts = roles.map((role, i) => ({ id: 41 + i, display_name: `Fixture ${i}`, email: `fixture-${i}@example.invalid`, role }));
const hash = () => {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString('hex')}`;
};
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function sql(root, statement, args = []) {
  const db = await new Promise((resolve, reject) => {
    const connection = new sqlite3.Database(path.join(root, 'database.db'), e => e ? reject(e) : resolve(connection));
  });
  try { return await new Promise((resolve, reject) => db.all(statement, args, (e, rows) => e ? reject(e) : resolve(rows))); }
  finally { await new Promise((resolve, reject) => db.close(e => e ? reject(e) : resolve())); }
}
async function fixture(t, populated = true) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'account-access-')));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  // Include new candidate source as well as tracked inputs. Never copy checkout
  // databases, sidecars, local credentials, outputs or installed dependencies.
  // Native modules resolve via NODE_PATH, without a shared dependency symlink.
  const files = await new Promise((resolve, reject) => execFile('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: project }, (e, out) => e ? reject(e) : resolve([...new Set(out.split('\0').filter(Boolean))])));
  for (const file of files) {
    if (file.startsWith('node_modules/') || file.startsWith('target/') || file.startsWith('storybook-static/')) continue;
    if (/(?:\.db(?:-.*)?|\.sqlite(?:3)?(?:-.*)?|\.dat)$/.test(file) || path.basename(file).startsWith('.env')) continue;
    await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await fs.copyFile(path.join(project, file), path.join(root, file));
  }
  const env = { ...process.env, NODE_PATH: path.join(project, 'node_modules') };
  await new Promise((resolve, reject) => execFile(process.execPath, [path.join(root, 'database/initialize.js')], { cwd: root, env }, (e, out, err) => e ? reject(new Error(err || e.message)) : resolve()));
  if (populated) for (const account of accounts) await sql(root,
    'INSERT INTO users(id,display_name,email,password_hash,role) VALUES (?,?,?,?,?)',
    [account.id, account.display_name, account.email, hash(), account.role]);
  return { root, env };
}
async function start(t, f) {
  // Existing server binds 3000. Refuse to reuse somebody else's process.
  await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject); probe.listen(3000, '127.0.0.1', () => probe.close(resolve));
  });
  const child = spawn(process.execPath, ['server.js'], { cwd: f.root, env: f.env, stdio: ['ignore', 'pipe', 'pipe'] });
  let diagnostic = '';
  child.stdout.on('data', b => { diagnostic += b; }); child.stderr.on('data', b => { diagnostic += b; });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit'); child.kill('SIGTERM'); await exited;
    }
  });
  const base = 'http://127.0.0.1:3000';
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(`Server startup failed: ${diagnostic}`);
    try { const response = await fetch(base); if (response.status < 500) return base; } catch {}
    await delay(50);
  }
  throw new Error(`Server readiness unavailable: ${diagnostic}`);
}
async function browser(t, base) {
  const instance = await chromium.launch({ headless: true });
  t.after(() => instance.close());
  const context = await instance.newContext({ baseURL: base });
  const page = await context.newPage();
  await page.goto('/');
  return { instance, context, page };
}
async function request(context, method, url, data) {
  return context.request.fetch(url, { method, data });
}
async function active(context) {
  const response = await request(context, 'GET', sessionPath);
  assert.ok(response.ok(), 'Current-session capability must respond successfully');
  const data = await response.json();
  assert.ok(Object.hasOwn(data, 'account'), 'Current-session response must describe active or absent identity');
  return data.account;
}
async function assertPublicResponse(response, f) {
  const payload = await response.json();
  const saved = await rows(f);
  const visit = value => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      assert.ok(!['password', 'password_hash'].includes(key), 'Account-access responses must not expose credential fields');
      visit(child);
    }
  };
  visit(payload);
  const wire = JSON.stringify(payload);
  assert.ok(!wire.includes(password), 'Account-access responses must not echo submitted credentials');
  for (const record of saved) assert.ok(!wire.includes(record.password_hash), 'Account-access responses must not expose stored hashes');
  return payload;
}
async function login(context, account, f) {
  const response = await request(context, 'POST', sessionPath, {
    email: account.email, password, id: 999, display_name: 'Spoofed', role: 'owner'
  });
  assert.ok(response.ok(), 'Existing account credentials must establish sign-in');
  assert.deepEqual((await assertPublicResponse(response, f)).account, account);
  assert.deepEqual(await active(context), account);
  await assertPublicResponse(await request(context, 'GET', sessionPath), f);
}
async function signedOut(page) {
  assert.equal(await page.locator('input[type=password]').count(), 1, 'Signed-out browser must offer password sign-in');
  assert.equal(await page.locator('input[type=email]').count(), 1);
  assert.equal(await page.locator('.account-access__name').count(), 0);
}
async function publicPresentation(page, account) {
  // Values are fixture identities/role enums, not prescribed prose.
  assert.equal(await page.locator('.account-access__name').textContent(), account.display_name);
  assert.equal(await page.locator('.account-access__role').textContent(), account.role);
  assert.equal(await page.locator('button[type=button]').count(), 1, 'Active account needs sign-out control');
  assert.equal(await page.locator('input[type=password]').count(), 0);
}
async function submit(page, account, suppliedPassword = password) {
  await signedOut(page);
  await page.locator('input[type=email]').fill(account.email);
  await page.locator('input[type=password]').fill(suppliedPassword);
  const response = page.waitForResponse(r => r.url().endsWith(sessionPath) && r.request().method() === 'POST');
  await page.locator('form button[type=submit]').click();
  await response;
  // Wait for application processing without prescribing success/failure wording.
  await page.waitForFunction(() => !document.querySelector('input[type=password]') || document.querySelector('[role=alert]'));
}
async function noCrud(page) {
  assert.equal(await page.locator('#createForm,#updateForm,#fetchDataBtn,#dataTableBody,table').count(), 0,
    'Retired account-management controls must be absent');
  assert.equal(await page.locator('input[type=number],input[name=username],input[name=id]').count(), 0);
}
async function rows(f) { return sql(f.root, 'SELECT * FROM users ORDER BY id'); }

test('retiredCrudCannotReadOrMutateAccountsInAnySignInState', async t => {
  const f = await fixture(t); const base = await start(t, f);
  const { instance, context } = await browser(t, base);
  const before = await rows(f);
  for (const account of [null, ...accounts]) {
    const ctx = account ? await instance.newContext({ baseURL: base }) : context;
    if (account) await login(ctx, account, f);
    for (const [method, url, data] of [
      ['POST', '/api/users', { username: 'Injected', useremail: 'injected@example.invalid' }],
      ['GET', '/api/users'], ['GET', `/api/users/${accounts[0].id}`],
      ['PUT', '/api/users', { id: accounts[0].id, email: 'changed@example.invalid' }],
      ['DELETE', `/api/users/${accounts[0].id}`]
    ]) {
      const response = await request(ctx, method, url, data);
      const type = response.headers()['content-type'] || '';
      if (type.includes('application/json')) {
        const value = await response.json();
        assert.ok(!Array.isArray(value), 'Retired API must not return an account list');
        const inspect = node => {
          if (!node || typeof node !== 'object') return;
          assert.ok(!('email' in node || 'password_hash' in node || 'display_name' in node),
            'Retired API must not return an account record');
          for (const child of Object.values(node)) inspect(child);
        };
        inspect(value);
      }
      assert.deepEqual(await rows(f), before, 'Retired API must not change persistent accounts');
    }
    if (account) await ctx.close();
  }
});

test('browserRemovesCrudAndItsLoadInteractionsInBothStates', async t => {
  const f = await fixture(t); const base = await start(t, f);
  const { context, page } = await browser(t, base);
  const crudRequests = [];
  page.on('request', r => { if (new URL(r.url()).pathname.startsWith('/api/users')) crudRequests.push(r.url()); });
  await page.reload(); await noCrud(page); await signedOut(page);
  assert.equal(crudRequests.length, 0, 'Signed-out page must not fetch accounts');
  await submit(page, accounts[0]); await publicPresentation(page, accounts[0]); await noCrud(page);
  await page.reload(); await noCrud(page);
  assert.equal(crudRequests.length, 0, 'Signed-in page must not restore account CRUD');
  assert.deepEqual(await active(context), accounts[0]);
});

test('allRolesSignInUsingStoredPublicIdentityAndHashedPassword', async t => {
  const f = await fixture(t); const base = await start(t, f);
  const { instance } = await browser(t, base);
  for (const account of accounts) {
    const api = await instance.newContext({ baseURL: base });
    await login(api, account, f); await api.close();
    const ctx = await instance.newContext({ baseURL: base }); const page = await ctx.newPage();
    await page.goto('/'); await submit(page, account);
    await publicPresentation(page, account); await noCrud(page);
    assert.deepEqual(await active(ctx), account);
    // Browser must not render credentials even outside the identity fields.
    const content = await page.locator('body').textContent();
    const saved = (await rows(f)).find(a => a.id === account.id);
    assert.ok(!content.includes(saved.password_hash) && !content.includes(password));
    await ctx.close();
  }
});

test('invalidCredentialsShowFailureWithoutSessionOrNewAccount', async t => {
  const f = await fixture(t); const base = await start(t, f); const before = await rows(f);
  const { instance } = await browser(t, base);
  for (const [account, secret] of [[{ email: 'unknown@example.invalid' }, password], [accounts[0], 'wrong-password']]) {
    const ctx = await instance.newContext({ baseURL: base }); const page = await ctx.newPage(); await page.goto('/');
    const response = await request(ctx, 'POST', sessionPath, { email: account.email, password: secret });
    assert.ok(!response.ok(), 'Invalid credentials must not authenticate');
    if ((response.headers()['content-type'] || '').includes('application/json')) {
      const payload = await assertPublicResponse(response, f);
      assert.ok(!JSON.stringify(payload).includes(secret), 'Failures must not echo submitted passwords');
    }
    assert.equal(await active(ctx), null);
    await submit(page, account, secret); await signedOut(page);
    assert.equal(await page.locator('[role=alert]').isVisible(), true);
    assert.ok((await page.locator('[role=alert]').textContent()).trim().length > 0);
    assert.equal(await active(ctx), null); assert.deepEqual(await rows(f), before);
    const content = await page.locator('body').textContent();
    for (const saved of before) assert.ok(!content.includes(saved.password_hash));
    assert.ok(!content.includes(secret)); await ctx.close();
  }
});

test('refreshNavigationAndIndependentBrowserSessionRespectSessionBoundary', async t => {
  const f = await fixture(t); const base = await start(t, f);
  const { instance, context, page } = await browser(t, base);
  await submit(page, accounts[1]); await publicPresentation(page, accounts[1]);
  await page.reload(); await publicPresentation(page, accounts[1]);
  const second = await context.newPage(); await second.goto('/index.html'); await publicPresentation(second, accounts[1]);
  assert.deepEqual(await active(context), accounts[1]);
  const cookies = await context.cookies();
  assert.ok(cookies.every(c => c.expires === -1), 'Do not deliberately persist sign-in cookies');
  const independent = await instance.newContext({ baseURL: base }); const fresh = await independent.newPage();
  await fresh.goto('/'); await signedOut(fresh); assert.equal(await active(independent), null);
  await independent.close();
});

test('browserAndApiSignOutEndIdentityAcrossReadsRefreshAndNavigation', async t => {
  const f = await fixture(t); const base = await start(t, f);
  const { context, page } = await browser(t, base);
  for (const mode of ['browser', 'api']) {
    await page.goto('/'); await submit(page, accounts[2]); await publicPresentation(page, accounts[2]);
    if (mode === 'browser') {
      const response = page.waitForResponse(r => r.url().endsWith(sessionPath) && r.request().method() === 'DELETE');
      await page.locator('button[type=button]').click(); await response;
      await page.waitForSelector('input[type=password]');
    } else {
      const response = await request(context, 'DELETE', sessionPath); assert.ok(response.ok());
      await page.reload();
    }
    await signedOut(page); assert.equal(await active(context), null);
    await page.reload(); await signedOut(page);
    await page.goto('/index.html'); await signedOut(page); assert.equal(await active(context), null);
  }
});

test('publicFileRequestsCannotDownloadDatabaseOrInternalCredentials', async t => {
  const f = await fixture(t);
  await fs.mkdir(path.join(f.root, 'internal'), { recursive: true });
  const privateHash = hash();
  const secretFile = Buffer.from(JSON.stringify({ password_hash: privateHash, password }));
  await fs.writeFile(path.join(f.root, 'internal/credentials.json'), secretFile);
  const database = await fs.readFile(path.join(f.root, 'database.db'));
  const base = await start(t, f);
  for (const [url, forbidden] of [['/database.db', database], ['/internal/credentials.json', secretFile]]) {
    const response = await fetch(base + url);
    const returned = Buffer.from(await response.arrayBuffer());
    assert.ok(!returned.equals(forbidden), 'Public static requests must not return private repository files');
    for (const secret of [password, privateHash, ...(await rows(f)).map(a => a.password_hash)]) {
      assert.ok(!returned.includes(Buffer.from(secret)), 'Public file requests must not expose credentials from private files');
    }
  }
});

test('explicitLocalProvisioningCreatesCompatibleHashWithoutStartupSeeding', async t => {
  const f = await fixture(t, false); const base = await start(t, f);
  assert.deepEqual(await rows(f), [], 'Normal startup must not provision accounts');
  const entry = path.join(f.root, 'scripts/provision-account.js');
  assert.equal(await fs.access(entry).then(() => true, () => false), true,
    'An explicit local provisioning capability is required; no executable procedure currently exists');
  const account = accounts[0];
  const provision = spawn(process.execPath, [entry, '--display-name', account.display_name, '--email', account.email, '--role', account.role],
    { cwd: f.root, env: f.env, stdio: ['pipe', 'pipe', 'pipe'] });
  let output = ''; provision.stdout.on('data', b => { output += b; }); provision.stderr.on('data', b => { output += b; });
  t.after(async () => {
    if (provision.exitCode === null && provision.signalCode === null) {
      const ended = once(provision, 'exit'); provision.kill('SIGTERM'); await ended;
    }
  });
  const exited = once(provision, 'exit'); provision.stdin.end(password + '\n');
  const [code] = await exited; assert.equal(code, 0, output);
  const saved = await rows(f); assert.equal(saved.length, 1);
  assert.notEqual(saved[0].password_hash, password); assert.ok(saved[0].password_hash.length > 0);
  const { context, page } = await browser(t, base);
  await submit(page, account); const { password_hash, ...identity } = saved[0];
  assert.deepEqual(await active(context), identity); await publicPresentation(page, identity);
});
