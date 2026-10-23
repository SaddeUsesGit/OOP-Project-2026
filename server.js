const express = require('express');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const db = new sqlite3.Database('./database.db', (err) => {
    if (err) return console.error(err.message);
    console.log('Connected to the SQLite database.');
});

db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
)`);

app.post('/api/users', (req, res) => {
    const { username, useremail } = req.body;
    db.run(`INSERT INTO users (name, email) VALUES (?, ?)`, [username, useremail], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.redirect('/');
    });
});

app.get('/api/users', (req, res) => {
    db.all(`SELECT * FROM users`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
