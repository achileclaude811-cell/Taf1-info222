const http = require('http');
const sqlite3 = require('sqlite3').verbose();
const url = require('url');
const fs = require('fs');
const path = require('path');

// Connexion à la base de données
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Création de la table articles
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titre TEXT NOT NULL,
      contenu TEXT NOT NULL,
      auteur TEXT NOT NULL,
      date TEXT NOT NULL,
      categorie TEXT,
      tags TEXT
    )
  `);
  console.log('Base de données initialisée');
});

// Fonction pour parser le body des requêtes
function parseBody(req, callback) {
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  req.on('end', () => {
    try {
      callback(null, body ? JSON.parse(body) : {});
    } catch (error) {
      callback(error, null);
    }
  });
}

// Gestionnaire de requêtes
const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Gestion des requêtes OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  // Route: GET /api/articles
  if (pathname === '/api/articles' && req.method === 'GET') {
    const { categorie, auteur, date } = parsedUrl.query;
    let query = 'SELECT * FROM articles';
    const params = [];
    const conditions = [];
    
    if (categorie) {
      conditions.push('categorie = ?');
      params.push(categorie);
    }
    if (auteur) {
      conditions.push('auteur = ?');
      params.push(auteur);
    }
    if (date) {
      conditions.push('DATE(date) = DATE(?)');
      params.push(date);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY date DESC';
    
    db.all(query, params, (err, rows) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Erreur serveur' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(rows));
    });
  }
  
  // Route: GET /api/articles/search?query=texte
  else if (pathname === '/api/articles/search' && req.method === 'GET') {
    const { query } = parsedUrl.query;
    if (!query) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Le terme de recherche est requis' }));
      return;
    }
    
    const searchTerm = `%${query}%`;
    const sql = 'SELECT * FROM articles WHERE titre LIKE ? OR contenu LIKE ? ORDER BY date DESC';
    
    db.all(sql, [searchTerm, searchTerm], (err, rows) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Erreur serveur' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(rows));
    });
  }
  
  // Route: GET /api/articles/:id
  else if (pathname.match(/^\/api\/articles\/\d+$/) && req.method === 'GET') {
    const id = pathname.split('/')[3];
    db.get('SELECT * FROM articles WHERE id = ?', [id], (err, row) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Erreur serveur' }));
        return;
      }
      if (!row) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Article non trouvé' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(row));
    });
  }
  
  // Route: POST /api/articles
  else if (pathname === '/api/articles' && req.method === 'POST') {
    parseBody(req, (err, body) => {
      if (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'JSON invalide' }));
        return;
      }
      
      const { titre, contenu, auteur, categorie, tags } = body;
      
      // Validation
      if (!titre || !contenu || !auteur) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Titre, contenu et auteur sont requis' }));
        return;
      }
      
      const date = new Date().toISOString();
      const stmt = db.prepare(
        'INSERT INTO articles (titre, contenu, auteur, date, categorie, tags) VALUES (?, ?, ?, ?, ?, ?)'
      );
      
      stmt.run(titre, contenu, auteur, date, categorie || null, tags || null, function(err) {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Erreur serveur' }));
          return;
        }
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          message: 'Article créé avec succès',
          id: this.lastID 
        }));
      });
      stmt.finalize();
    });
  }
  
  // Route: PUT /api/articles/:id
  else if (pathname.match(/^\/api\/articles\/\d+$/) && req.method === 'PUT') {
    const id = pathname.split('/')[3];
    
    parseBody(req, (err, body) => {
      if (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'JSON invalide' }));
        return;
      }
      
      const updates = [];
      const values = [];
      
      if (body.titre !== undefined) {
        updates.push('titre = ?');
        values.push(body.titre);
      }
      if (body.contenu !== undefined) {
        updates.push('contenu = ?');
        values.push(body.contenu);
      }
      if (body.categorie !== undefined) {
        updates.push('categorie = ?');
        values.push(body.categorie);
      }
      if (body.tags !== undefined) {
        updates.push('tags = ?');
        values.push(body.tags);
      }
      
      if (updates.length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Aucune donnée à mettre à jour' }));
        return;
      }
      
      values.push(id);
      const sql = `UPDATE articles SET ${updates.join(', ')} WHERE id = ?`;
      
      db.run(sql, values, function(err) {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Erreur serveur' }));
          return;
        }
        if (this.changes === 0) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Article non trouvé' }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Article mis à jour avec succès', id: parseInt(id) }));
      });
    });
  }
  
  // Route: DELETE /api/articles/:id
  else if (pathname.match(/^\/api\/articles\/\d+$/) && req.method === 'DELETE') {
    const id = pathname.split('/')[3];
    
    db.run('DELETE FROM articles WHERE id = ?', [id], function(err) {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Erreur serveur' }));
        return;
      }
      if (this.changes === 0) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Article non trouvé' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Article supprimé avec succès', id: parseInt(id) }));
    });
  }
  
  // Route par défaut
  else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Route non trouvée' }));
  }
});

// Démarrage du serveur
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
  console.log('\nEndpoints disponibles:');
  console.log('  GET    /api/articles');
  console.log('  GET    /api/articles/:id');
  console.log('  GET    /api/articles/search?query=texte');
  console.log('  POST   /api/articles');
  console.log('  PUT    /api/articles/:id');
  console.log('  DELETE /api/articles/:id');
  console.log('\nPour utiliser avec curl:');
  console.log('  curl -X POST http://localhost:3000/api/articles -H "Content-Type: application/json" -d \'{"titre":"Mon article","contenu":"Contenu","auteur":"John"}\'');
});
