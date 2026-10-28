# Panduan Menjalankan dan Dokumentasi REST API — CampusLoan

> Sistem Peminjaman Fasilitas Kampus Berbasis Service-Oriented Architecture (SOA) & REST API  
> Mata Kuliah: Aplikasi Berorientasi Service (ABS) 2026 | Tim Pengembang: Kelompok 3

---

## 1. Prasyarat Sistem

Sebelum menjalankan layanan CampusLoan, pastikan sistem Anda memenuhi kebutuhan berikut:
- **Node.js**: Versi `18.0.0` atau yang lebih baru (disarankan LTS v20+).
- **NPM**: Versi `9.0.0` atau yang lebih baru.
- **Sistem Operasi**: Windows, macOS, atau Linux.
- **REST Client**: Postman (untuk pengujian admin & skenario U01–U10) atau cURL.

---

## 2. Struktur Proyek

```text
source_code/
├── catalog-service/                  # Layanan Katalog (Port 3001)
│   ├── src/
│   │   ├── config/database.js        # Konektor basis data SQLite catalog.db
│   │   ├── controllers/catalog.js    # Logika endpoint fasilitas & paginasi
│   │   ├── middleware/auth.js        # Middleware verifikasi signature JWT
│   │   ├── routes/facilities.js      # Definisi rute /api/v1/facilities
│   │   └── server.js                 # Server Express Port 3001
│   ├── data/
│   │   └── seed.js                   # DDL & 4 data fasilitas awal
│   ├── .env.example
│   ├── .env
│   └── package.json
├── loan-service/                     # Layanan Peminjaman (Port 3002)
│   ├── src/
│   │   ├── clients/catalogClient.js  # HTTP Client pemanggil Katalog (token forwarding)
│   │   ├── config/database.js        # Konektor basis data SQLite loan.db
│   │   ├── controllers/
│   │   │   ├── auth.js               # Handler login & pembuatan JWT
│   │   │   └── loan.js               # Handler pengajuan, persetujuan, & kepemilikan
│   │   ├── middleware/
│   │   │   ├── auth.js               # Middleware verifikasi JWT
│   │   │   └── rbac.js               # Middleware penegakan peran (RBAC)
│   │   ├── routes/
│   │   │   ├── auth.js               # Definisi rute /api/v1/auth
│   │   │   └── loans.js              # Definisi rute /api/v1/loans
│   │   ├── services/loanService.js   # Mesin validasi ISO 8601 & deteksi bentrok jadwal
│   │   └── server.js                 # Server Express Port 3002
│   ├── data/
│   │   └── seed.js                   # DDL & 3 data akun pengguna awal
│   ├── .env.example
│   ├── .env
│   └── package.json
├── client/
│   ├── client.js                     # Program klien terminal konsol mahasiswa
│   └── package.json
├── postman/
│   └── CampusLoan.postman_collection.json # Koleksi 10 skenario pengujian resmi
├── package.json                      # Workspace script root
└── Panduan_dan_Dokumentasi_API.md     # Dokumen panduan ini
```

---

## 3. Instalasi dan Konfigurasi Lingkungan

### 3.1 Instalasi Dependensi
Buka terminal dan navigasikan ke direktori `source_code/`, kemudian jalankan instalasi dependensi untuk seluruh workspace:

```bash
cd source_code
npm install
```

### 3.2 Konfigurasi Berkas Lingkungan (.env)

Pastikan berkas `.env` telah disiapkan pada masing-masing layanan dengan menyalin dari `.env.example`:

**1. Pada `catalog-service/.env`:**
```ini
CATALOG_PORT=3001
JWT_SECRET=campusloan_secret_key_jwt_abs_2026_super_secure_32chars
DB_PATH=./data/catalog.db
```

**2. Pada `loan-service/.env`:**
```ini
LOAN_PORT=3002
JWT_SECRET=campusloan_secret_key_jwt_abs_2026_super_secure_32chars
JWT_EXPIRES_IN=1h
CATALOG_BASE_URL=http://localhost:3001
DB_PATH=./data/loan.db
SEED_ADMIN_PASSWORD="Admin#Pass2026"
SEED_MHS_BUDI_PASSWORD="Budi#Pass2026"
SEED_MHS_SARI_PASSWORD="Sari#Pass2026"
```

> **Penting**: Nilai `JWT_SECRET` harus identik pada kedua layanan agar token yang diterbitkan oleh Layanan Peminjaman dapat divalidasi oleh Layanan Katalog.

---

## 4. Inisialisasi Basis Data (Seed Data)

Jalankan perintah seed data awal melalui direktori `source_code/`:

```bash
npm run seed
```

Atau jalankan secara terpisah:
```bash
npm run seed:catalog
npm run seed:loan
```

### 4.1 Data Fasilitas Kampus (`catalog.db`)
| ID | Nama Fasilitas | Kategori | Deskripsi | Status Aktif |
|---|---|---|---|---|
| **1** | Ruang Seminar Gedung A | `room` | Kapasitas 60 kursi, AC central, proyektor full-HD | Aktif (`1`) |
| **2** | Proyektor Portabel Epson P-01 | `equipment` | Proyektor 4000 lumens, HDMI dan VGA | Aktif (`1`) |
| **3** | Studio Multimedia Kreatif | `room` | Peredam akustik, kamera 4K, lighting pro | Aktif (`1`) |
| **4** | Lab Komputer Pemrograman 2 | `room` | Pemeliharaan berkala, tidak dapat dipinjam | Nonaktif (`0`) |

### 4.2 Data Akun Pengguna Uji (`loan.db`)
| ID | Username | Role | Password Plaintext (Hanya untuk Uji) | Nama Lengkap |
|---|---|---|---|---|
| **1** | `admin_kampus` | `admin` | `Admin#Pass2026` | Administrator Sarpras |
| **2** | `mhs_budi` | `student` | `Budi#Pass2026` | Budi Santoso |
| **3** | `mhs_sari` | `student` | `Sari#Pass2026` | Siti Sari Lestari |

---

## 5. Cara Menjalankan Layanan

Buka dua jendela terminal terpisah untuk menjalankan kedua layanan independen:

### Terminal 1 — Menjalankan Catalog Service (Port 3001)
```bash
cd source_code
npm run start:catalog
```
Output konsol:
```text
[Catalog Service] Berjalan di http://localhost:3001
[Catalog Service] Endpoint: GET /api/v1/facilities
[Catalog Service] Endpoint: GET /api/v1/facilities/:id
```

### Terminal 2 — Menjalankan Loan Service (Port 3002)
```bash
cd source_code
npm run start:loan
```
Output konsol:
```text
[Loan Service] Berjalan di http://localhost:3002
[Loan Service] Endpoint: POST /api/v1/auth/login
```

---

## 6. Menjalankan Program Klien Terminal Mahasiswa

Buka jendela terminal ketiga untuk mengeksekusi program klien otomatis mahasiswa:

```bash
cd source_code
npm run client
```

Program klien akan menjalankan 4 alur otomatis:
1. Login akun mahasiswa `mhs_budi` dan menyimpan token JWT di memori.
2. Mengambil daftar fasilitas dari Layanan Katalog (`http://localhost:3001/api/v1/facilities`).
3. Mengajukan peminjaman fasilitas Ruang Seminar Gedung A (`http://localhost:3002/api/v1/loans`).
4. Menampilkan riwayat peminjaman mahasiswa tersebut dengan status `pending`.

---

## 7. Cara Menggunakan JWT (Autentikasi & Otorisasi)

Seluruh endpoint privat wajib menyertakan header HTTP berikut:
```http
Authorization: Bearer <token_jwt_anda>
```

- **Algoritma**: `HS256` (HMAC with SHA-256).
- **Masa Kedaluwarsa**: 1 jam (`1h`).
- **Klaim Payload**:
  ```json
  {
    "sub": 2,
    "username": "mhs_budi",
    "role": "student",
    "iat": 1730000000,
    "exp": 1730003600
  }
  ```

---

## 8. Spesifikasi 7 Kontrak REST API

### Format Respon Standar
- **Sukses**:
  ```json
  {
    "data": { ... }
  }
  ```
- **Error**:
  ```json
  {
    "error": {
      "code": "KODE_ERROR",
      "message": "Pesan deskripsi error yang jelas.",
      "details": []
    }
  }
  ```

---

### Endpoint 1: Login Akun Uji
- **Method & URL**: `POST /api/v1/auth/login` (Layanan Peminjaman, Port 3002)
- **Akses**: Publik (Tanpa token)
- **Request Body**:
  ```json
  {
    "username": "mhs_budi",
    "password": "Budi#Pass2026"
  }
  ```
- **Response Berhasil (200 OK)**:
  ```json
  {
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "token_type": "Bearer",
      "user": {
        "id": 2,
        "username": "mhs_budi",
        "role": "student",
        "full_name": "Budi Santoso"
      }
    }
  }
  ```
- **Response Error (401 Unauthorized)**:
  ```json
  {
    "error": {
      "code": "INVALID_CREDENTIALS",
      "message": "Username atau password salah.",
      "details": []
    }
  }
  ```

---

### Endpoint 2: Daftar Fasilitas Kampus
- **Method & URL**: `GET /api/v1/facilities` (Layanan Katalog, Port 3001)
- **Akses**: Mahasiswa & Admin (`Authorization: Bearer <token>`)
- **Query Parameter (Opsional)**:
  - `category`: `room` atau `equipment`
  - `page`: Integer $\ge 1$ (default: 1)
  - `limit`: Integer $\ge 1$ (default: 10)
- **Response Berhasil (200 OK)**:
  ```json
  {
    "data": {
      "facilities": [
        {
          "id": 1,
          "name": "Ruang Seminar Gedung A",
          "category": "room",
          "description": "Kapasitas 60 kursi, dilengkapi AC central dan proyektor full-HD",
          "is_active": 1
        }
      ],
      "pagination": {
        "total": 4,
        "page": 1,
        "limit": 10,
        "total_pages": 1
      }
    }
  }
  ```

---

### Endpoint 3: Detail Fasilitas Spesifik
- **Method & URL**: `GET /api/v1/facilities/:id` (Layanan Katalog, Port 3001)
- **Akses**: Mahasiswa & Admin (`Authorization: Bearer <token>`)
- **Path Parameter**: `id` (integer positif)
- **Response Berhasil (200 OK)**:
  ```json
  {
    "data": {
      "id": 1,
      "name": "Ruang Seminar Gedung A",
      "category": "room",
      "description": "Kapasitas 60 kursi, dilengkapi AC central dan proyektor full-HD",
      "is_active": 1
    }
  }
  ```
- **Response Error (404 Not Found)**:
  ```json
  {
    "error": {
      "code": "FACILITY_NOT_FOUND",
      "message": "Fasilitas dengan ID 999 tidak ditemukan.",
      "details": []
    }
  }
  ```

---

### Endpoint 4: Membuat Pengajuan Peminjaman Baru
- **Method & URL**: `POST /api/v1/loans` (Layanan Peminjaman, Port 3002)
- **Akses**: Khusus Mahasiswa (`role: student`, token Bearer)
- **Request Body**:
  ```json
  {
    "facility_id": 1,
    "start_at": "2026-11-10T08:00:00+07:00",
    "end_at": "2026-11-10T11:00:00+07:00",
    "purpose": "Seminar Proposal Penelitian Mahasiswa"
  }
  ```
- **Response Berhasil (201 Created)**:
  ```json
  {
    "data": {
      "id": 1,
      "facility_id": 1,
      "borrower_id": 2,
      "start_at": "2026-11-10T01:00:00.000Z",
      "end_at": "2026-11-10T04:00:00.000Z",
      "purpose": "Seminar Proposal Penelitian Mahasiswa",
      "status": "pending",
      "created_at": "2026-10-27T14:35:00.120Z",
      "decided_by": null,
      "decided_at": null
    }
  }
  ```
- **Response Error (409 Conflict — Bentrok Jadwal)**:
  ```json
  {
    "error": {
      "code": "SCHEDULE_CONFLICT",
      "message": "Jadwal peminjaman bertumpang tindih dengan pengajuan aktif lainnya.",
      "details": [
        {
          "conflicting_loan_id": 1,
          "status": "pending"
        }
      ]
    }
  }
  ```

---

### Endpoint 5: Melihat Daftar Pengajuan Peminjaman
- **Method & URL**: `GET /api/v1/loans` (Layanan Peminjaman, Port 3002)
- **Akses**: Mahasiswa (hanya miliknya) & Admin (seluruh data)
- **Query Parameter (Opsional)**: `?status=pending|approved|rejected`
- **Response Berhasil (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": 1,
        "facility_id": 1,
        "borrower_id": 2,
        "start_at": "2026-11-10T01:00:00.000Z",
        "end_at": "2026-11-10T04:00:00.000Z",
        "purpose": "Seminar Proposal Penelitian Mahasiswa",
        "status": "pending",
        "created_at": "2026-10-27T14:35:00.120Z",
        "decided_by": null,
        "decided_at": null
      }
    ]
  }
  ```

---

### Endpoint 6: Melihat Detail Pengajuan Spesifik
- **Method & URL**: `GET /api/v1/loans/:id` (Layanan Peminjaman, Port 3002)
- **Akses**: Pemilik Pengajuan atau Admin
- **Path Parameter**: `id` (integer positif)
- **Response Berhasil (200 OK)**:
  ```json
  {
    "data": {
      "id": 1,
      "facility_id": 1,
      "borrower_id": 2,
      "start_at": "2026-11-10T01:00:00.000Z",
      "end_at": "2026-11-10T04:00:00.000Z",
      "purpose": "Seminar Proposal Penelitian Mahasiswa",
      "status": "pending",
      "created_at": "2026-10-27T14:35:00.120Z",
      "decided_by": null,
      "decided_at": null
    }
  }
  ```
- **Response Error (403 Forbidden — Akses Data Mahasiswa Lain)**:
  ```json
  {
    "error": {
      "code": "FORBIDDEN",
      "message": "Akses ditolak. Anda tidak berhak melihat data pengajuan mahasiswa lain.",
      "details": []
    }
  }
  ```

---

### Endpoint 7: Menyetujui atau Menolak Pengajuan (PATCH)
- **Method & URL**: `PATCH /api/v1/loans/:id` (Layanan Peminjaman, Port 3002)
- **Akses**: Khusus Admin (`role: admin`, token Bearer)
- **Request Body**:
  ```json
  {
    "status": "approved"
  }
  ```
  *(Atau `{"status": "rejected"}`)*
- **Response Berhasil (200 OK)**:
  ```json
  {
    "data": {
      "id": 1,
      "facility_id": 1,
      "borrower_id": 2,
      "start_at": "2026-11-10T01:00:00.000Z",
      "end_at": "2026-11-10T04:00:00.000Z",
      "purpose": "Seminar Proposal Penelitian Mahasiswa",
      "status": "approved",
      "created_at": "2026-10-27T14:35:00.120Z",
      "decided_by": 1,
      "decided_at": "2026-10-27T14:40:12.300Z"
    }
  }
  ```
- **Response Error (409 Conflict — Memproses Status yang Sudah Final)**:
  ```json
  {
    "error": {
      "code": "INVALID_STATUS_TRANSITION",
      "message": "Pengajuan dengan status \"approved\" sudah bersifat final dan tidak dapat diproses lagi.",
      "details": []
    }
  }
  ```

---

## 9. Petunjuk Pengujian dengan Postman (10 Skenario U01–U10)

1. Buka aplikasi Postman.
2. Klik tombol **Import** dan pilih berkas `source_code/postman/CampusLoan.postman_collection.json`.
3. Koleksi telah dilengkapi dengan test script otomatis yang menyimpan token JWT ke variabel koleksi secara berantai.
4. Anda dapat menjalankan seluruh skenario sekaligus menggunakan fitur **Run Collection** atau mengeksekusi request satu per satu dari folder U01 sampai U10.
