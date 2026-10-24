'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const authRouter = require('./routes/auth');

const app = express();
const PORT = parseInt(process.env.LOAN_PORT, 10) || 3002;

// Middleware global 
app.use(express.json());

// Rute publik 
app.use('/api/v1/auth', authRouter);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'loan-service', port: PORT });
});

// Placeholder untuk rute yang dikerjakan Mahasiswa 2 & 3 
// Rute /api/v1/loans akan didaftarkan oleh Mahasiswa 2 (loan controller)
// Middleware RBAC akan didaftarkan oleh Mahasiswa 2 (rbac middleware)

// Tangani rute yang tidak dikenal
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'Rute ' + req.method + ' ' + req.path + ' tidak ditemukan.',
      details: [],
    },
  });
});

// Global error handler
app.use((err, req, res, _next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'Body request bukan JSON yang valid.',
        details: [],
      },
    });
  }
  console.error('[Loan Service] Unhandled error:', err.message);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Terjadi kesalahan pada server.',
      details: [],
    },
  });
});

// Mulai server (hanya jika dijalankan langsung, bukan di-require)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log('[Loan Service] Berjalan di http://localhost:' + PORT);
    console.log('[Loan Service] Endpoint: POST /api/v1/auth/login');
  });
}

module.exports = app; // diekspor untuk keperluan pengujian (supertest)
