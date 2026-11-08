'use strict';

const express = require('express');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { openDatabase } = require('./database/connection');
const { verifyPassword } = require('./auth/password');

const app = express();
const PORT = 3000;
const sessions = new Map();
const cookieName = 'account_session';
let db;

app.use(express.json());
app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});

// Never expose the checkout as a static directory: it contains private data.
for (const [url, file] of Object.entries({
    '/': 'index.html',
    '/index.html': 'index.html',
    '/app.js': 'app.js',
    '/account-access.js': 'account-access.js',
    '/account-access.css': 'account-access.css'
})) {
    app.get(url, (req, res) => {
        res.set('Cache-Control', 'no-store');
        res.sendFile(path.join(__dirname, file));
    });
}

// Retired for every method and sign-in state; these paths do not read SQLite.
app.use('/api/users', (req, res) => {
    res.status(410).json({ error: 'Account management is unavailable.' });
});

function sessionToken(req) {
    const cookie = (req.headers.cookie || '').split(';')
        .map(part => part.trim()).find(part => part.startsWith(cookieName + '='));
    return cookie ? cookie.slice(cookieName.length + 1) : null;
}

function cookieOptions(req) {
    return { httpOnly: true, sameSite: 'lax', path: '/', secure: req.secure };
}

function endSession(req, res) {
    sessions.delete(sessionToken(req));
    res.clearCookie(cookieName, cookieOptions(req));
}

function get(sql, parameters) {
    return new Promise((resolve, reject) => {
        db.get(sql, parameters, (error, row) => error ? reject(error) : resolve(row));
    });
}

function publicAccount(row) {
    return { id: row.id, display_name: row.display_name, email: row.email, role: row.role };
}

app.get('/api/session', async (req, res) => {
    const id = sessions.get(sessionToken(req));
    if (id === undefined) return res.json({ account: null });
    const row = await get('SELECT id, display_name, email, role FROM users WHERE id = ?', [id]);
    if (!row) {
        endSession(req, res);
        return res.json({ account: null });
    }
    res.json({ account: publicAccount(row) });
});

app.post('/api/session', async (req, res) => {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string') {
        endSession(req, res);
        return res.status(400).json({ error: 'Email and password are required.' });
    }
    const row = await get(
        'SELECT id, display_name, email, password_hash, role FROM users WHERE email = ?', [email]
    );
    if (!row || !await verifyPassword(password, row.password_hash)) {
        endSession(req, res);
        return res.status(401).json({ error: 'Sign-in was unsuccessful. Check your credentials.' });
    }
    endSession(req, res);
    const token = randomBytes(32).toString('base64url');
    sessions.set(token, row.id);
    // No Max-Age or Expires: this is intentionally a browser-session cookie.
    res.cookie(cookieName, token, cookieOptions(req));
    res.json({ account: publicAccount(row) });
});

app.delete('/api/session', (req, res) => {
    endSession(req, res);
    res.json({ account: null });
});

// No internal error, query, hash or submitted credential is returned to clients.
app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    res.status(error.type === 'entity.parse.failed' ? 400 : 500)
        .json({ error: 'The request could not be completed.' });
});

openDatabase().then(connection => {
    db = connection;
    app.listen(PORT, () => console.log(`Server active on http://localhost:${PORT}`));
}).catch(error => {
    console.error('Database initialization failure:', error.message);
    process.exitCode = 1;
});
