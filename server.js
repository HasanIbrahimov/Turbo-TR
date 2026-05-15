const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware (Gelen JSON verilerini okumak ve CORS hatalarını önlemek için)
app.use(cors());
app.use(express.json());

// Frontend (HTML, CSS, JS) dosyalarını public olarak sun
// __dirname bulunduğumuz klasörü (Turbo TR) işaret eder.
app.use(express.static(path.join(__dirname)));

// SQLite Veritabanı Bağlantısı
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Veritabanı bağlantı hatası:', err.message);
  } else {
    console.log('SQLite veritabanına başarıyla bağlanıldı.');
    
    // Gerekli tabloları oluştur
    db.serialize(() => {
      // Kullanıcılar Tablosu (Users)
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ad_soyad TEXT,
        eposta TEXT UNIQUE,
        sifre TEXT
      )`);

      // Notlar Tablosu (Notes)
      db.run(`CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        content TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
    });
  }
});

// ==========================================
// API ROTALARI (BACKEND ENDPOINTS)
// ==========================================

// 1. Kullanıcı Kayıt Olma (Register)
app.post('/register', (req, res) => {
  const { ad_soyad, eposta, sifre } = req.body;
  if (!ad_soyad || !eposta || !sifre) {
    return res.status(400).json({ error: 'Tüm alanlar zorunludur.' });
  }

  const query = `INSERT INTO users (ad_soyad, eposta, sifre) VALUES (?, ?, ?)`;
  db.run(query, [ad_soyad, eposta, sifre], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(400).json({ error: 'Bu e-posta adresi zaten kullanılıyor.' });
      }
      return res.status(500).json({ error: 'Sunucu hatası: Kayıt yapılamadı.' });
    }
    res.status(201).json({ message: 'Kayıt başarılı!', userId: this.lastID });
  });
});

// 2. Kullanıcı Girişi (Login)
app.post('/login', (req, res) => {
  const { eposta, sifre } = req.body;
  if (!eposta || !sifre) {
    return res.status(400).json({ error: 'E-posta ve şifre zorunludur.' });
  }

  const query = `SELECT * FROM users WHERE eposta = ? AND sifre = ?`;
  db.get(query, [eposta, sifre], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Giriş sırasında sunucu hatası.' });
    }
    if (row) {
      // Gerçek projelerde burada JWT token üretilir, ödev için user_id dönmek yeterlidir.
      res.json({ success: true, message: 'Giriş başarılı!', name: row.ad_soyad, user: { id: row.id, eposta: row.eposta } });
    } else {
      res.status(401).json({ error: 'E-posta veya şifre hatalı.' });
    }
  });
});

// 3. Notları Getir (Read Notes)
app.get('/api/notes', (req, res) => {
  // Ödev kapsamında şimdilik tüm notları ya da varsayılan bir kullanıcının notlarını getiriyoruz
  const userId = req.query.userId || 1;
  const query = `SELECT * FROM notes WHERE user_id = ? ORDER BY created_at ASC`;
  
  db.all(query, [userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Notlar alınamadı.' });
    }
    res.json(rows);
  });
});

// 4. Yeni Not Ekle (Create Note)
app.post('/api/notes', (req, res) => {
  const { userId, content } = req.body;
  if (!content) {
    return res.status(400).json({ error: 'Not içeriği boş olamaz.' });
  }

  const query = `INSERT INTO notes (user_id, content) VALUES (?, ?)`;
  // Varsayılan user_id = 1 olarak kaydedelim eğer gönderilmemişse
  db.run(query, [userId || 1, content], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Not eklenemedi.' });
    }
    // Eklenen notun IDsini frontend'e döndürüyoruz
    res.status(201).json({ message: 'Not eklendi.', id: this.lastID, content: content });
  });
});

// 5. Not Sil (Delete Note)
app.delete('/api/notes/:id', (req, res) => {
  const noteId = req.params.id;
  const query = `DELETE FROM notes WHERE id = ?`;
  
  db.run(query, [noteId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Not silinemedi.' });
    }
    res.json({ message: 'Not silindi.' });
  });
});

// ==========================================
// SUNUCUYU BAŞLAT
// ==========================================
app.listen(PORT, () => {
  console.log(`Sunucu başlatıldı!`);
  console.log(`Tarayıcınızda şu adresi açın: http://localhost:${PORT}`);
});
