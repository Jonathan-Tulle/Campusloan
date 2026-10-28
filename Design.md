# CampusLoan: System Architecture and Engineering Design Document

> Dokumen Desain Teknis dan Spesifikasi Arsitektur Sistem Peminjaman Fasilitas Kampus Berbasis SOA dan REST API.
> Disusun berdasarkan analisis komprehensif terhadap Product Requirements Document (PRD), Dokumen Tugas Kelompok ABS 2026 v1 (PDF), dan Matriks Pembagian Peran Tim (DOCX).

---

## 1. Analisis Status Proyek dan Identifikasi Kesenjangan (Gap Analysis)

Berdasarkan audit mendalam terhadap seluruh berkas di repositori `Campusloan`, ditemukan bahwa struktur dasar proyek telah dipersiapkan oleh Mahasiswa 1 (Layanan Katalog dan Autentikasi Dasar), namun sebagian besar logika bisnis inti, inter-service communication, modul transaksi, kontrol akses peran, klien terminal, dan artefak pengujian masih belum diimplementasikan.

### 1.1 Matriks Kesenjangan Implementasi per Komponen

| Komponen | Status Saat Ini | Kebutuhan Spesifikasi | Tingkat Urgensi | Solusi Teknis |
|---|---|---|---|---|
| **Catalog Service (Port 3001)** | DDL, Seed, Controller `catalog.js`, Routes `facilities.js`, JWT middleware selesai. | Perlu konfigurasi `.env` aktif dan pengujian inter-service compatibility. | Menengah | Buat berkas `.env` dari `.env.example`, pastikan port 3001 dan `JWT_SECRET` sinkron. |
| **Loan Service - Catalog Client** | Berkas `src/clients/catalogClient.js` belum ada (`.gitkeep`). | Modul HTTP client untuk memverifikasi fasilitas ke port 3001 dengan meneruskan token Bearer, timeout 3000 ms, dan structured logging. | Kritis | Implementasikan `catalogClient.js` dengan HTTP request native atau node-fetch/axios (native `http`/`fetch` bawaan Node.js >= 18), pencatatan log `[INTER-SERVICE CALL]`, penanganan status 404, 409, dan 503 saat timeout. |
| **Loan Service - Overlap Engine** | Berkas `src/services/loanService.js` belum ada (`.gitkeep`). | Mesin validasi ISO 8601 dengan offset eksplisit, konversi UTC, validasi $end > start$, dan deteksi bentrok jadwal atomik. | Kritis | Implementasikan `loanService.js` dengan rumus `(start_baru < end_lama) AND (end_baru > start_lama)` untuk status `pending` dan `approved`. |
| **Loan Service - RBAC & Owner Check** | Berkas `src/middleware/rbac.js` belum ada. | Penegakan peran (`student` vs `admin`) dan pemisahan hak akses per endpoint. | Kritis | Implementasikan `rbac.js` yang memeriksa `req.user.role`. Menolak mahasiswa yang mencoba akses fitur admin dengan 403, dan menolak admin membuat loan dengan 403. |
| **Loan Service - Controller Loans** | Berkas `src/controllers/loan.js` belum ada. | 4 Endpoint utama: `POST /loans`, `GET /loans`, `GET /loans/:id`, dan `PATCH /loans/:id`. | Kritis | Implementasikan seluruh logika handler sesuai kontrak spesifikasi PRD Bab 13 dan PDF Bagian 3.1. |
| **Loan Service - Routes Loans** | Berkas `src/routes/loans.js` belum ada. | Pendaftaran route `/api/v1/loans` pada Express server port 3002. | Kritis | Hubungkan `loans.js` ke `src/server.js`. |
| **Program Klien Terminal** | Berkas `source_code/client/client.js` belum ada. | Skrip otomasi terminal: login mahasiswa, ambil katalog, buat permohonan peminjaman, dan cek status peminjaman. | Kritis | Implementasikan `client/client.js` dengan tampilan konsol terformat yang informatif dan mandiri. |
| **Koleksi Postman** | Berkas `source_code/postman/CampusLoan.postman_collection.json` belum ada. | Koleksi Postman resmi untuk mengeksekusi 10 skenario pengujian resmi (U01 - U10). | Kritis | Susun berkas JSON koleksi Postman v2.1 yang siap diimpor untuk demonstrasi dan evaluasi dosen. |
| **Dokumentasi Panduan API** | Berkas `Panduan_dan_Dokumentasi_API.md` belum dibuat di root proyek. | Dokumen resmi berisi panduan instalasi, konfigurasi, spesifikasi 7 endpoint, dan contoh request/response. | Tinggi | Susun panduan lengkap sesuai ketentuan pengumpulan tugas bab 6.1 PDF. |

---

## 2. Arsitektur Layanan dan Prinsip Service-Oriented Architecture (SOA)

Sistem CampusLoan dibangun dengan prinsip Microservices / Service-Oriented Architecture menggunakan dua layanan independen yang terisolasi secara proses, jaringan, dan persistensi data.

```
                              +-------------------------------------------+
                              |               KLIEN SISTEM                |
                              |  +---------------------+  +-------------+ |
                              |  | Terminal Client     |  | Postman     | |
                              |  | (Automasi Mahasiswa)|  | (Admin/QA)  | |
                              |  +---------------------+  +-------------+ |
                              +-------------------------------------------+
                                            |                 |
                             HTTP REST/JSON |                 | HTTP REST/JSON
                          (Bearer JWT User) |                 | (Bearer JWT)
                                            v                 v
+-----------------------------------------------+         +-----------------------------------------------+
|         LAYANAN PEMINJAMAN (Port 3002)        |         |          LAYANAN KATALOG (Port 3001)          |
|                                               |         |                                               |
|   +-------------------+   +---------------+   |  HTTP   |   +-------------------+   +---------------+   |
|   | Auth Controller   |   | Loans API     |   | Token   |   | Middleware JWT    |   | Facilities    |   |
|   | POST /auth/login  |   | /loans        |   |Forward  |   | (Token Guard)     |   | Controller    |   |
|   +-------------------+   +---------------+   |-------->|   +-------------------+   +---------------+   |
|   +-------------------+   +---------------+   |         +-----------------------------------------------+
|   | RBAC & Ownership  |   | Catalog Client|   |                                 |
|   | Middleware        |   | (HTTP Caller) |   |                                 v
|   +-------------------+   +---------------+   |                    +-------------------------+
+-----------------------------------------------+                    | catalog.db (SQLite)     |
                        |                                            | - facilities            |
                        v                                            +-------------------------+
             +-------------------------+
             | loan.db (SQLite)        |
             | - users                 |
             | - loans                 |
             +-------------------------+
```

### 2.1 Pembuktian 4 Prinsip Inti SOA

1. **Standardized Service Contract (Kontrak Layanan Terstandarisasi)**:
   - Seluruh endpoint API beroperasi di bawah prefiks versi tunggal `/api/v1`.
   - Menggunakan format representasi JSON seragam dengan header `Content-Type: application/json` dan `Accept: application/json`.
   - Pola amplop (envelope) respons standar: `{ "data": ... }` untuk keberhasilan dan `{ "error": { "code": "...", "message": "...", "details": [] } }` untuk kegagalan.

2. **Loose Coupling (Keterikatan Longgar)**:
   - Layanan Peminjaman tidak memiliki akses fisik, foreign key, maupun koneksi langsung ke `catalog.db`.
   - Komunikasi antar-layanan dilakukan secara otonom melalui protokol HTTP REST.
   - Endpoint tujuan katalog dikonfigurasi secara dinamis melalui variabel lingkungan (`CATALOG_BASE_URL=http://localhost:3001`).

3. **Statelessness (Ketiadaan Sesi di Server)**:
   - Server tidak menggunakan session memory, sticky session, atau penyimpanan cookies.
   - Setiap permintaan HTTP bersifat mandiri dan membawa seluruh konteks identitas dalam header `Authorization: Bearer <token>`.
   - Token JWT ditandatangani secara kriptografis (HS256) dan memuat klaim subjek (`sub`), nama pengguna (`username`), peran (`role`), serta masa kedaluwarsa (`exp`).

4. **Composability (Kemampuan Komposisi Layanan)**:
   - Proses bisnis transaksi peminjaman pada Layanan Peminjaman mengomposisikan data referensi dari Layanan Katalog.
   - Layanan Katalog berfungsi sebagai reusable catalog provider yang dapat dipakai oleh sistem lain di lingkungan kampus tanpa perubahan kode.

### 2.2 Klasifikasi Logika Layanan (Agnostic vs Non-Agnostic)

- **Logic Agnostic**:
  - Middleware verifikasi signature JWT dan claim kedaluwarsa.
  - Modul pembacaan katalog dan penanganan paginasi data.
  - Penanganan parsing error JSON global.
  - Komponen ini tidak terikat pada aturan bisnis peminjaman dan dapat digunakan pada modul lain.
- **Logic Non-Agnostic**:
  - Mesin deteksi irisan bentrok jadwal fasilitas (`start_baru < end_lama AND end_baru > start_lama`).
  - Mesin validasi transisi status peminjaman (status awal `pending`, perubahan hanya ke `approved` atau `rejected` oleh admin).
  - Pembatasan pembuatan pengajuan khusus akun berstatus `student`.

---

## 3. Desain Basis Data (Database Architecture)

Arsitektur database mengadopsi pola **Database-per-Service**. Setiap layanan mengelola berkas database SQLite miliknya sendiri.

### 3.1 Layanan Katalog (`catalog.db`)

Tabel `facilities` menyimpan data referensi ruangan dan peralatan kampus:

```sql
CREATE TABLE facilities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('room', 'equipment')),
    description TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1))
);
```

Data awal (Seed Data) wajib mencakup minimal 3 fasilitas aktif dan 1 nonaktif:
1. `Ruang Seminar Gedung A` (room, aktif = 1)
2. `Proyektor Portabel Epson P-01` (equipment, aktif = 1)
3. `Studio Multimedia Kreatif` (room, aktif = 1)
4. `Lab Komputer Pemrograman 2` (room, nonaktif = 0)

### 3.2 Layanan Peminjaman (`loan.db`)

Tabel `users` menyimpan kredensial akun pengguna:

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('student', 'admin')),
    full_name TEXT NOT NULL
);
```

Tabel `loans` menyimpan transaksi pengajuan peminjaman:

```sql
CREATE TABLE loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    facility_id INTEGER NOT NULL,
    borrower_id INTEGER NOT NULL,
    start_at TEXT NOT NULL,
    end_at TEXT NOT NULL,
    purpose TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    created_at TEXT NOT NULL,
    decided_by INTEGER NULL,
    decided_at TEXT NULL,
    FOREIGN KEY (borrower_id) REFERENCES users(id)
);

CREATE INDEX idx_loans_conflict ON loans (facility_id, status, start_at, end_at);
CREATE INDEX idx_loans_borrower ON loans (borrower_id);
```

**Justifikasi Desain**:
Kolom `facility_id` pada tabel `loans` adalah referensi logis (*logical foreign key*) tanpa constraint foreign key fisik ke `catalog.db`. Hal ini menjamin otonomi penuh database sesuai prinsip isolasi SOA.

---

## 4. Spesifikasi Kontrak REST API (7 Endpoint Utama)

Seluruh endpoint menerapkan Richardson Maturity Model (RMM) Level 2: menggunakan URI resource berbasis kata benda jamak, HTTP verbs sesuai semantik (`GET`, `POST`, `PATCH`), serta kode status HTTP standar.

### 4.1 Tabel Kontrak Endpoint

| No | Method | URL | Akses / Role | Request Payload | Response Sukses | Status Error |
|---|---|---|---|---|---|---|
| 1 | `POST` | `/api/v1/auth/login` | Publik (Tanpa token) | `{"username": "...", "password": "..."}` | 200 OK, token Bearer JWT & info profil | 400 Bad Request, 401 Unauthorized |
| 2 | `GET` | `/api/v1/facilities` | Mahasiswa & Admin | Query opsional: `?category=...&page=...&limit=...` | 200 OK, daftar fasilitas + paginasi | 400 Bad Request, 401 Unauthorized |
| 3 | `GET` | `/api/v1/facilities/:id` | Mahasiswa & Admin | Path param `id` (integer positif) | 200 OK, detail objek fasilitas | 400 Bad Request, 401 Unauthorized, 404 Not Found |
| 4 | `POST` | `/api/v1/loans` | Mahasiswa (`student`) | `{"facility_id": 1, "start_at": "...", "end_at": "...", "purpose": "..."}` | 201 Created, objek loan status pending | 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 503 Service Unavailable |
| 5 | `GET` | `/api/v1/loans` | Mahasiswa & Admin | Query opsional: `?status=...` | 200 OK, list loans (filtered per role) | 400 Bad Request, 401 Unauthorized |
| 6 | `GET` | `/api/v1/loans/:id` | Pemilik Data / Admin | Path param `id` (integer positif) | 200 OK, detail loan | 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found |
| 7 | `PATCH` | `/api/v1/loans/:id` | Admin (`admin`) | `{"status": "approved"}` atau `{"status": "rejected"}` | 200 OK, loan terupdate | 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict |

---

## 5. Logika Bisnis dan Algoritma Validasi Jadwal

### 5.1 Format dan Konversi Waktu (ISO 8601 dengan Offset)

1. **Format Input**: Wajib berformat ISO 8601 dengan offset zona waktu eksplisit. Contoh: `2026-11-02T09:00:00+07:00` atau `2026-11-02T02:00:00Z`.
2. **Validasi Regex**: Memeriksa keberadaan penanda offset (`Z` atau `[+-]\d{2}:\d{2}`). Request tanpa offset ditolak dengan status **400 Bad Request**.
3. **Validasi Rentang**: Waktu selesai (`end_at`) harus lebih besar secara mutlak dibanding waktu mulai (`start_at`). Jika $end\_at \le start\_at$, ditolak dengan status **400 Bad Request**.
4. **Normalisasi Penyimpanan**: Server mengonversi waktu ke standar UTC (`YYYY-MM-DDTHH:mm:ss.sssZ`) sebelum melakukan query perbandingan atau penyimpanan ke SQLite.

### 5.2 Rumus Irisan Bentrok Jadwal (Overlap Engine)

Dua interval waktu $[S_{baru}, E_{baru}]$ dan $[S_{lama}, E_{lama}]$ dikatakan bertumpang tindih (bentrok) jika dan hanya jika:

$$\text{Bentrok} = (S_{baru} < E_{lama}) \land (E_{baru} > S_{lama})$$

Aturan bisnis jadwal:
- Bentrok hanya dihitung terhadap pengajuan dengan status `pending` atau `approved` pada fasilitas yang sama.
- Pengajuan berstatus `rejected` diabaikan dan tidak memblokir jadwal.
- Jika $S_{baru} == E_{lama}$ atau $E_{baru} == S_{lama}$ (batas waktu hanya saling menempel), pengajuan diperbolehkan dan menghasilkan status **201 Created**.
- Query deteksi bentrok pada SQLite:
  ```sql
  SELECT id, start_at, end_at, status FROM loans
  WHERE facility_id = ?
    AND status IN ('pending', 'approved')
    AND start_at < ?
    AND end_at > ?
  LIMIT 1;
  ```

---

## 6. Komunikasi Antar-Layanan (Inter-Service Communication)

Saat mahasiswa membuat pengajuan baru (`POST /api/v1/loans`):
1. Layanan Peminjaman mengekstrak Bearer token dari header incoming request.
2. Layanan Peminjaman membuat HTTP GET request ke `http://localhost:3001/api/v1/facilities/:facility_id`.
3. Header `Authorization: Bearer <token>` diteruskan secara utuh ke Layanan Katalog.
4. Batas waktu timeout diatur sebesar 3.000 ms.
5. Layanan Peminjaman mencatat structured log pada terminal:
   ```text
   [INTER-SERVICE CALL] 2026-10-27T14:30:00.120Z | OUTGOING HTTP REQUEST
     Origin Service : Loan-Service (Port 3002)
     Target Service : Catalog-Service (Port 3001)
     Method / URL   : GET http://localhost:3001/api/v1/facilities/1
     Headers Sent   : { "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6..." }
   [INTER-SERVICE RESP] 2026-10-27T14:30:00.155Z | INCOMING HTTP RESPONSE
     Response Status: 200 OK (Latency: 35ms)
     Response Body  : { "data": { "id": 1, "name": "Ruang Seminar Gedung A", "is_active": 1 } }
   ```
6. Penanganan respon Katalog:
   - Jika Katalog mengembalikan 404: Layanan Peminjaman mengembalikan **404 Not Found** (`FACILITY_NOT_FOUND`).
   - Jika fasilitas ditemukan tetapi `is_active == 0`: Layanan Peminjaman mengembalikan **409 Conflict** (`FACILITY_INACTIVE`).
   - Jika koneksi gagal, ditolak, atau timeout: Layanan Peminjaman mengembalikan **503 Service Unavailable** (`CATALOG_SERVICE_UNAVAILABLE`).

---

## 7. Keamanan, Autentikasi, dan Otorisasi (RBAC)

### 7.1 JSON Web Token (JWT)

- Algoritma penandatanganan: `HS256` (HMAC SHA-256).
- Secret key: disimpan dalam `.env` (`JWT_SECRET`) dan harus identik di kedua layanan.
- Masa aktif: 1 jam (`1h`).
- Payload token:
  ```json
  {
    "sub": 2,
    "username": "mhs_budi",
    "role": "student",
    "iat": 1730000000,
    "exp": 1730003600
  }
  ```

### 7.2 Matriks Hak Akses (RBAC & Ownership)

| Tindakan | Mahasiswa (`student`) | Administrator (`admin`) | Tanpa Token |
|---|---|---|---|
| Login Akun Uji | Ya (200 OK) | Ya (200 OK) | Ya (200 OK) |
| Melihat Katalog Fasilitas | Ya (200 OK) | Ya (200 OK) | Ditolak (401 Unauthorized) |
| Mengajukan Peminjaman | Ya, atas nama sendiri (201) | Ditolak (403 Forbidden) | Ditolak (401 Unauthorized) |
| Melihat Daftar Riwayat Peminjaman | Hanya miliknya sendiri (200 OK) | Seluruh transaksi sistem (200 OK) | Ditolak (401 Unauthorized) |
| Melihat Detail Peminjaman Tertentu | Hanya jika pemilik (200 OK) | Bebas akses semua (200 OK) | Ditolak (401 Unauthorized) |
| Menyetujui / Menolak Pengajuan | Ditolak (403 Forbidden) | Ya, khusus status pending (200 OK) | Ditolak (401 Unauthorized) |

---

## 8. Desain Program Klien Terminal (`client/client.js`)

Program klien terminal otomatis menjalankan 4 alur mahasiswa secara sekuensial tanpa intervensi manual:
1. **Langkah 1**: Login dengan kredensial `mhs_budi` dan password `Budi#Pass2026` ke port 3002. Token disimpan dalam memori proses.
2. **Langkah 2**: Memanggil `GET /api/v1/facilities` ke port 3001 menggunakan token Bearer. Menampilkan daftar fasilitas yang tersedia.
3. **Langkah 3**: Mengirimkan pengajuan peminjaman baru via `POST /api/v1/loans` ke port 3002 untuk fasilitas ID 1 dengan waktu mulai dan selesai yang valid.
4. **Langkah 4**: Memanggil `GET /api/v1/loans` ke port 3002 untuk memverifikasi bahwa pengajuan baru berhasil dibuat dan berstatus `pending`.

---

## 9. Rencana Eksekusi dan Implementasi Bertahap

Untuk menyelesaikan seluruh kekurangan sistem secara rapi dan modular sesuai pembagian tugas 3 mahasiswa:

### Tahap 1: Konfigurasi Lingkungan dan Pemutakhiran Catalog Service
- Menyiapkan berkas `.env` pada `catalog-service` dan `loan-service` dengan nilai rahasia `JWT_SECRET` yang sinkron.
- Memastikan eksekusi seed database berjalan mulus.

### Tahap 2: Implementasi Modul Layanan Peminjaman (Mahasiswa 2)
- Implementasi `source_code/loan-service/src/clients/catalogClient.js` dengan HTTP client, token forwarding, timeout, dan structured logger.
- Implementasi `source_code/loan-service/src/services/loanService.js` untuk validasi ISO 8601 offset dan rumus irisan bentrok.
- Implementasi `source_code/loan-service/src/middleware/rbac.js` untuk memvalidasi hak akses peran dan kepemilikan resource.
- Implementasi `source_code/loan-service/src/controllers/loan.js` untuk seluruh endpoint pengajuan dan persetujuan.
- Mendaftarkan rute pada `source_code/loan-service/src/routes/loans.js` dan menghubungkannya pada `src/server.js`.

### Tahap 3: Implementasi Klien Terminal dan Postman Collection (Mahasiswa 3)
- Implementasi `source_code/client/client.js` dengan alur 4 langkah otomatis.
- Menyusun `source_code/postman/CampusLoan.postman_collection.json` yang memetakan skenario U01 hingga U10 secara presisi.

### Tahap 4: Dokumentasi Lengkap
- Menyusun berkas `Panduan_dan_Dokumentasi_API.md` di root repositori untuk memenuhi syarat berkas deliverable tugas ABS.

### Tahap 5: Verifikasi dan Pengujian Menyeluruh
- Menjalankan kedua server dan memverifikasi kesepuluh skenario pengujian (U01 - U10).
- Memverifikasi kepatuhan terhadap aturan antislop (kebersihan komentar kode, ketiadaan banner/separasi berlebih, struktur alami).
