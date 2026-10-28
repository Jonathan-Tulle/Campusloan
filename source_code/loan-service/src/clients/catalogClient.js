'use strict';

/**
 * HTTP Client untuk komunikasi antar-layanan (Loan Service -> Catalog Service).
 * Meneruskan Bearer token pengguna dan mencatat log terstruktur untuk auditabilitas.
 */

const DEFAULT_CATALOG_BASE_URL = 'http://localhost:3001';
const REQUEST_TIMEOUT_MS = 3000;

async function getFacilityById(facilityId, bearerToken) {
  const baseUrl = process.env.CATALOG_BASE_URL || DEFAULT_CATALOG_BASE_URL;
  const targetUrl = baseUrl + '/api/v1/facilities/' + facilityId;

  const originPort = process.env.LOAN_PORT || '3002';
  const targetPort = baseUrl.split(':').pop().replace(/\D/g, '') || '3001';

  const startTime = Date.now();
  const requestTimeIso = new Date().toISOString();

  // Log outgoing request
  console.log('[INTER-SERVICE CALL] ' + requestTimeIso + ' | OUTGOING HTTP REQUEST');
  console.log('  Origin Service : Loan-Service (Port ' + originPort + ')');
  console.log('  Target Service : Catalog-Service (Port ' + targetPort + ')');
  console.log('  Method / URL   : GET ' + targetUrl);
  console.log('  Headers Sent   : { "Authorization": "Bearer ' + (bearerToken ? bearerToken.slice(0, 15) + '...' : 'none') + '" }');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': 'Bearer ' + bearerToken,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;
    const responseTimeIso = new Date().toISOString();

    const responseBodyText = await response.text();
    let responseData = null;
    try {
      responseData = JSON.parse(responseBodyText);
    } catch (_e) {
      responseData = responseBodyText;
    }

    // Log incoming response
    console.log('[INTER-SERVICE RESP] ' + responseTimeIso + ' | INCOMING HTTP RESPONSE');
    console.log('  Response Status: ' + response.status + ' ' + response.statusText + ' (Latency: ' + latency + 'ms)');
    console.log('  Response Body  : ' + JSON.stringify(responseData));

    if (response.status === 404) {
      const err = new Error('Fasilitas dengan ID ' + facilityId + ' tidak ditemukan di Katalog.');
      err.status = 404;
      err.code = 'FACILITY_NOT_FOUND';
      throw err;
    }

    if (response.status === 401) {
      const err = new Error('Katalog menolak otentikasi token.');
      err.status = 401;
      err.code = 'CATALOG_UNAUTHORIZED';
      throw err;
    }

    if (!response.ok) {
      const err = new Error('Layanan Katalog merespons status error: ' + response.status);
      err.status = 502;
      err.code = 'CATALOG_ERROR';
      throw err;
    }

    const facility = responseData && responseData.data ? responseData.data : responseData;

    // BR-10: Fasilitas harus aktif
    if (facility.is_active === 0 || facility.is_active === false) {
      const err = new Error('Fasilitas "' + facility.name + '" sedang nonaktif atau dalam pemeliharaan.');
      err.status = 409;
      err.code = 'FACILITY_INACTIVE';
      throw err;
    }

    return facility;
  } catch (err) {
    clearTimeout(timeoutId);

    if (err.status) {
      throw err;
    }

    const isTimeout = err.name === 'AbortError';
    const errorMsg = isTimeout
      ? 'Panggilan ke Layanan Katalog melebihi batas waktu (timeout ' + REQUEST_TIMEOUT_MS + 'ms).'
      : 'Gagal terhubung ke Layanan Katalog: ' + err.message;

    console.error('[INTER-SERVICE ERROR] ' + errorMsg);

    const serviceError = new Error('Layanan Katalog tidak dapat dihubungi saat ini.');
    serviceError.status = 503;
    serviceError.code = 'CATALOG_SERVICE_UNAVAILABLE';
    throw serviceError;
  }
}

module.exports = { getFacilityById };
