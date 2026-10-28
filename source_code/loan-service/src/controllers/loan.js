'use strict';

const { getDb } = require('../config/database');
const { getFacilityById } = require('../clients/catalogClient');
const { validateAndNormalizeTimeRange, findScheduleConflict } = require('../services/loanService');

/**
 * POST /api/v1/loans
 * Membuat pengajuan peminjaman fasilitas baru (khusus mahasiswa).
 */
async function createLoan(req, res, next) {
  try {
    // BR-12: Hanya mahasiswa yang berhak mengajukan peminjaman
    if (req.user.role !== 'student') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Akun dengan peran admin tidak diperbolehkan membuat pengajuan peminjaman.',
          details: [],
        },
      });
    }

    const { facility_id, start_at, end_at, purpose } = req.body;

    // BR-01: Validasi keberadaan field wajib
    if (!facility_id || !start_at || !end_at || !purpose) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Field facility_id, start_at, end_at, dan purpose wajib diisi.',
          details: [],
        },
      });
    }

    const facilityIdNum = parseInt(facility_id, 10);
    if (isNaN(facilityIdNum) || facilityIdNum < 1) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Field facility_id harus berupa bilangan bulat positif.',
          details: [],
        },
      });
    }

    if (typeof purpose !== 'string' || purpose.trim().length < 5 || purpose.trim().length > 255) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Field purpose harus berupa string dengan panjang 5 hingga 255 karakter.',
          details: [],
        },
      });
    }

    // BR-02 & BR-03: Validasi format ISO 8601 offset dan urutan rentang waktu
    const { startUtc, endUtc } = validateAndNormalizeTimeRange(start_at, end_at);

    // Meneruskan token Bearer ke Layanan Katalog
    const authHeader = req.headers['authorization'] || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

    // Verifikasi keberadaan dan status keaktifan fasilitas di Katalog (Port 3001)
    await getFacilityById(facilityIdNum, bearerToken);

    // BR-07 & BR-08: Periksa bentrok jadwal pada basis data peminjaman
    const conflict = findScheduleConflict(facilityIdNum, startUtc, endUtc);
    if (conflict) {
      return res.status(409).json({
        error: {
          code: 'SCHEDULE_CONFLICT',
          message: 'Jadwal peminjaman bertumpang tindih dengan pengajuan aktif lainnya.',
          details: [
            {
              conflicting_loan_id: conflict.id,
              status: conflict.status,
              start_at: conflict.start_at,
              end_at: conflict.end_at,
            },
          ],
        },
      });
    }

    // BR-11: borrower_id mutlak diambil dari klaim sub token JWT
    const borrowerId = req.user.id;
    const createdAt = new Date().toISOString();

    const db = getDb();
    const insertStmt = db.prepare(
      'INSERT INTO loans (facility_id, borrower_id, start_at, end_at, purpose, status, created_at) ' +
      'VALUES (?, ?, ?, ?, ?, \'pending\', ?)'
    );

    const info = insertStmt.run(facilityIdNum, borrowerId, startUtc, endUtc, purpose.trim(), createdAt);
    const newLoan = db.prepare('SELECT * FROM loans WHERE id = ?').get(info.lastInsertRowid);

    return res.status(201).json({
      data: newLoan,
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        error: {
          code: err.code || 'ERROR',
          message: err.message,
          details: [],
        },
      });
    }
    return next(err);
  }
}

/**
 * GET /api/v1/loans
 * Melihat daftar pengajuan.
 * Mahasiswa hanya melihat miliknya; Admin melihat seluruh pengajuan sistem.
 */
function listLoans(req, res, next) {
  try {
    const db = getDb();
    const { status } = req.query;

    const allowedStatuses = ['pending', 'approved', 'rejected'];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: "Parameter status hanya menerima 'pending', 'approved', atau 'rejected'.",
          details: [],
        },
      });
    }

    let sql = 'SELECT * FROM loans WHERE 1=1';
    const params = [];

    // BR-13: Isolasi visibilitas data
    if (req.user.role === 'student') {
      sql += ' AND borrower_id = ?';
      params.push(req.user.id);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY id DESC';

    const loans = db.prepare(sql).all(...params);

    return res.status(200).json({
      data: loans,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/loans/:id
 * Melihat detail pengajuan tertentu.
 * Hanya pemilik pengajuan atau admin yang diizinkan mengakses.
 */
function getLoanById(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Parameter id harus berupa bilangan bulat positif.',
          details: [],
        },
      });
    }

    const db = getDb();
    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(id);

    if (!loan) {
      return res.status(404).json({
        error: {
          code: 'LOAN_NOT_FOUND',
          message: 'Pengajuan peminjaman dengan ID ' + id + ' tidak ditemukan.',
          details: [],
        },
      });
    }

    // BR-13: Akses ke data mahasiswa lain ditolak 403 Forbidden
    if (req.user.role === 'student' && loan.borrower_id !== req.user.id) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Akses ditolak. Anda tidak berhak melihat data pengajuan mahasiswa lain.',
          details: [],
        },
      });
    }

    return res.status(200).json({
      data: loan,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/v1/loans/:id
 * Menyetujui atau menolak pengajuan pending (khusus admin).
 */
function updateLoanStatus(req, res, next) {
  try {
    // BR-05: Wewenang keputusan hanya dimiliki admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Hanya akun dengan peran admin yang berhak memproses keputusan pengajuan.',
          details: [],
        },
      });
    }

    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Parameter id harus berupa bilangan bulat positif.',
          details: [],
        },
      });
    }

    const { status } = req.body;
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: "Field status wajib diisi dengan nilai 'approved' atau 'rejected'.",
          details: [],
        },
      });
    }

    const db = getDb();
    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(id);

    if (!loan) {
      return res.status(404).json({
        error: {
          code: 'LOAN_NOT_FOUND',
          message: 'Pengajuan peminjaman dengan ID ' + id + ' tidak ditemukan.',
          details: [],
        },
      });
    }

    // BR-06: Finalitas status — hanya pengajuan pending yang dapat diproses
    if (loan.status !== 'pending') {
      return res.status(409).json({
        error: {
          code: 'INVALID_STATUS_TRANSITION',
          message: 'Pengajuan dengan status "' + loan.status + '" sudah bersifat final dan tidak dapat diproses lagi.',
          details: [],
        },
      });
    }

    // Jika disetujui, pastikan tidak ada bentrok dengan pengajuan approved lain
    if (status === 'approved') {
      const conflict = findScheduleConflict(loan.facility_id, loan.start_at, loan.end_at, loan.id);
      if (conflict && conflict.status === 'approved') {
        return res.status(409).json({
          error: {
            code: 'SCHEDULE_CONFLICT',
            message: 'Tidak dapat menyetujui pengajuan karena fasilitas sudah terpesan oleh pengajuan lain.',
            details: [{ conflicting_loan_id: conflict.id }],
          },
        });
      }
    }

    const decidedAt = new Date().toISOString();
    const decidedBy = req.user.id;

    db.prepare(
      'UPDATE loans SET status = ?, decided_by = ?, decided_at = ? WHERE id = ?'
    ).run(status, decidedBy, decidedAt, id);

    const updatedLoan = db.prepare('SELECT * FROM loans WHERE id = ?').get(id);

    return res.status(200).json({
      data: updatedLoan,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createLoan,
  listLoans,
  getLoanById,
  updateLoanStatus,
};
