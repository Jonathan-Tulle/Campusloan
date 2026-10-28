'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const authRouter = require('./routes/auth');
const loansRouter = require('./routes/loans');

const app = express();
const PORT = parseInt(process.env.LOAN_PORT, 10) || 3002;

// Middleware global 
app.use(express.json());

// CORS - Memungkinkan akses dari browser dan inter-service
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Sajikan antarmuka Web GUI publik
app.use(express.static(path.resolve(__dirname, '../public')));

// Rute publik 
app.use('/api/v1/auth', authRouter);

// Rute transaksi peminjaman
app.use('/api/v1/loans', loansRouter);

// Root endpoint - informasi layanan
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'CampusLoan - Loan Service',
    version: '1.0.0',
    status: 'running',
    port: PORT,
    endpoints: {
      health: '/health',
      auth_login: '/api/v1/auth/login',
      loans: '/api/v1/loans',
      loan_detail: '/api/v1/loans/:id',
    },
  });
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'loan-service', port: PORT });
});

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
