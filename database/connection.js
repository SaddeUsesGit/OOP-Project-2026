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
        const columns = await new Promise((resolve, reject) => {
            db.all('PRAGMA table_info(users)', (error, rows) => error ? reject(error) : resolve(rows));
        });
        const prototypeFields = ['id', 'name', 'email'];
        if (columns.length === prototypeFields.length &&
            prototypeFields.every(name => columns.some(column => column.name === name))) {
            throw new Error(
                'Incompatible prototype users schema in ' + databasePath + '. ' +
                'No data was changed. Back up the database before proceeding. ' +
                'For a deliberate fresh start, stop all database users, back up the database ' +
                'and any sidecars, then explicitly move the database and sidecars out of this ' +
                'checkout and rerun initialization. No automatic reset or migration is performed.'
            );
        }
        await run(db, `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            display_name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('employee', 'technician', 'administrator'))
        )`);
        await run(db, `CREATE TABLE IF NOT EXISTS incident_categories (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            description TEXT
        )`);
        await run(db, `CREATE TABLE IF NOT EXISTS it_services (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            business_criticality TEXT NOT NULL
                CHECK (business_criticality IN ('low', 'medium', 'high', 'critical'))
        )`);
        return db;
    } catch (error) {
        await closeDatabase(db);
        throw error;
    }
}

module.exports = { databasePath, openDatabase, closeDatabase };
