const { openDatabase, closeDatabase } = require('./connection');

async function initialize() {
    const db = await openDatabase();
    await closeDatabase(db);
}

if (require.main === module) {
    initialize().catch((error) => {
        console.error('Database initialization failed:', error.message);
        process.exitCode = 1;
    });
}

module.exports = { initialize };
