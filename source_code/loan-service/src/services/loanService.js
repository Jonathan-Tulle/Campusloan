'use strict';

const { getDb } = require('../config/database');

const ISO_WITH_OFFSET_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

/**
 * Validasi format ISO 8601 dengan offset eksplisit dan urutan waktu.
 * Mengembalikan objek waktu yang dinormalisasi ke standar UTC (ISO String).
 */
function validateAndNormalizeTimeRange(startAtStr, endAtStr) {
  if (typeof startAtStr !== 'string' || typeof endAtStr !== 'string') {
    const err = new Error('Field start_at dan end_at wajib bertipe string.');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  if (!ISO_WITH_OFFSET_REGEX.test(startAtStr)) {
    const err = new Error('Format start_at tidak valid. Wajib berupa ISO 8601 dengan offset eksplisit (misal: +07:00 atau Z).');
    err.status = 400;
    err.code = 'INVALID_DATE_FORMAT';
    throw err;
  }

  if (!ISO_WITH_OFFSET_REGEX.test(endAtStr)) {
    const err = new Error('Format end_at tidak valid. Wajib berupa ISO 8601 dengan offset eksplisit (misal: +07:00 atau Z).');
    err.status = 400;
    err.code = 'INVALID_DATE_FORMAT';
    throw err;
  }

  const startDate = new Date(startAtStr);
  const endDate = new Date(endAtStr);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    const err = new Error('Nilai tanggal start_at atau end_at tidak valid.');
    err.status = 400;
    err.code = 'INVALID_DATE_FORMAT';
    throw err;
  }

  if (endDate.getTime() <= startDate.getTime()) {
    const err = new Error('Waktu selesai (end_at) harus lebih besar secara mutlak dibanding waktu mulai (start_at).');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  return {
    startUtc: startDate.toISOString(),
    endUtc: endDate.toISOString(),
  };
}

/**
 * Deteksi bentrok jadwal pada fasilitas yang sama untuk pengajuan berstatus 'pending' atau 'approved'.
 * Menggunakan rumus irisan: (start_baru < end_lama) AND (end_baru > start_lama).
 * Batas waktu yang hanya menempel tepat diperbolehkan.
 */
function findScheduleConflict(facilityId, startUtc, endUtc, excludeLoanId = null) {
  const db = getDb();

  let sql =
    'SELECT id, facility_id, borrower_id, start_at, end_at, status FROM loans ' +
    'WHERE facility_id = ? ' +
    '  AND status IN (\'pending\', \'approved\') ' +
    '  AND start_at < ? ' +
    '  AND end_at > ? ';

  const params = [facilityId, endUtc, startUtc];

  if (excludeLoanId) {
    sql += '  AND id != ? ';
    params.push(excludeLoanId);
  }

  sql += 'LIMIT 1';

  return db.prepare(sql).get(...params);
}

module.exports = {
  validateAndNormalizeTimeRange,
  findScheduleConflict,
};
