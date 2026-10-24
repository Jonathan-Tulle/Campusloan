'use strict';

const { getDb } = require('../config/database');

/**
 * GET /api/v1/facilities
 *
 * Mengembalikan daftar fasilitas kampus dengan dukungan:
 * - Filter kategori : ?category=room  atau  ?category=equipment
 * - Paginasi : ?page=1&limit=10
 */
function listFacilities(req, res) {
  const db = getDb();

  // Paginasi
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
  const offset = (page - 1) * limit;

  // Filter kategori
  const allowedCategories = ['room', 'equipment'];
  const categoryParam = req.query.category;

  if (categoryParam && !allowedCategories.includes(categoryParam)) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: "Parameter category hanya menerima nilai 'room' atau 'equipment'.",
        details: [],
      },
    });
  }

  // Query dinamis berdasarkan ada-tidaknya filter
  let countSql = 'SELECT COUNT(*) AS total FROM facilities';
  let dataSql = 'SELECT id, name, category, description, is_active FROM facilities';
  const params = [];

  if (categoryParam) {
    countSql += ' WHERE category = ?';
    dataSql += ' WHERE category = ?';
    params.push(categoryParam);
  }

  dataSql += ' ORDER BY id ASC LIMIT ? OFFSET ?';

  const total = db.prepare(countSql).get(...params).total;
  const facilities = db.prepare(dataSql).all(...params, limit, offset);

  return res.status(200).json({
    data: {
      facilities,
      pagination: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    },
  });
}

/**
 * GET /api/v1/facilities/:id
 *
 * Mengembalikan detail satu fasilitas berdasarkan ID.
 * Mengembalikan 404 jika ID tidak ditemukan.
 */
function getFacility(req, res) {
  const id = parseInt(req.params.id, 10);

  if (!id || id < 1) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Parameter id harus berupa bilangan bulat positif.',
        details: [],
      },
    });
  }

  const db = getDb();
  const facility = db.prepare(
    'SELECT id, name, category, description, is_active FROM facilities WHERE id = ?'
  ).get(id);

  if (!facility) {
    return res.status(404).json({
      error: {
        code: 'FACILITY_NOT_FOUND',
        message: 'Fasilitas dengan ID ' + id + ' tidak ditemukan.',
        details: [],
      },
    });
  }

  return res.status(200).json({
    data: facility,
  });
}

module.exports = { listFacilities, getFacility };
