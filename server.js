const express = require('express');
const { openDatabase } = require('./database/connection');

const app = express();
const PORT = 3000;

// Middleware to capture JSON structures sent out by frontend JavaScript fetch blocks
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname)); // Host files out of your project root folder

// Assigned only after connection preparation and schema setup finish.
let db;

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

// Routes become reachable only after SQLite and the existing schema are ready.
openDatabase().then((connection) => {
    db = connection;
    console.log('Connected to the SQLite database.');
    app.listen(PORT, () => console.log(`Server successfully active on http://localhost:${PORT}`));
}).catch((error) => {
    console.error('Database initiation failure:', error.message);
    process.exitCode = 1;
});
