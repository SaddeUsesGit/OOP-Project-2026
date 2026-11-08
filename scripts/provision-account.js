'use strict';

// Explicit local operation only. Never imported by server startup.
const { parseArgs } = require('node:util');
const { openDatabase, closeDatabase } = require('../database/connection');
const { hashPassword, verifyPassword } = require('../auth/password');

async function provision() {
    const { values } = parseArgs({
        options: {
            'display-name': { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string' }
        },
        allowPositionals: false
    });
    if (typeof values['display-name'] !== 'string' || typeof values.email !== 'string' ||
        !['employee', 'technician', 'administrator'].includes(values.role)) {
        throw new Error('Missing account arguments');
    }
    // Passwords are not command-line arguments or environment variables.
    // Use the documented non-echoing shell prompt and pipe; do not type into
    // an echoing terminal here.
    if (process.stdin.isTTY) throw new Error('Supply password through stdin');
    process.stdin.setEncoding('utf8');
    let input = '';
    for await (const chunk of process.stdin) input += chunk;
    const password = input.replace(/\r?\n$/, '');
    if (!password.length) throw new Error('Password input is required');

    const encoded = await hashPassword(password);
    const db = await openDatabase();
    try {
        const id = await new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO users(display_name,email,password_hash,role) VALUES (?,?,?,?)',
                [values['display-name'], values.email, encoded, values.role],
                function (error) { error ? reject(error) : resolve(this.lastID); }
            );
        });
        const account = await new Promise((resolve, reject) => {
            db.get('SELECT id, display_name, email, password_hash, role FROM users WHERE id = ?', [id],
                (error, row) => error ? reject(error) : resolve(row));
        });
        if (!await verifyPassword(password, account.password_hash)) {
            throw new Error('Stored credential verification failed');
        }
        const { password_hash, ...identity } = account;
        console.log(JSON.stringify({ account: identity }));
    } finally {
        await closeDatabase(db);
    }
}

if (require.main === module) {
    provision().catch(() => {
        console.error(
            'Account provisioning failed. Check --display-name, --email, --role, password stdin, ' +
            'database compatibility and email uniqueness. See docs/account-access.md.'
        );
        process.exitCode = 1;
    });
}
