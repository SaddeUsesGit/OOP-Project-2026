const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Resolve from this module, never from the caller's working directory.
const databasePath = path.resolve(__dirname, '..', 'database.db');

function run(db, sql) {
    return new Promise((resolve, reject) => {
        db.run(sql, (error) => error ? reject(error) : resolve());
    });
}

function closeDatabase(db) {
    return new Promise((resolve, reject) => {
        db.close((error) => error ? reject(error) : resolve());
    });
}

// Each caller receives its own fully prepared connection.
async function openDatabase() {
    const db = await new Promise((resolve, reject) => {
        const connection = new sqlite3.Database(databasePath, (error) => {
            if (error) reject(error);
            else resolve(connection);
        });
    });

    try {
        await run(db, 'PRAGMA foreign_keys = ON');
        await run(db, `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE
        )`);
        return db;
    } catch (error) {
        await closeDatabase(db);
        throw error;
    }
}

module.exports = { databasePath, openDatabase, closeDatabase };
