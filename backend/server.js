const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Initialize SQLite database
const db = new sqlite3.Database('./votes.db', (err) => {
  if (err) console.error('DB Error:', err);
  else console.log('Connected to SQLite database.');
});

// Create tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS candidats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    photo TEXT,
    programme TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    etudiant_id TEXT NOT NULL UNIQUE,
    candidat_id INTEGER NOT NULL,
    date_vote DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (candidat_id) REFERENCES candidats(id)
  )`);

  // Insert sample candidates if empty
  db.get('SELECT COUNT(*) as count FROM candidats', (err, row) => {
    if (!err && row.count === 0) {
      const candidats = [
        {
          nom: 'Yasmine El Mansouri',
          photo: 'https://i.pravatar.cc/150?img=47',
          programme: 'Améliorer la communication entre étudiants et administration. Organiser des ateliers de préparation aux stages et aux entretiens professionnels.'
        },
        {
          nom: 'Mehdi Bouziane',
          photo: 'https://i.pravatar.cc/150?img=12',
          programme: 'Mettre en place une bibliothèque numérique collaborative. Négocier des réductions pour les certifications professionnelles.'
        },
        {
          nom: 'Sara Naciri',
          photo: 'https://i.pravatar.cc/150?img=45',
          programme: 'Créer un espace de co-working étudiant. Organiser des hackathons mensuels et des conférences avec des professionnels du secteur.'
        },
        {
          nom: 'Karim Alaoui',
          photo: 'https://i.pravatar.cc/150?img=15',
          programme: 'Développer des partenariats avec des entreprises locales pour des stages garantis. Instaurer un système de tutorat entre promotions.'
        }
      ];

      const stmt = db.prepare('INSERT INTO candidats (nom, photo, programme) VALUES (?, ?, ?)');
      candidats.forEach(c => stmt.run(c.nom, c.photo, c.programme));
      stmt.finalize();
      console.log('Sample candidates inserted.');
    }
  });
});

// ─── API ROUTES ───────────────────────────────────────────────

// GET /api/candidats — Retrieve all candidates
app.get('/api/candidats', (req, res) => {
  db.all('SELECT * FROM candidats', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST /api/vote — Register a vote
app.post('/api/vote', (req, res) => {
  const { etudiant_id, candidat_id } = req.body;

  if (!etudiant_id || !candidat_id) {
    return res.status(400).json({ error: 'etudiant_id et candidat_id sont requis.' });
  }

  // Check if student already voted
  db.get('SELECT * FROM votes WHERE etudiant_id = ?', [etudiant_id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) {
      return res.status(409).json({ error: 'Cet étudiant a déjà voté.' });
    }

    // Register vote
    db.run(
      'INSERT INTO votes (etudiant_id, candidat_id) VALUES (?, ?)',
      [etudiant_id, candidat_id],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'Vote enregistré avec succès !', vote_id: this.lastID });
      }
    );
  });
});

// GET /api/resultats — Get vote results
app.get('/api/resultats', (req, res) => {
  const query = `
    SELECT c.id, c.nom, c.photo, COUNT(v.id) as votes
    FROM candidats c
    LEFT JOIN votes v ON c.id = v.candidat_id
    GROUP BY c.id
    ORDER BY votes DESC
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    db.get('SELECT COUNT(*) as total FROM votes', [], (err2, total) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ resultats: rows, total_votes: total.total });
    });
  });
});

// Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
