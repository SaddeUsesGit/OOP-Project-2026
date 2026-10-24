const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware to capture JSON structures sent out by frontend JavaScript fetch blocks
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname)); // Host files out of your project root folder

// Connects to local persistent file engine storage database
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) return console.error('Database initiation failure:', err.message);
    console.log('Connected to the SQLite database.');
});

// Setup target schema table layout columns if missing from file instance
db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
)`);

// [CREATE] ROUTE
app.post('/api/users', (req, res) => {
    const { username, useremail } = req.body;
    const sql = `INSERT INTO users (name, email) VALUES (?, ?)`;
    
    db.run(sql, [username, useremail], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: "Record added successfully", id: this.lastID });
    });
});

// [READ] ROUTE
app.get('/api/users', (req, res) => {
    const sql = `SELECT * FROM users`;
    
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// [UPDATE] ROUTE
app.put('/api/users', (req, res) => {
    const { id, email } = req.body;
    const sql = `UPDATE users SET email = ? WHERE id = ?`;
    
    db.run(sql, [email, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        if (this.changes === 0) {
            return res.status(404).json({ error: "No user found matching that target ID identifier" });
        }
        
        res.json({ message: "Update completed successfully" });
    });
});

// [DELETE] ROUTE
app.delete('/api/users/:id', (req, res) => {
    const userId = req.params.id;
    const sql = `DELETE FROM users WHERE id = ?`;
    
    db.run(sql, [userId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Deletion complete." });
    });
});

// Run loop listening routine configuration parameter values
app.listen(PORT, () => console.log(`Server successfully active on http://localhost:${PORT}`));
