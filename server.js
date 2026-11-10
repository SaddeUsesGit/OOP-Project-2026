const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-this-demo-session-secret-before-deployment';
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  name: 'incident.sid', secret: SESSION_SECRET, resave: false, saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 8 * 60 * 60 * 1000 }
}));

const db = new sqlite3.Database(path.join(__dirname, 'database.db'), err => {
  if (err) { console.error('Database connection failed:', err.message); process.exit(1); }
  console.log('Connected to database.db');
});
function run(sql, params = []) { return new Promise((resolve, reject) => db.run(sql, params, function (e) { e ? reject(e) : resolve(this); })); }
function get(sql, params = []) { return new Promise((resolve, reject) => db.get(sql, params, (e, row) => e ? reject(e) : resolve(row))); }
function all(sql, params = []) { return new Promise((resolve, reject) => db.all(sql, params, (e, rows) => e ? reject(e) : resolve(rows))); }

async function requireLogin(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Please sign in first.' });
  try {
    const account = await get('SELECT is_active FROM accounts WHERE id=?', [req.session.user.id]);
    if (!account || !account.is_active) {
      return req.session.destroy(() => res.status(401).json({ error: 'This account is inactive. Contact an administrator.' }));
    }
    next();
  } catch (error) { res.status(500).json({ error: 'Could not verify account.' }); }
}
function requireRole(...roles) {
  return (req, res, next) => requireLogin(req, res, () => {
    if (!roles.includes(req.session.user.role)) return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    next();
  });
}
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/', (req, res) => res.redirect(req.session.user ? '/incident-management.html' : '/login'));
app.use((req, res, next) => {
  if (req.path === '/login' || req.path === '/api/auth/login' || req.path.startsWith('/css/')) return next();
  if (req.path.startsWith('/api/')) return next();
  if (!req.session.user && req.path !== '/favicon.ico') return res.redirect('/login');
  next();
});
app.use(express.static(__dirname));

async function initializeDatabase() {
  await run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE)`);
  await run(`CREATE TABLE IF NOT EXISTS incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT NOT NULL, category TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'Medium' CHECK(priority IN ('Low','Medium','High','Critical')),
    status TEXT NOT NULL DEFAULT 'Open' CHECK(status IN ('Open','In Progress','Resolved','Closed')),
    assigned_to TEXT, reported_by TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')), feedback TEXT, notes TEXT, resolution TEXT, legacy_id INTEGER)`);
  const columns = await all('PRAGMA table_info(incidents)');
  const existing = new Set(columns.map(c => c.name));
  for (const [name, type] of Object.entries({feedback:'TEXT',notes:'TEXT',resolution:'TEXT',legacy_id:'INTEGER'})) {
    if (!existing.has(name)) await run(`ALTER TABLE incidents ADD COLUMN ${name} ${type}`);
  }
  await run(`CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin','employee','technician')), display_name TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')))`);
  const accountColumns = await all('PRAGMA table_info(accounts)');
  if (!accountColumns.some(c => c.name === 'is_active')) await run('ALTER TABLE accounts ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1');
  const demos = [
    ['admin','Admin@123','admin','Administrator'],
    ['employee','Employee@123','employee','Demo Employee'],
    ['technician','Tech@123','technician','Demo Technician']
  ];
  for (const [username,password,role,displayName] of demos) {
    const found = await get('SELECT id FROM accounts WHERE username=?', [username]);
    if (!found) await run('INSERT INTO accounts(username,password_hash,role,display_name) VALUES(?,?,?,?)',
      [username, await bcrypt.hash(password, 12), role, displayName]);
  }
}

app.post('/api/auth/login', async (req,res) => {
  try {
    const username = String(req.body.username || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const account = await get('SELECT id,username,password_hash,role,display_name,is_active FROM accounts WHERE username=?', [username]);
    if (!account || !account.is_active || !(await bcrypt.compare(password, account.password_hash))) return res.status(401).json({error:'Incorrect username or password.'});
    req.session.regenerate(err => {
      if (err) return res.status(500).json({error:'Could not start session.'});
      req.session.user = { id:account.id, username:account.username, role:account.role, displayName:account.display_name };
      req.session.save(e => e ? res.status(500).json({error:'Could not save session.'}) : res.json({user:req.session.user}));
    });
  } catch(e) { res.status(500).json({error:'Login failed.'}); }
});
app.get('/api/auth/me', requireLogin, (req,res) => res.json({user:req.session.user}));
app.post('/api/auth/logout', requireLogin, (req,res) => req.session.destroy(() => { res.clearCookie('incident.sid'); res.json({message:'Signed out.'}); }));


// Admin account management. Passwords are only returned once at creation/reset time.
app.get('/api/admin/accounts', requireRole('admin'), async (req, res) => {
  try {
    const accounts = await all(`SELECT id, username, role, display_name, is_active, created_at
      FROM accounts ORDER BY CASE role WHEN 'admin' THEN 0 WHEN 'employee' THEN 1 ELSE 2 END, username`);
    res.json(accounts);
  } catch (e) { res.status(500).json({ error: 'Could not load accounts.' }); }
});

app.post('/api/admin/accounts', requireRole('admin'), async (req, res) => {
  try {
    const displayName = String(req.body.display_name || '').trim();
    const username = String(req.body.username || '').trim().toLowerCase();
    const role = String(req.body.role || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!displayName || displayName.length > 100) return res.status(400).json({ error: 'Enter a name (maximum 100 characters).' });
    if (!/^[a-z0-9._-]{3,30}$/.test(username)) return res.status(400).json({ error: 'Username must be 3–30 characters: lowercase letters, numbers, dots, underscores or hyphens.' });
    if (!['employee', 'technician'].includes(role)) return res.status(400).json({ error: 'Choose Employee or Technician.' });
    if (password.length < 8 || password.length > 72) return res.status(400).json({ error: 'Password must be 8–72 characters.' });
    const hash = await bcrypt.hash(password, 12);
    const result = await run('INSERT INTO accounts(username,password_hash,role,display_name) VALUES(?,?,?,?)', [username, hash, role, displayName]);
    res.status(201).json({ message: 'Account created.', account: { id: result.lastID, username, role, display_name: displayName, is_active: 1 }, initial_password: password });
  } catch (e) {
    if (e && e.code === 'SQLITE_CONSTRAINT') return res.status(409).json({ error: 'That username is already taken.' });
    res.status(500).json({ error: 'Could not create account.' });
  }
});

app.put('/api/admin/accounts/:id/password', requireRole('admin'), async (req, res) => {
  try {
    const password = String(req.body.password || '');
    if (password.length < 8 || password.length > 72) return res.status(400).json({ error: 'Password must be 8–72 characters.' });
    const account = await get('SELECT id, username FROM accounts WHERE id=?', [req.params.id]);
    if (!account) return res.status(404).json({ error: 'Account not found.' });
    await run('UPDATE accounts SET password_hash=? WHERE id=?', [await bcrypt.hash(password, 12), account.id]);
    res.json({ message: 'Password reset.', username: account.username, temporary_password: password });
  } catch (e) { res.status(500).json({ error: 'Could not reset password.' }); }
});

app.patch('/api/admin/accounts/:id/status', requireRole('admin'), async (req, res) => {
  try {
    const active = req.body.is_active;
    if (typeof active !== 'boolean') return res.status(400).json({ error: 'is_active must be true or false.' });
    const account = await get('SELECT id, username, role FROM accounts WHERE id=?', [req.params.id]);
    if (!account) return res.status(404).json({ error: 'Account not found.' });
    if (account.id === req.session.user.id && !active) return res.status(400).json({ error: 'You cannot deactivate your own admin account.' });
    if (account.role === 'admin') return res.status(400).json({ error: 'Admin accounts cannot be deactivated here.' });
    await run('UPDATE accounts SET is_active=? WHERE id=?', [active ? 1 : 0, account.id]);
    res.json({ message: active ? 'Account activated.' : 'Account deactivated.' });
  } catch (e) { res.status(500).json({ error: 'Could not update account status.' }); }
});

// Legacy users CRUD is restricted to administrators.
app.post('/api/users', requireRole('admin'), async (req,res) => {
  try { const r=await run('INSERT INTO users(name,email) VALUES(?,?)',[req.body.username,req.body.useremail]); res.status(201).json({message:'Record added',id:r.lastID}); }
  catch(e){res.status(400).json({error:e.message});}
});
app.get('/api/users', requireRole('admin'), async (req,res) => { try{res.json(await all('SELECT * FROM users ORDER BY id'));}catch(e){res.status(500).json({error:e.message});} });
app.put('/api/users', requireRole('admin'), async (req,res) => { try{const r=await run('UPDATE users SET email=? WHERE id=?',[req.body.email,req.body.id]);if(!r.changes)return res.status(404).json({error:'User not found'});res.json({message:'Updated'});}catch(e){res.status(400).json({error:e.message});} });
app.delete('/api/users/:id', requireRole('admin'), async (req,res) => { try{const r=await run('DELETE FROM users WHERE id=?',[req.params.id]);if(!r.changes)return res.status(404).json({error:'User not found'});res.json({message:'Deleted'});}catch(e){res.status(500).json({error:e.message});} });

const priorities=['Low','Medium','High','Critical'], statuses=['Open','In Progress','Resolved','Closed'];
function validateIncident(b,partial=false){
  if(!partial)for(const f of ['title','description','category','priority'])if(typeof b[f]!=='string'||!b[f].trim())return `${f} is required`;
  if(b.priority!==undefined&&!priorities.includes(b.priority))return 'Invalid priority';
  if(b.status!==undefined&&!statuses.includes(b.status))return 'Invalid status';
  return null;
}
app.get('/api/incidents/summary/counts', requireLogin, async(req,res)=>{
  try{let sql=`SELECT COUNT(*) total,SUM(status='Open') open,SUM(status='In Progress') in_progress,SUM(status='Resolved') resolved,SUM(priority='Critical') critical FROM incidents`,params=[];
    if(req.session.user.role==='employee'){sql=sql.replace(' FROM incidents',' FROM incidents WHERE reported_by=?');params.push(req.session.user.username);}
    if(req.session.user.role==='technician'){sql=sql.replace(' FROM incidents',' FROM incidents WHERE assigned_to=?');params.push(req.session.user.username);}
    res.json(await get(sql,params));}catch(e){res.status(500).json({error:e.message});}
});
app.get('/api/incidents', requireLogin, async(req,res)=>{
  try{
    const clauses=[],params=[],role=req.session.user.role;
    if(role==='employee'){clauses.push('reported_by=?');params.push(req.session.user.username);}
    if(role==='technician'){clauses.push('assigned_to=?');params.push(req.session.user.username);}
    if(statuses.includes(req.query.status)){clauses.push('status=?');params.push(req.query.status);}
    if(priorities.includes(req.query.priority)){clauses.push('priority=?');params.push(req.query.priority);}
    if(req.query.search){clauses.push('(title LIKE ? OR description LIKE ? OR category LIKE ? OR reported_by LIKE ? OR assigned_to LIKE ?)');const q=`%${req.query.search}%`;params.push(q,q,q,q,q);}
    const where=clauses.length?`WHERE ${clauses.join(' AND ')}`:'';
    res.json(await all(`SELECT * FROM incidents ${where} ORDER BY datetime(created_at) DESC`,params));
  }catch(e){res.status(500).json({error:e.message});}
});
app.get('/api/incidents/:id', requireLogin, async(req,res)=>{
  try{const row=await get('SELECT * FROM incidents WHERE id=?',[req.params.id]);if(!row)return res.status(404).json({error:'Incident not found'});
    const u=req.session.user;if(u.role==='employee'&&row.reported_by!==u.username)return res.status(403).json({error:'Access denied'});if(u.role==='technician'&&row.assigned_to!==u.username)return res.status(403).json({error:'Access denied'});res.json(row);
  }catch(e){res.status(500).json({error:e.message});}
});
app.post('/api/incidents', requireRole('admin','employee'), async(req,res)=>{
  const error=validateIncident(req.body);if(error)return res.status(400).json({error});
  try{const b=req.body, reporter=req.session.user.role==='employee'?req.session.user.username:String(b.reported_by||req.session.user.username).trim();
    const assignee=(b.assigned_to||'').trim()||null;
    if(assignee){const tech=await get("SELECT id FROM accounts WHERE username=? AND role='technician'",[assignee]);if(!tech)return res.status(400).json({error:'Assigned technician username does not exist.'});}
    const r=await run(`INSERT INTO incidents(title,description,category,priority,status,assigned_to,reported_by) VALUES(?,?,?,?,?,?,?)`,[b.title.trim(),b.description.trim(),b.category.trim(),b.priority,b.status||'Open',assignee,reporter]);res.status(201).json({message:'Incident created',id:r.lastID});
  }catch(e){res.status(400).json({error:e.message});}
});
app.put('/api/incidents/:id', requireLogin, async(req,res)=>{
  try{
    const current=await get('SELECT * FROM incidents WHERE id=?',[req.params.id]);if(!current)return res.status(404).json({error:'Incident not found'});
    const user=req.session.user;
    if(user.role==='employee')return res.status(403).json({error:'Employees cannot edit incidents after submission.'});
    if(user.role==='technician'){
      if(current.assigned_to!==user.username)return res.status(403).json({error:'This incident is not assigned to you.'});
      if(!statuses.includes(req.body.status))return res.status(400).json({error:'Choose a valid status.'});
      await run("UPDATE incidents SET status=?,updated_at=datetime('now','localtime') WHERE id=?",[req.body.status,req.params.id]);
      return res.json({message:'Incident status updated.'});
    }
    const error=validateIncident(req.body,true);if(error)return res.status(400).json({error});
    const fields=['title','description','category','priority','status','assigned_to'];const updated={...current};
    for(const f of fields)if(Object.hasOwn(req.body,f))updated[f]=req.body[f];
    if(!updated.title||!updated.description||!updated.category)return res.status(400).json({error:'Title, description and category are required.'});
    if(updated.assigned_to){const tech=await get("SELECT id FROM accounts WHERE username=? AND role='technician'",[updated.assigned_to]);if(!tech)return res.status(400).json({error:'Assigned technician username does not exist.'});}
    await run("UPDATE incidents SET title=?,description=?,category=?,priority=?,status=?,assigned_to=?,updated_at=datetime('now','localtime') WHERE id=?",[updated.title,updated.description,updated.category,updated.priority,updated.status,updated.assigned_to||null,req.params.id]);res.json({message:'Incident updated.'});
  }catch(e){res.status(400).json({error:e.message});}
});
app.delete('/api/incidents/:id', requireRole('admin'), async(req,res)=>{try{const r=await run('DELETE FROM incidents WHERE id=?',[req.params.id]);if(!r.changes)return res.status(404).json({error:'Incident not found'});res.json({message:'Incident deleted.'});}catch(e){res.status(500).json({error:e.message});}});

initializeDatabase().then(()=>app.listen(PORT,()=>console.log(`Server running at http://localhost:${PORT}`))).catch(e=>{console.error('Database initialization failed:',e);process.exit(1);});
