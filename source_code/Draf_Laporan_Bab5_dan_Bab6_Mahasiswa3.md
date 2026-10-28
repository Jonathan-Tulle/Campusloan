# Draf Laporan Kelompok — Bab 5 & Bab 6 (Bagian Mahasiswa 3)

Dokumen ini disusun sebagai materi laporan resmi kelompok untuk **Bab 5 (Hasil Pengujian)** dan **Bab 6 (Evaluasi Kontribusi Anggota)** yang menjadi tanggung jawab penulisan **Mahasiswa 3**.

---

# BAB 5: HASIL PENGUJIAN

Pengujian sistem CampusLoan dilakukan secara komprehensif mengacu pada 10 skenario pengujian resmi (U01 s.d. U10) menggunakan Postman Collection (`CampusLoan.postman_collection.json`) serta otomasi program klien terminal (`client/client.js`). Seluruh pengujian dijalankan pada lingkungan lokal dengan dua layanan independen yang aktif: Layanan Katalog pada port 3001 dan Layanan Peminjaman pada port 3002.

## 5.1 Tabel Rekapitulasi 10 Skenario Pengujian Resmi

| ID | Skenario Pengujian | Akun & Prasyarat | Endpoint & Tindakan | Status Ekspektasi | Status Aktual | Hasil |
|---|---|---|---|---|---|---|
| **U01** | Login benar lalu login password salah | Akun `mhs_budi` | 1. `POST /api/v1/auth/login` (Password benar)<br/>2. `POST /api/v1/auth/login` (Password salah) | 1. 200 OK (Token JWT)<br/>2. 401 Unauthorized | 1. 200 OK<br/>2. 401 Unauthorized | **LULUS** |
| **U02** | Baca katalog & sifat aman GET | Token valid mahasiswa | 1. `GET /api/v1/facilities`<br/>2. `GET /api/v1/facilities/1`<br/>3. Ulangi GET berulang kali | 200 OK (Data sesuai seed & tidak termodifikasi) | 200 OK | **LULUS** |
| **U03** | Mahasiswa membuat pengajuan valid | Akun `mhs_budi`, fasilitas 1 aktif | `POST /api/v1/loans` (Jadwal valid di masa depan) | 201 Created (Status pending, inter-service call tercatat) | 201 Created | **LULUS** |
| **U04** | Admin menyetujui satu pending dan menolak pending lain *(Tanggung Jawab Mhs 3)* | Akun `admin_kampus` & 2 pengajuan pending | 1. `PATCH /api/v1/loans/1` (`status: approved`)<br/>2. `PATCH /api/v1/loans/2` (`status: rejected`) | 200 OK (Status tersimpan permanen) | 1. 200 OK<br/>2. 200 OK | **LULUS** |
| **U05** | Waktu selesai $\le$ mulai & bentrok jadwal | Akun `mhs_budi` | 1. `POST /api/v1/loans` ($end \le start$)<br/>2. `POST /api/v1/loans` (Irisan rentang waktu sama) | 1. 400 Bad Request<br/>2. 409 Conflict (`SCHEDULE_CONFLICT`) | 1. 400 Bad Request<br/>2. 409 Conflict | **LULUS** |
| **U06** | Akses endpoint terlindungi tanpa token | Tanpa header Authorization | 1. `GET /api/v1/facilities`<br/>2. `POST /api/v1/loans` | 401 Unauthorized (`TOKEN_MISSING`) | 401 Unauthorized | **LULUS** |
| **U07** | Akses dengan token kedaluwarsa | Token uji expired | `GET /api/v1/loans` dengan token kedaluwarsa | 401 Unauthorized (`TOKEN_EXPIRED` / `TOKEN_INVALID`) | 401 Unauthorized | **LULUS** |
| **U08** | Manipulasi payload role JWT tanpa signature *(Tanggung Jawab Mhs 3)* | Token mhs_budi diedit role menjadi admin | `PATCH /api/v1/loans/1` dengan token hasil manipulasi | 401 Unauthorized (`TOKEN_INVALID`) | 401 Unauthorized | **LULUS** |
| **U09** | Mahasiswa mencoba menyetujui pengajuan *(Tanggung Jawab Mhs 3)* | Token `mhs_budi` (Role `student`) | `PATCH /api/v1/loans/1` (`status: approved`) | 403 Forbidden (`FORBIDDEN`) | 403 Forbidden | **LULUS** |
| **U10** | Mahasiswa membaca data mahasiswa lain & memalsukan borrower_id *(Tanggung Jawab Mhs 3)* | Akun `mhs_budi` (A) & `mhs_sari` (B) | 1. Mahasiswa A panggil `GET /api/v1/loans/:id_B`<br/>2. Mahasiswa A kirim `POST /loans` dengan body `borrower_id: 3` | 1. 403 Forbidden<br/>2. 201 Created (borrower_id tetap 2) | 1. 403 Forbidden<br/>2. 201 Created | **LULUS** |

---

## 5.2 Analisis Skenario Khusus Tanggung Jawab Mahasiswa 3

### 1. Skenario U04: Persetujuan dan Penolakan Admin (PATCH)
* **Tujuan**: Membuktikan bahwa admin memiliki wewenang operasional untuk mengubah status pengajuan `pending` menjadi `approved` atau `rejected`.
* **Payload Request**:
  ```json
  PATCH /api/v1/loans/1
  Header: Authorization: Bearer <token_admin>
  Body: { "status": "approved" }
  ```
* **Respon Aktual (200 OK)**:
  ```json
  {
    "data": {
      "id": 1,
      "facility_id": 1,
      "borrower_id": 2,
      "start_at": "2026-11-10T01:00:00.000Z",
      "end_at": "2026-11-10T04:00:00.000Z",
      "purpose": "Seminar Tugas Akhir Mahasiswa Budi",
      "status": "approved",
      "created_at": "2026-10-28T02:00:00.000Z",
      "decided_by": 1,
      "decided_at": "2026-10-28T02:05:12.345Z"
    }
  }
  ```
* **Kesimpulan**: Status berhasil diperbarui menjadi `approved`, atribut `decided_by` tercatat ID admin (`1`), dan `decided_at` mencatat timestamp ISO UTC. Percobaan mengubah kembali pengajuan tersebut langsung ditolak dengan status **409 Conflict** (`INVALID_STATUS_TRANSITION`), membuktikan aturan finalitas status (BR-06).

### 2. Skenario U08: Penolakan Manipulasi Token JWT
* **Tujuan**: Membuktikan integritas tanda tangan kriptografis JWT HS256. Pengguna yang mencoba merekayasa payload (mengubah role `student` menjadi `admin`) tanpa kunci privat akan ditolak server.
* **Respon Aktual (401 Unauthorized)**:
  ```json
  {
    "error": {
      "code": "TOKEN_INVALID",
      "message": "Token tidak valid atau telah dimanipulasi.",
      "details": []
    }
  }
  ```

### 3. Skenario U09: Penolakan Hak Akses Peran Mahasiswa (RBAC)
* **Tujuan**: Memastikan mahasiswa tidak dapat mengakses endpoint operasional persetujuan pengajuan.
* **Tindakan**: Akun `mhs_budi` memanggil `PATCH /api/v1/loans/1`.
* **Respon Aktual (403 Forbidden)**:
  ```json
  {
    "error": {
      "code": "FORBIDDEN",
      "message": "Hanya akun dengan peran admin yang berhak memproses keputusan pengajuan.",
      "details": []
    }
  }
  ```

### 4. Skenario U10: Isolasi Kepemilikan Data dan Integritas Identitas
* **Tujuan**: Memvalidasi kepatuhan aturan BR-11 (server mengabaikan `borrower_id` pada body) dan BR-13 (mahasiswa hanya boleh membaca pengajuan miliknya sendiri).
* **Tindakan 1**: Mahasiswa Budi memanggil `GET /api/v1/loans/:id_sari` $\rightarrow$ Server menolak dengan **403 Forbidden** (`Akses ditolak. Anda tidak berhak melihat data pengajuan mahasiswa lain.`).
* **Tindakan 2**: Mahasiswa Budi membuat permohonan baru dengan menyuntikkan body `{"borrower_id": 3}` $\rightarrow$ Server tetap merespons **201 Created**, namun atribut `borrower_id` yang tersimpan adalah `2` (identitas resmi dari klaim JWT sub milik Budi).

---

# BAB 6: EVALUASI DAN KONTRIBUSI ANGGOTA

## 6.1 Matriks Kontribusi Konkret Anggota Tim

| Anggota Tim | Peran Resmi | Berkas Kodingan Konkret | Skenario Pengujian | Bagian Laporan |
|---|---|---|---|---|
| **Mahasiswa 1** | Pengembang Layanan Katalog & Autentikasi | • `catalog-service/src/server.js`<br/>• `catalog-service/src/controllers/catalog.js`<br/>• `loan-service/src/controllers/auth.js`<br/>• `catalog-service/data/seed.js` | U01, U02, U06, U07 | Bab 1 & Bab 4 |
| **Mahasiswa 2** | Pengembang Layanan Peminjaman & Integritas Transaksi | • `loan-service/src/services/loanService.js`<br/>• `loan-service/src/clients/catalogClient.js`<br/>• `loan-service/src/controllers/loan.js` (`createLoan`, `listLoans`) | U03, U05 | Bab 2 & Bab 3 |
| **Mahasiswa 3** | Pengembang Program Klien & Otorisasi Operasional Admin | • `client/client.js`<br/>• `loan-service/src/controllers/loan.js` (`updateLoanStatus`, `getLoanById`)<br/>• `postman/CampusLoan.postman_collection.json` | U04, U08, U09, U10 | Bab 5 & Bab 6 |

---

## 6.2 Evaluasi Capaian Kerja Mahasiswa 3

1. **Program Klien Konsol Otomatis (`client/client.js`)**:
   * Berhasil membangun program terminal berbasis Node.js murni tanpa dependensi pihak ketiga tambahan.
   * Mengotomasi 4 langkah sekuensial interaksi mahasiswa dengan tampilan antarmuka tabel konsol dan kode warna yang komunikatif.
2. **Endpoint Persetujuan Admin (`PATCH /api/v1/loans/:id`)**:
   * Menerapkan metode HTTP `PATCH` secara tepat (RMM Level 2) untuk modifikasi status parsial, menghemat bandwidth jaringan dibanding `PUT`.
   * Memastikan finalitas status (pengajuan `approved`/`rejected` tidak dapat diubah kembali) sesuai BR-06.
3. **Kontrol Kepemilikan Data (`GET /api/v1/loans/:id`)**:
   * Mengisolasi data pengajuan sehingga mahasiswa hanya dapat mengakses miliknya sendiri, sementara administrator sarpras memiliki hak visibilitas menyeluruh.
4. **Postman Collection Terpadu (`CampusLoan.postman_collection.json`)**:
   * Menyusun 10 folder pengujian lengkap dengan *assertion scripts* JavaScript otomatis yang memverifikasi kode status dan struktur JSON response.

---

## 6.3 Kendala Teknis dan Solusi Implementasi

1. **Kendala 1: Pencegahan Bentrok Jadwal Berulang pada Skrip Terminal Klien**
   * *Masalah*: Jika skrip `client.js` dijalankan berulang kali dengan tanggal statis, eksekusi kedua akan ditolak oleh server dengan status 409 Conflict akibat aturan pencegahan bentrok jadwal.
   * *Solusi*: Mahasiswa 3 membuat tanggal masa depan dinamis berbasis tanggal esok hari dengan jam dinamis sehingga pengujian konsol dapat diulang tanpa manual update.

2. **Kendala 2: Validasi Signature Token Terhadap Upaya Eskalasi Peran (Privilege Escalation)**
   * *Masalah*: Klien dapat mencoba mengubah string payload base64 JWT secara manual dari `student` menjadi `admin`.
   * *Solusi*: Mengunci algoritma verifikasi server pada `HS256` menggunakan middleware `verifyToken`. Modifikasi payload tanpa kunci rahasia server otomatis menyebabkan kegagalan signature verification (`TOKEN_INVALID`).

3. **Kendala 3: Isolasi Kepemilikan vs Akses Administrator Sarpras**
   * *Masalah*: Handler `getLoanById` harus mampu membedakan kebutuhan otorisasi antara mahasiswa (terisolasi) dan admin (global).
   * *Solusi*: Mengimplementasikan validasi logika bersyarat berbasis peran:
     `if (req.user.role === 'student' && loan.borrower_id !== req.user.id) return 403;`
     Dengan aturan ini, administrator secara inheren dapat meninjau seluruh data pengajuan tanpa terblokir.

---

## 6.4 Refleksi Pembelajaran Individu (Mahasiswa 3)

Melalui pengerjaan proyek CampusLoan ini, Mahasiswa 3 memperoleh pemahaman praktis yang mendalam mengenai:
1. Penerapan arsitektur berorientasi layanan (*Service-Oriented Architecture*) dan prinsip *loose coupling* di mana klien tidak pernah berinteraksi langsung dengan database, melainkan murni melalui kontrak REST API yang terstandar.
2. Pentingnya penegakan *Role-Based Access Control* (RBAC) dan verifikasi identitas stateless menggunakan JSON Web Token pada arsitektur terdistribusi.
3. Semantik kata kerja HTTP (khususnya perbedaan filosofis dan teknis antara `PATCH` dan `PUT`) serta pentingnya otomasi pengujian API menggunakan Postman dan program klien mandiri.
