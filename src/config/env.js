import dotenv from 'dotenv';

// Memuat .env sebelum modul lain dievaluasi (config/db.js membaca process.env saat di-import).
// Sengaja memanggil config() alih-alih 'dotenv/config', yang secara default tidak mencetak log "injected env".
dotenv.config();
