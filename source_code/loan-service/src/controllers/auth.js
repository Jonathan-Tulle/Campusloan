'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getDb } = require('../config/database');

/**
 * POST /api/v1/auth/login
 *
 * Memvalidasi kredensial pengguna lalu menerbitkan token JWT bertanda tangan
 * digital (HS256) dengan klaim: sub, username, role, exp.
 */
function login(req, res) {
  const { username, password } = req.body;

  // Validasi keberadaan field wajib
  if (!username || !password) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Field username dan password wajib diisi.',
        details: [],
      },
    });
  }

  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Username dan password harus bertipe string.',
        details: [],
      },
    });
  }

  const db = getDb();
  const user = db.prepare(
    'SELECT id, username, password_hash, role, full_name FROM users WHERE username = ?'
  ).get(username.trim());

  // Gunakan waktu tetap agar tidak rentan terhadap timing attack
  // (bcrypt.compare tetap dijalankan walau user tidak ditemukan)
  const dummyHash = '$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01234';

  bcrypt.compare(password, user ? user.password_hash : dummyHash, (err, isMatch) => {
    if (err) {
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Terjadi kesalahan pada server.',
          details: [],
        },
      });
    }

    if (!user || !isMatch) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Username atau password salah.',
          details: [],
        },
      });
    }

    const secret = process.env.JWT_SECRET;
    const expires = process.env.JWT_EXPIRES_IN || '1h';

    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    const token = jwt.sign(payload, secret, {
      algorithm: 'HS256',
      expiresIn: expires,
    });

    return res.status(200).json({
      data: {
        token,
        token_type: 'Bearer',
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          full_name: user.full_name,
        },
      },
    });
  });
}

module.exports = { login };
