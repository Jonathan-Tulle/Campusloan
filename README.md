# CampusLoan — Sistem Peminjaman Fasilitas Kampus

Proyek ini adalah implementasi sistem peminjaman fasilitas kampus (ruangan dan peralatan) berbasis REST API dengan arsitektur berorientasi layanan (*Service-Oriented Architecture* / SOA) dan prinsip *Database-per-Service*.

Sistem terdiri dari dua layanan mandiri:
1. **Catalog Service** (Port `3001`): Pengelola data referensi dan ketersediaan fasilitas kampus (`catalog.db`).
2. **Loan Service** (Port `3002`): Pengelola autentikasi pengguna (`loan.db`) dan transaksi pengajuan peminjaman.

---

## Prasyarat Sistem

Sebelum menjalankan proyek, pastikan perangkat Anda telah terpasang:
- **Node.js**: Versi `>= 18.0.0` (disarankan LTS v20 atau v24)
- **npm**: Versi `>= 9.0.0`
- **Git**

---

## Panduan Setup & Instalasi (Untuk Anggota Tim)

Ikuti langkah-langkah berikut setelah Anda melakukan *clone* dari repositori ini:

### 1. Clone Repositori
Buka terminal dan jalankan:
```bash
git clone https://github.com/Jonathan-Tulle/Campusloan.git
cd Campusloan/source_code
```

---

### 2. Konfigurasi Variabel Lingkungan (`.env`)

Setiap layanan membutuhkan berkas konfigurasi lokal `.env`. Salin template `.env.example` yang telah disediakan ke dalam file `.env`:

#### Di Windows (PowerShell):
```powershell
Copy-Item catalog-service\.env.example catalog-service\.env
Copy-Item loan-service\.env.example loan-service\.env
```

#### Di Linux / macOS / Git Bash:
```bash
cp catalog-service/.env.example catalog-service/.env
cp loan-service/.env.example loan-service/.env
```

> **PENTING:**
> - Nilai `JWT_SECRET` pada `catalog-service/.env` dan `loan-service/.env` **wajib sama** agar token autentikasi yang diterbitkan oleh Loan Service dapat divalidasi oleh Catalog Service.
> - Default nilai password seed sudah tersedia di `.env.example` dan siap pakai.

---

### 3. Install Dependensi

Dari dalam folder `source_code/`, instal seluruh paket dependensi:

```bash
# Instal dependensi Catalog Service
cd catalog-service
npm install

# Instal dependensi Loan Service
cd ../loan-service
npm install

# Instal dependensi testing di root source_code
cd ..
npm install
```

---

### 4. Eksekusi Seeding Database (Wajib)

Proyek menggunakan SQLite lokal. Berkas database (`*.db`) tidak disimpan di Git, sehingga setiap anggota tim **wajib membuat database lokal** dengan menjalankan skrip *seed*:

Dari dalam folder `source_code/`:
```bash
# Menjalankan seed kedua layanan sekaligus
npm run seed
```

Atau dijalankan secara mandiri per layanan:
```bash
# Seed Catalog Service (catalog.db -> 4 fasilitas)
node catalog-service/data/seed.js

# Seed Loan Service (loan.db -> 3 akun pengguna dengan hash bcrypt)
node loan-service/data/seed.js
```

---

## Menjalankan Layanan (Development Mode)

Buka **dua jendela terminal terpisah** di folder `source_code/`:

#### Terminal 1 — Catalog Service (Port 3001):
```bash
node catalog-service/src/server.js
# Output: [Catalog Service] Berjalan di http://localhost:3001
```

#### Terminal 2 — Loan Service (Port 3002):
```bash
node loan-service/src/server.js
# Output: [Loan Service] Berjalan di http://localhost:3002
```

---

## Akun Uji Coba Resmi (Seed Data PRD §17.2)

Berikut data akun pengguna yang telah terdaftar di `loan.db`:

| Username | Role | Password Plaintext | Nama Pengguna | Kegunaan Uji |
|---|---|---|---|---|
| `admin_kampus` | `admin` | `Admin#Pass2026` | Administrator kampus | Persetujuan admin & RBAC |
| `mhs_budi` | `student` | `Budi#Pass2026` | Budi Santoso | Alur utama mahasiswa (Aktor A) |
| `mhs_sari` | `student` | `Sari#Pass2026` | Siti Sari Lestari | Isolasi kepemilikan data (Aktor B) |

---

## Menjalankan Pengujian Mandiri

Untuk memverifikasi modul autentikasi JWT dan katalog fasilitas kampus:

Dari direktori `source_code/`:
```bash
node test_mahasiswa_1.js
```

Seluruh 10 skenario pengujian akan dieksekusi secara in-process dan harus menghasilkan status **100% LULUS**.

---

## truktur Direktori Proyek

```text
source_code/
├── catalog-service/                  # Layanan Katalog (Port 3001)
│   ├── src/
│   │   ├── config/database.js        # Koneksi SQLite catalog.db
│   │   ├── controllers/catalog.js    # Handler katalog, filter, & paginasi
│   │   ├── middleware/auth.js        # JWT Guard Middleware
│   │   ├── routes/facilities.js      # Rute /api/v1/facilities
│   │   └── server.js                 # Entry point Express Port 3001
│   ├── data/
│   │   └── seed.js                   # DDL & seeder facilities
│   ├── .env.example
│   └── package.json
├── loan-service/                     # Layanan Peminjaman (Port 3002)
│   ├── src/
│   │   ├── clients/                  # [Mahasiswa 2] Inter-service HTTP client
│   │   ├── config/database.js        # Koneksi SQLite loan.db
│   │   ├── controllers/
│   │   │   └── auth.js               # Handler login & penerbitan JWT
│   │   ├── middleware/
│   │   │   └── auth.js               # JWT Guard Middleware
│   │   ├── routes/
│   │   │   └── auth.js               # Rute /api/v1/auth/login
│   │   ├── services/                 # [Mahasiswa 2] Overlap engine bentrok jadwal
│   │   └── server.js                 # Entry point Express Port 3002
│   ├── data/
│   │   └── seed.js                   # DDL & seeder users/loans
│   ├── .env.example
│   └── package.json
├── client/                           # [Mahasiswa 3] Klien terminal otomatis
├── postman/                          # [Mahasiswa 3] Postman collection
├── test_mahasiswa_1.js               # Skrip pengujian mandiri Mahasiswa 1
├── package.json                      # Workspace root scripts
└── .gitignore
```
