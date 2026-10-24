'use strict';

const jwt = require('jsonwebtoken');

/**
 * Middleware verifikasi Bearer token JWT - Catalog Service.
 *
 * Identik dengan middleware pada Loan Service.
 * Kedua layanan menggunakan JWT_SECRET yang sama sehingga token
 * yang diterbitkan Loan Service dapat diverifikasi di sini.
 *
 * Error codes:
 * - TOKEN_MISSING -> 401 (tidak ada header Authorization)
 * - TOKEN_EXPIRED -> 401 (klaim exp sudah terlewat)
 * - TOKEN_INVALID -> 401 (signature tidak cocok / format rusak)
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

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET;

  try {
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });

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
