'use strict';

/**
 * Seed script untuk loan-service.
 * Membuat tabel users dan loans pada loan.db, lalu mengisi akun
 * pengguna awal dengan password yang di-hash menggunakan bcrypt (10 salt rounds).
 *
 * Sesuai spesifikasi PRD §12.2 dan §17.2.
 *
 * Jalankan dengan: node data/seed.js
 * (dari direktori loan-service/)
 */

const path     = require('path');
const fs       = require('fs');
const bcrypt   = require('bcrypt');
const Database = require('better-sqlite3');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const SALT_ROUNDS = 10;

// Pastikan folder data/ tersedia
const dataDir = path.resolve(__dirname);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DB_PATH
  ? path.resolve(__dirname, '../', process.env.DB_PATH)
  : path.resolve(__dirname, './loan.db');

console.log('[Seed] Mempersiapkan loan.db di: ' + dbPath);

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── DDL ──────────────────────────────────────────────────────────────────────

db.exec(
  'CREATE TABLE IF NOT EXISTS users (\n' +
  '  id INTEGER PRIMARY KEY AUTOINCREMENT,\n' +
  '  username TEXT NOT NULL UNIQUE,\n' +
  '  password_hash TEXT NOT NULL,\n' +
  '  role TEXT NOT NULL CHECK(role IN (\'student\', \'admin\')),\n' +
  '  full_name TEXT NOT NULL\n' +
  ');'
);

db.exec(
  'CREATE TABLE IF NOT EXISTS loans (\n' +
  '  id INTEGER PRIMARY KEY AUTOINCREMENT,\n' +
  '  facility_id INTEGER NOT NULL,\n' +
  '  borrower_id INTEGER NOT NULL,\n' +
  '  start_at TEXT NOT NULL,\n' +
  '  end_at TEXT NOT NULL,\n' +
  '  purpose TEXT NOT NULL,\n' +
  '  status TEXT NOT NULL DEFAULT \'pending\' CHECK(status IN (\'pending\', \'approved\', \'rejected\')),\n' +
  '  created_at TEXT NOT NULL,\n' +
  '  decided_by INTEGER NULL,\n' +
  '  decided_at TEXT NULL,\n' +
  '  FOREIGN KEY (borrower_id) REFERENCES users(id)\n' +
  ');'
);

// Indeks untuk performa query deteksi bentrok jadwal dan filter per peminjam
db.exec(
  'CREATE INDEX IF NOT EXISTS idx_loans_conflict ON loans (facility_id, status, start_at, end_at);\n' +
  'CREATE INDEX IF NOT EXISTS idx_loans_borrower ON loans (borrower_id);'
);

console.log('[Seed] Tabel users dan loans berhasil dibuat / sudah ada.');

// ─── Seed Data Pengguna ───────────────────────────────────────────────────────

/**
 * Daftar akun uji.
 * Password dibaca dari variabel lingkungan (.env) — TIDAK hardcoded di sini.
 * Hal ini memastikan password tidak pernah masuk ke repositori Git.
 * Isi nilai SEED_*_PASSWORD pada berkas .env sebelum menjalankan seed.
 */
const adminPassword = process.env.SEED_ADMIN_PASSWORD;
const budiPassword  = process.env.SEED_MHS_BUDI_PASSWORD;
const sariPassword  = process.env.SEED_MHS_SARI_PASSWORD;

// Gagal cepat apabila ada password yang belum dikonfigurasi di .env
const missingVars = [
  !adminPassword && 'SEED_ADMIN_PASSWORD',
  !budiPassword  && 'SEED_MHS_BUDI_PASSWORD',
  !sariPassword  && 'SEED_MHS_SARI_PASSWORD',
].filter(Boolean);

if (missingVars.length > 0) {
  console.error('[Seed] ERROR: Variabel lingkungan berikut belum diisi di .env:');
  missingVars.forEach((v) => console.error('         - ' + v));
  console.error('[Seed] Salin .env.example ke .env dan isi nilainya terlebih dahulu.');
  process.exit(1);
}

const usersSeedData = [
  {
    username: 'admin_kampus',
    password: adminPassword,
    role: 'admin',
    full_name: 'Administrator Sarpras',
  },
  {
    username: 'mhs_budi',
    password: budiPassword,
    role: 'student',
    full_name: 'Budi Santoso',
  },
  {
    username: 'mhs_sari',
    password: sariPassword,
    role: 'student',
    full_name: 'Siti Sari Lestari',
  },
];

async function runSeed() {
  // Bersihkan data lama agar seed bersifat idempoten (aman dijalankan berulang kali)
  db.exec('DELETE FROM loans;');
  db.exec('DELETE FROM users;');
  db.exec("DELETE FROM sqlite_sequence WHERE name IN ('users', 'loans');");

  const insertUser = db.prepare(
    'INSERT INTO users (username, password_hash, role, full_name) ' +
    'VALUES (@username, @password_hash, @role, @full_name)'
  );

  console.log('[Seed] Mulai proses hashing password (bcrypt, 10 salt rounds)...');

  for (const user of usersSeedData) {
    const hash = await bcrypt.hash(user.password, SALT_ROUNDS);

    insertUser.run({
      username: user.username,
      password_hash: hash,
      role: user.role,
      full_name: user.full_name,
    });

    console.log('[Seed]   ✓ Akun "' + user.username + '" (' + user.role + ') berhasil dibuat.');
  }

  const totalUsers = db.prepare('SELECT COUNT(*) AS total FROM users').get();
  console.log('\n[Seed] Total ' + totalUsers.total + ' akun pengguna berhasil dimasukkan.');

  // Tampilkan ringkasan tanpa kolom sensitif
  const summary = db.prepare(
    'SELECT id, username, role, full_name FROM users ORDER BY id'
  ).all();
  console.table(summary);

  db.close();
  console.log('[Seed] Selesai. loan.db siap digunakan.');
}

runSeed().catch((err) => {
  console.error('[Seed] ERROR:', err.message);
  process.exit(1);
});
