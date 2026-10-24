'use strict';

/**
 * Seed script untuk catalog-service.
 * Membuat tabel facilities pada catalog.db dan mengisi data awal
 * sesuai spesifikasi PRD.
 *
 * Jalankan dengan: node data/seed.js
 * (dari direktori catalog-service/)
 */

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Pastikan folder data/ sudah ada
const dataDir = path.resolve(__dirname);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DB_PATH
  ? path.resolve(__dirname, '../', process.env.DB_PATH)
  : path.resolve(__dirname, './catalog.db');

console.log('[Seed] Mempersiapkan catalog.db di: ' + dbPath);

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// DDL

db.exec(
  'CREATE TABLE IF NOT EXISTS facilities (\n' +
  '  id INTEGER PRIMARY KEY AUTOINCREMENT,\n' +
  '  name TEXT NOT NULL,\n' +
  '  category TEXT NOT NULL CHECK(category IN (\'room\', \'equipment\')),\n' +
  '  description TEXT NOT NULL,\n' +
  '  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1))\n' +
  ');'
);

console.log('[Seed] Tabel facilities berhasil dibuat / sudah ada.');

// Seed Data 

// Hapus data lama sebelum insert ulang agar seed bersifat idempoten
db.exec('DELETE FROM facilities;');

// Reset sequence autoincrement agar ID selalu mulai dari 1
db.exec("DELETE FROM sqlite_sequence WHERE name = 'facilities';");

const insertFacility = db.prepare(
  'INSERT INTO facilities (name, category, description, is_active) ' +
  'VALUES (@name, @category, @description, @is_active)'
);

const seedData = [
  {
    name: 'Ruang Seminar Gedung A',
    category: 'room',
    description: 'Kapasitas 60 kursi, dilengkapi AC central dan proyektor full-HD',
    is_active: 1,
  },
  {
    name: 'Proyektor Portabel Epson P-01',
    category: 'equipment',
    description: 'Proyektor 4000 lumens, koneksi HDMI dan VGA, bobot 2,5 kg',
    is_active: 1,
  },
  {
    name: 'Studio Multimedia Kreatif',
    category: 'room',
    description: 'Dilengkapi peredam suara akustik, kamera 4K, dan lighting profesional',
    is_active: 1,
  },
  {
    name: 'Lab Komputer Pemrograman 2',
    category: 'room',
    description: 'Sedang dalam pemeliharaan berkala, tidak tersedia untuk peminjaman',
    is_active: 0,
  },
];

const runSeeding = db.transaction(() => {
  for (const facility of seedData) {
    insertFacility.run(facility);
  }
});

runSeeding();

const totalRows = db.prepare('SELECT COUNT(*) AS total FROM facilities').get();
console.log('[Seed] Berhasil memasukkan ' + totalRows.total + ' data fasilitas.');

// Tampilkan ringkasan data yang dimasukkan
const rows = db.prepare('SELECT id, name, category, is_active FROM facilities').all();
console.table(rows);

db.close();
console.log('[Seed] Selesai. catalog.db siap digunakan.');
