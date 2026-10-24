'use strict';

const jwt = require('jsonwebtoken');

/**
 * Middleware verifikasi Bearer token JWT.
 *
 * Melindungi endpoint dari:
 * - Akses tanpa token          -> 401 TOKEN_MISSING
 * - Token kedaluwarsa          -> 401 TOKEN_EXPIRED
 * - Token dimanipulasi/invalid -> 401 TOKEN_INVALID
 *
 * Jika valid, menyuntikkan objek req.user berisi { id, username, role }.
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        code: 'TOKEN_MISSING',
        message: 'Akses ditolak. Header Authorization dengan Bearer token wajib disertakan.',
        details: [],
      },
    });
  }

  const token = authHeader.slice(7); // hapus prefix "Bearer "
  const secret = process.env.JWT_SECRET;

  try {
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });

    // Suntikkan identitas pengguna ke request agar dapat diakses handler berikutnya
    req.user = {
      id: decoded.sub,
      username: decoded.username,
      role: decoded.role,
    };

    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Token sudah kedaluwarsa. Silakan login ulang.',
          details: [],
        },
      });
    }

    // JsonWebTokenError, NotBeforeError, atau kesalahan signature lainnya
    return res.status(401).json({
      error: {
        code: 'TOKEN_INVALID',
        message: 'Token tidak valid atau telah dimanipulasi.',
        details: [],
      },
    });
  }
}

module.exports = { verifyToken };
