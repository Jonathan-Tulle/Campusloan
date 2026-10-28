'use strict';

/**
 * Middleware otorisasi berbasis peran (Role-Based Access Control).
 * Memeriksa apakah req.user.role terdaftar dalam daftar peran yang diizinkan.
 */
function requireRole(allowedRoles) {
  return function (req, res, next) {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Akses ditolak. Anda tidak memiliki wewenang untuk melakukan operasi ini.',
          details: [],
        },
      });
    }

    return next();
  };
}

module.exports = { requireRole };
