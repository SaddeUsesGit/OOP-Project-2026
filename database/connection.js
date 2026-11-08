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
        await run(db, `CREATE TABLE IF NOT EXISTS tickets (
            id INTEGER PRIMARY KEY,
            reporter_id INTEGER NOT NULL REFERENCES users(id),
            category_id INTEGER NOT NULL REFERENCES incident_categories(id),
            service_id INTEGER NOT NULL REFERENCES it_services(id),
            assigned_technician_id INTEGER REFERENCES users(id),
            verifier_id INTEGER REFERENCES users(id),
            closer_id INTEGER REFERENCES users(id),
            description TEXT NOT NULL,
            impact TEXT NOT NULL CHECK (impact IN ('low', 'medium', 'high')),
            urgency TEXT NOT NULL CHECK (urgency IN ('low', 'medium', 'high')),
            service_criticality_snapshot TEXT NOT NULL
                CHECK (service_criticality_snapshot IN ('low', 'medium', 'high', 'critical')),
            priority TEXT CHECK (priority IN ('P1', 'P2', 'P3', 'P4')),
            status TEXT NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'assigned', 'in_progress', 'resolved', 'verified', 'closed')),
            created_at TEXT NOT NULL,
            assigned_at TEXT,
            resolved_at TEXT,
            verified_at TEXT,
            closed_at TEXT,
            resolution_summary TEXT,
            closure_summary TEXT,
            response_due_at TEXT,
            resolution_due_at TEXT
        )`);
        return db;
    } catch (error) {
        await closeDatabase(db);
        throw error;
    }
}

module.exports = { databasePath, openDatabase, closeDatabase };
