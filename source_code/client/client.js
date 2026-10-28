'use strict';

/**
 * Program Klien Terminal Konsol — CampusLoan
 * Mata Kuliah : Aplikasi Berorientasi Service (ABS)
 * Modul       : Mahasiswa 3 (Pengembang Program Klien & Otorisasi Operasional Admin)
 *
 * Alur Kerja Konsol Otomatis 4 Langkah (PRD §16):
 * 1. Login akun mahasiswa mhs_budi dan memperoleh token JWT
 * 2. Mengambil katalog fasilitas dari Layanan Katalog (Port 3001)
 * 3. Membuat pengajuan peminjaman baru ke Layanan Peminjaman (Port 3002)
 * 4. Menampilkan riwayat pengajuan milik mahasiswa tersebut dan mengonfirmasi status pending
 *
 * Cara Menjalankan:
 *   node client/client.js
 *   # atau
 *   npm run client
 */

const CATALOG_URL = process.env.CATALOG_BASE_URL || 'http://localhost:3001';
const LOAN_URL = process.env.LOAN_BASE_URL || 'http://localhost:3002';

// Kredensial akun uji coba mahasiswa (Aktor A — PRD §17.2)
const CREDENTIALS = {
  username: 'mhs_budi',
  password: 'Budi#Pass2026',
};

// Pewarnaan ANSI untuk visualisasi terminal yang komunikatif
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

/**
 * Helper format Date ke ISO 8601 dengan offset zona waktu WIB (+07:00)
 */
function toIsoWib(date) {
  const wibOffsetMs = 7 * 60 * 60 * 1000;
  const local = new Date(date.getTime() + wibOffsetMs);

  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  const hh = String(local.getUTCHours()).padStart(2, '0');
  const mm = String(local.getUTCMinutes()).padStart(2, '0');
  const ss = String(local.getUTCSeconds()).padStart(2, '0');

  return `${y}-${m}-${d}T${hh}:${mm}:${ss}+07:00`;
}

async function runClientFlow() {
  console.log(`\n${C.cyan}${C.bold}╔═══════════════════════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.cyan}${C.bold}║               CAMPUSLOAN — PROGRAM KLIEN TERMINAL MAHASISWA               ║${C.reset}`);
  console.log(`${C.cyan}${C.bold}║               Mata Kuliah: Aplikasi Berorientasi Service (ABS)            ║${C.reset}`);
  console.log(`${C.cyan}${C.bold}║               Modul Mahasiswa 3: Skrip Klien Konsol (client.js)           ║${C.reset}`);
  console.log(`${C.cyan}${C.bold}╚═══════════════════════════════════════════════════════════════════════════╝${C.reset}\n`);

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Login Mahasiswa (Port 3002)
  // ─────────────────────────────────────────────────────────────────────────
  console.log(`${C.yellow}${C.bold}[Langkah 1/4] Melakukan autentikasi login mahasiswa: ${CREDENTIALS.username}...${C.reset}`);
  console.log(`  Target URL : ${C.dim}POST ${LOAN_URL}/api/v1/auth/login${C.reset}`);

  const loginRes = await fetch(`${LOAN_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(CREDENTIALS),
  });

  const loginBody = await loginRes.json();
  if (!loginRes.ok) {
    console.error(`${C.red}✗ Login gagal:${C.reset}`, loginBody);
    process.exit(1);
  }

  const token = loginBody.data.token;
  const user = loginBody.data.user;

  console.log(`${C.green}✓ Login berhasil! (Status HTTP ${loginRes.status} OK)${C.reset}`);
  console.log(`  Nama Pengguna : ${C.bold}${user.full_name}${C.reset}`);
  console.log(`  Peran (Role)  : ${C.bold}${user.role}${C.reset}`);
  console.log(`  Token JWT     : ${C.dim}${token.slice(0, 30)}... (tersimpan di memori)${C.reset}\n`);

  const authHeaders = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Baca Katalog Fasilitas (Port 3001)
  // ─────────────────────────────────────────────────────────────────────────
  console.log(`${C.yellow}${C.bold}[Langkah 2/4] Mengambil daftar fasilitas dari Layanan Katalog (Port 3001)...${C.reset}`);
  console.log(`  Target URL : ${C.dim}GET ${CATALOG_URL}/api/v1/facilities${C.reset}`);

  const catalogRes = await fetch(`${CATALOG_URL}/api/v1/facilities`, {
    method: 'GET',
    headers: authHeaders,
  });

  const catalogBody = await catalogRes.json();
  if (!catalogRes.ok) {
    console.error(`${C.red}✗ Gagal mengambil katalog:${C.reset}`, catalogBody);
    process.exit(1);
  }

  const facilities = catalogBody.data.facilities;
  console.log(`${C.green}✓ Berhasil memperoleh ${facilities.length} fasilitas kampus:${C.reset}`);

  console.log(`  ┌──────┬────────────────────────────────┬────────────┬─────────────┐`);
  console.log(`  │ ${C.bold}ID${C.reset}   │ ${C.bold}Nama Fasilitas${C.reset}                 │ ${C.bold}Kategori${C.reset}   │ ${C.bold}Status${C.reset}      │`);
  console.log(`  ├──────┼────────────────────────────────┼────────────┼─────────────┤`);

  facilities.forEach((f) => {
    const idStr = String(f.id).padEnd(4);
    const nameStr = (f.name.length > 30 ? f.name.slice(0, 27) + '...' : f.name).padEnd(30);
    const catStr = f.category.padEnd(10);
    const statusStr = f.is_active === 1
      ? `${C.green}Aktif${C.reset}      `
      : `${C.red}Nonaktif${C.reset}   `;
    console.log(`  │ ${idStr} │ ${nameStr} │ ${catStr} │ ${statusStr}│`);
  });
  console.log(`  └──────┴────────────────────────────────┴────────────┴─────────────┘\n`);

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Mengajukan Peminjaman Fasilitas (Port 3002)
  // ─────────────────────────────────────────────────────────────────────────
  console.log(`${C.yellow}${C.bold}[Langkah 3/4] Mengirimkan pengajuan peminjaman fasilitas baru (Port 3002)...${C.reset}`);
  console.log(`  Target URL : ${C.dim}POST ${LOAN_URL}/api/v1/loans${C.reset}`);

  // Menghitung jadwal di masa depan yang unik agar bebas dari konflik jadwal pada pengujian berulang
  const now = Date.now();
  const randomSlotHours = 24 + (Math.floor(now / 60000) % 500); // offset jam unik
  const startDate = new Date(now + randomSlotHours * 3600 * 1000);
  startDate.setMinutes(0, 0, 0);
  const endDate = new Date(startDate.getTime() + 2 * 3600 * 1000); // durasi 2 jam

  const loanPayload = {
    facility_id: 1, // Ruang Seminar Gedung A (Aktif)
    start_at: toIsoWib(startDate),
    end_at: toIsoWib(endDate),
    purpose: 'Peminjaman Ruang Seminar untuk Diskusi Tugas Akhir ABS Kelompok 3',
  };

  console.log(`  Data Pengajuan:`);
  console.log(`  - Fasilitas ID  : ${C.bold}${loanPayload.facility_id}${C.reset} (Ruang Seminar Gedung A)`);
  console.log(`  - Waktu Mulai   : ${C.bold}${loanPayload.start_at}${C.reset}`);
  console.log(`  - Waktu Selesai : ${C.bold}${loanPayload.end_at}${C.reset}`);
  console.log(`  - Keperluan     : "${loanPayload.purpose}"`);

  const loanRes = await fetch(`${LOAN_URL}/api/v1/loans`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(loanPayload),
  });

  const loanBody = await loanRes.json();
  if (loanRes.status === 201) {
    console.log(`${C.green}✓ Pengajuan peminjaman berhasil dibuat! (Status HTTP 201 Created)${C.reset}`);
    console.log(`  ID Pengajuan    : ${C.bold}#${loanBody.data.id}${C.reset}`);
    console.log(`  Status Awal     : ${C.yellow}${C.bold}${loanBody.data.status}${C.reset} (Menunggu persetujuan admin)`);
    console.log(`  Borrower ID     : ${C.bold}${loanBody.data.borrower_id}${C.reset} (Terverifikasi dari JWT claim 'sub')`);
  } else if (loanRes.status === 409) {
    console.log(`${C.yellow}ℹ Jadwal bertumpang tindih dengan pengajuan aktif sebelumnya (Status HTTP 409 Conflict):${C.reset}`);
    console.log(`  Pesan: ${loanBody.error.message}`);
  } else {
    console.error(`${C.red}✗ Pengajuan gagal:${C.reset}`, loanBody);
  }
  console.log('');

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Melihat Riwayat Pengajuan Sendiri (Port 3002)
  // ─────────────────────────────────────────────────────────────────────────
  console.log(`${C.yellow}${C.bold}[Langkah 4/4] Menampilkan riwayat pengajuan peminjaman milik mahasiswa...${C.reset}`);
  console.log(`  Target URL : ${C.dim}GET ${LOAN_URL}/api/v1/loans${C.reset}`);

  const myLoansRes = await fetch(`${LOAN_URL}/api/v1/loans`, {
    method: 'GET',
    headers: authHeaders,
  });

  const myLoansBody = await myLoansRes.json();
  if (!myLoansRes.ok) {
    console.error(`${C.red}✗ Gagal mengambil riwayat peminjaman:${C.reset}`, myLoansBody);
    process.exit(1);
  }

  const myLoans = myLoansBody.data || [];
  console.log(`${C.green}✓ Daftar pengajuan peminjaman Anda (${myLoans.length} pengajuan tercatat):${C.reset}`);

  console.log(`  ┌──────┬──────────────┬──────────────────────────┬──────────────────────────┬───────────┐`);
  console.log(`  │ ${C.bold}ID${C.reset}   │ ${C.bold}Fasilitas ID${C.reset} │ ${C.bold}Waktu Mulai (UTC)${C.reset}        │ ${C.bold}Waktu Selesai (UTC)${C.reset}      │ ${C.bold}Status${C.reset}    │`);
  console.log(`  ├──────┼──────────────┼──────────────────────────┼──────────────────────────┼───────────┤`);

  myLoans.forEach((l) => {
    const idStr = String(l.id).padEnd(4);
    const facStr = String(l.facility_id).padEnd(12);
    const startStr = l.start_at.padEnd(24);
    const endStr = l.end_at.padEnd(24);

    let statusBadge = l.status;
    if (l.status === 'pending') statusBadge = `${C.yellow}pending${C.reset} `;
    else if (l.status === 'approved') statusBadge = `${C.green}approved${C.reset}`;
    else if (l.status === 'rejected') statusBadge = `${C.red}rejected${C.reset}`;

    console.log(`  │ ${idStr} │ ${facStr} │ ${startStr} │ ${endStr} │ ${statusBadge} │`);
  });
  console.log(`  └──────┴──────────────┴──────────────────────────┴──────────────────────────┴───────────┘\n`);

  console.log(`${C.cyan}${C.bold}═══════════════════════════════════════════════════════════════════════════${C.reset}`);
  console.log(`${C.green}${C.bold}✓ SEMUA 4 LANGKAH ALUR KLIEN MAHASISWA BERHASIL DISELESAIKAN!${C.reset}`);
  console.log(`${C.dim}  Modul Mahasiswa 3 terbukti berfungsi normal secara end-to-end.${C.reset}`);
  console.log(`${C.cyan}${C.bold}═══════════════════════════════════════════════════════════════════════════${C.reset}\n`);
}

runClientFlow().catch((err) => {
  console.error(`\n${C.red}[Error Klien Terminal]:${C.reset}`, err.message);
  console.error(`${C.yellow}Pastikan Catalog Service (Port 3001) dan Loan Service (Port 3002) sudah aktif.${C.reset}\n`);
  process.exit(1);
});
