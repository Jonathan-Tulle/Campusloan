'use strict';

/**
 * Program Klien Terminal Konsol — CampusLoan.
 * Menjalankan alur otomatis mahasiswa secara terurut:
 * 1. Login akun mahasiswa mhs_budi dan memperoleh token JWT
 * 2. Mengambil katalog fasilitas dari Layanan Katalog (Port 3001)
 * 3. Membuat pengajuan peminjaman baru ke Layanan Peminjaman (Port 3002)
 * 4. Menampilkan riwayat pengajuan milik mahasiswa tersebut
 */

const CATALOG_URL = process.env.CATALOG_BASE_URL || 'http://localhost:3001';
const LOAN_URL = process.env.LOAN_BASE_URL || 'http://localhost:3002';

const CREDENTIALS = {
  username: 'mhs_budi',
  password: 'Budi#Pass2026',
};

async function runClientFlow() {
  console.log('\n======================================================');
  console.log('  CAMPUSLOAN — PROGRAM KLIEN TERMINAL MAHASISWA');
  console.log('======================================================\n');

  // 1. Login Mahasiswa
  console.log('[Langkah 1] Melakukan login sebagai mahasiswa: ' + CREDENTIALS.username);
  const loginRes = await fetch(LOAN_URL + '/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(CREDENTIALS),
  });

  const loginBody = await loginRes.json();
  if (!loginRes.ok) {
    console.error('Login gagal:', loginBody);
    process.exit(1);
  }

  const token = loginBody.data.token;
  console.log('✓ Login berhasil!');
  console.log('  Pengguna   :', loginBody.data.user.full_name + ' (' + loginBody.data.user.role + ')');
  console.log('  Token JWT  :', token.slice(0, 30) + '... (disimpan di memori)\n');

  const authHeaders = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token,
  };

  // 2. Baca Katalog Fasilitas (Port 3001)
  console.log('[Langkah 2] Mengambil daftar fasilitas dari Layanan Katalog (Port 3001)...');
  const catalogRes = await fetch(CATALOG_URL + '/api/v1/facilities', {
    method: 'GET',
    headers: authHeaders,
  });

  const catalogBody = await catalogRes.json();
  if (!catalogRes.ok) {
    console.error('Gagal mengambil katalog:', catalogBody);
    process.exit(1);
  }

  const facilities = catalogBody.data.facilities;
  console.log('✓ Berhasil memperoleh ' + facilities.length + ' fasilitas kampus:');
  console.table(
    facilities.map((f) => ({
      ID: f.id,
      Nama: f.name,
      Kategori: f.category,
      Status: f.is_active === 1 ? 'Aktif' : 'Nonaktif',
    }))
  );
  console.log('');

  // 3. Mengajukan Peminjaman Fasilitas (Port 3002)
  console.log('[Langkah 3] Mengirimkan pengajuan peminjaman fasilitas baru (Port 3002)...');

  // Menggunakan tanggal besok dengan jam unik berdasarkan timestamp menit agar aman dieksekusi berulang kali
  const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  const hour = String(new Date().getHours()).padStart(2, '0');

  const startAt = year + '-' + month + '-' + day + 'T' + hour + ':00:00+07:00';
  const endAt = year + '-' + month + '-' + day + 'T' + hour + ':45:00+07:00';

  const loanPayload = {
    facility_id: 1,
    start_at: startAt,
    end_at: endAt,
    purpose: 'Peminjaman Ruang Seminar untuk Diskusi Tugas Akhir ABS Kelompok 3',
  };

  console.log('  Data Pengajuan:');
  console.log('  - Fasilitas ID :', loanPayload.facility_id);
  console.log('  - Waktu Mulai  :', loanPayload.start_at);
  console.log('  - Waktu Selesai:', loanPayload.end_at);
  console.log('  - Keperluan    :', loanPayload.purpose);

  const loanRes = await fetch(LOAN_URL + '/api/v1/loans', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(loanPayload),
  });

  const loanBody = await loanRes.json();
  if (loanRes.status === 201) {
    console.log('✓ Pengajuan peminjaman berhasil dibuat! (Status HTTP 201 Created)');
    console.log('  ID Pengajuan   :', loanBody.data.id);
    console.log('  Status Awal    :', loanBody.data.status);
    console.log('  Peminjam ID    :', loanBody.data.borrower_id);
  } else if (loanRes.status === 409) {
    console.log('ℹ Jadwal bertumpang tindih dengan pengajuan aktif sebelumnya (Status HTTP 409 Conflict):');
    console.log('  Pesan:', loanBody.error.message);
  } else {
    console.error('Pengajuan gagal:', loanBody);
  }
  console.log('');

  // 4. Melihat Riwayat Pengajuan Sendiri (Port 3002)
  console.log('[Langkah 4] Menampilkan riwayat pengajuan peminjaman milik mahasiswa...');
  const myLoansRes = await fetch(LOAN_URL + '/api/v1/loans', {
    method: 'GET',
    headers: authHeaders,
  });

  const myLoansBody = await myLoansRes.json();
  if (!myLoansRes.ok) {
    console.error('Gagal mengambil riwayat peminjaman:', myLoansBody);
    process.exit(1);
  }

  const myLoans = myLoansBody.data;
  console.log('✓ Daftar pengajuan peminjaman Anda (' + myLoans.length + ' pengajuan):');
  console.table(
    myLoans.map((l) => ({
      ID: l.id,
      FasilitasID: l.facility_id,
      Mulai: l.start_at,
      Selesai: l.end_at,
      Status: l.status,
      Dibuat: l.created_at,
    }))
  );

  console.log('\n======================================================');
  console.log('  ALUR KLIEN MAHASISWA BERHASIL DISELESAIKAN');
  console.log('======================================================\n');
}

runClientFlow().catch((err) => {
  console.error('\n[Error Klien Terminal]:', err.message);
  process.exit(1);
});
