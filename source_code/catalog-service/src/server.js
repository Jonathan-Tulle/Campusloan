'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const facilitiesRouter = require('./routes/facilities');

const app = express();
const PORT = parseInt(process.env.CATALOG_PORT, 10) || 3001;

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


// Tolak request dengan Content-Type JSON yang tidak valid (body rusak)
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'Body request bukan JSON yang valid.',
        details: [],
      },
    });
  }
  return next(err);
});

// Rute 
app.use('/api/v1/facilities', facilitiesRouter);

// Root endpoint - informasi layanan
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'CampusLoan - Catalog Service',
    version: '1.0.0',
    status: 'running',
    port: PORT,
    endpoints: {
      health: '/health',
      facilities: '/api/v1/facilities',
      facility_detail: '/api/v1/facilities/:id',
    },
  });
});

// Health check - tidak memerlukan autentikasi
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'catalog-service', port: PORT });
});

// Tangani rute yang tidak dikenal
app.use((req, res) => {
  res.status(404).json({
    error: {
      code:    'ROUTE_NOT_FOUND',
      message: 'Rute ' + req.method + ' ' + req.path + ' tidak ditemukan.',
      details: [],
    },
  });
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error('[Catalog Service] Unhandled error:', err.message);
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
    console.log('[Catalog Service] Berjalan di http://localhost:' + PORT);
    console.log('[Catalog Service] Endpoint: GET /api/v1/facilities');
    console.log('[Catalog Service] Endpoint: GET /api/v1/facilities/:id');
  });
}

module.exports = app; // diekspor untuk keperluan pengujian (supertest)
