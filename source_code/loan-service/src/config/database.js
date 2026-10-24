'use strict';

const path = require('path');
const Database = require('better-sqlite3');

// Path database selalu relatif terhadap direktori service ini,
// tidak bergantung pada DB_PATH env agar aman saat di-require dari luar
// direktori service (misalnya skrip pengujian di root).
const dbPath = path.resolve(__dirname, '../../data/loan.db');

let db;

function getDb() {
  if (db) return db;

  db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  return db;
}

module.exports = { getDb };
