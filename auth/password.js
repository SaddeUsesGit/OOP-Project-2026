'use strict';

const { randomBytes, scrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const deriveKey = promisify(scrypt);

// Node's scrypt defaults: N=16384, r=8, p=1. Both provisioning and
// verification use a 16-byte random salt and a 64-byte derived key.
async function hashPassword(password) {
    const salt = randomBytes(16).toString('hex');
    const key = await deriveKey(password, salt, 64);
    return `scrypt$${salt}$${key.toString('hex')}`;
}

async function verifyPassword(password, encoded) {
    if (typeof password !== 'string' || typeof encoded !== 'string') return false;
    const match = /^scrypt\$([a-f0-9]{32})\$([a-f0-9]{128})$/i.exec(encoded);
    if (!match) return false;
    const expected = Buffer.from(match[2], 'hex');
    const actual = await deriveKey(password, match[1], expected.length);
    return timingSafeEqual(expected, actual);
}

module.exports = { hashPassword, verifyPassword };
