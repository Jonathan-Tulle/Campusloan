# Product Requirements Document (PRD)

## Sistem Peminjaman Fasilitas Kampus Berbasis REST API ("CampusLoan")

| Atribut | Keterangan |
|---|---|
| Mata Kuliah | Aplikasi Berorientasi Service |
| Dokumen | Product Requirements Document (PRD) |
| Tim Pengembang | Kelompok 3 |
| Sumber Acuan | Dokumen Tugas Kelompok Aplikasi Berorientasi Service 2026 v1 |

---

## Daftar Isi

1. [Ringkasan Proyek](#1-ringkasan-proyek)
2. [Latar Belakang dan Permasalahan](#2-latar-belakang-dan-permasalahan)
3. [Tujuan dan Batasan Sistem](#3-tujuan-dan-batasan-sistem)
4. [Aktor Sistem](#4-aktor-sistem)
5. [Ruang Lingkup Fungsional](#5-ruang-lingkup-fungsional)
6. [Aturan Bisnis (Business Rules)](#6-aturan-bisnis-business-rules)
7. [Use Case Utama](#7-use-case-utama)
8. [Kebutuhan Fungsional](#8-kebutuhan-fungsional)
9. [Kebutuhan Non-Fungsional](#9-kebutuhan-non-fungsional)
10. [Arsitektur Layanan dan Prinsip SOA](#10-arsitektur-layanan-dan-prinsip-soa)
11. [Perancangan REST API dan RMM Level 2](#11-perancangan-rest-api-dan-rmm-level-2)
12. [Struktur Basis Data](#12-struktur-basis-data)
13. [Spesifikasi Kontrak REST API](#13-spesifikasi-kontrak-rest-api)
14. [Otentifikasi dan Otorisasi](#14-otentifikasi-dan-otorisasi)
15. [Rencana Pengujian (10 Skenario Minimum)](#15-rencana-pengujian-10-skenario-minimum)
16. [Program Klien Terminal](#16-program-klien-terminal)
17. [Data Awal (Seed Data)](#17-data-awal-seed-data)
18. [Struktur Berkas Proyek](#18-struktur-berkas-proyek)
19. [Deliverable dan Laporan Kelompok](#19-deliverable-dan-laporan-kelompok)
20. [Alokasi Kerja Tim dan Runbook Demonstrasi](#20-alokasi-kerja-tim-dan-runbook-demonstrasi)
21. [Matriks Keterlacakan Kebutuhan](#21-matriks-keterlacakan-kebutuhan)
22. [Glosarium](#22-glosarium)

---

## 1. Ringkasan Proyek

CampusLoan adalah prototipe sistem peminjaman fasilitas kampus (ruangan dan peralatan) berbasis Web API yang menerapkan arsitektur berorientasi layanan (*Service-Oriented Architecture*). 

Sistem ini memisahkan ranah bisnis ke dalam **dua layanan independen**:
1. **Layanan Katalog (Catalog Service)**: Berjalan pada port `3001` sebagai penyedia (*provider*) data referensi fasilitas beserta status keaktifannya.
2. **Layanan Peminjaman (Loan Service)**: Berjalan pada port `3002` sebagai pengelola transaksi pengajuan peminjaman (*transaction service*) sekaligus konsumen (*consumer*) data fasilitas melalui HTTP REST.

Seluruh transaksi dilindungi dengan autentikasi berbasis JSON Web Token (JWT) dengan pembatasan peran (*Role-Based Access Control*) dan kepemilikan data. Sistem menjamin tidak ada dua pengajuan aktif yang bertumpang tindih pada fasilitas yang sama.

---

## 2. Latar Belakang dan Permasalahan

Pengelolaan peminjaman fasilitas secara manual atau terpusat pada sistem monolitik tradisional memiliki beberapa kelemahan operasional:

| No | Permasalahan | Dampak pada Operasional |
|---|---|---|
| 1 | Informasi fasilitas tidak terpusat dan status ketersediaan tidak real-time. | Mahasiswa sering mengajukan fasilitas yang sedang dalam perbaikan atau nonaktif. |
| 2 | Tidak ada validasi jadwal otomatis antar-pengajuan. | Terjadi konflik penggunaan fasilitas (*double-booking*) pada jam yang sama. |
| 3 | Pengelolaan data fasilitas bercampur langsung dengan tabel transaksi peminjaman. | Layanan kampus lain (seperti sistem jadwal kuliah atau kegiatan) tidak dapat memanfaatkan data fasilitas secara mandiri (*low reusability*). |
| 4 | Ketiadaan kontrol hak akses dan kepemilikan data yang terstandarisasi. | Kerentanan keamanan di mana pengguna dapat melihat atau memodifikasi permohonan orang lain. |

CampusLoan memisahkan tanggung jawab ini menjadi dua layanan independen dengan basis data terpisah (*database-per-service*) yang saling berkomunikasi melalui protokol HTTP standar.

---

## 3. Tujuan dan Batasan Sistem

### 3.1 Tujuan Proyek

* Mengembangkan dua layanan mandiri dengan proses, port, dan basis data terpisah (Katalog port `3001` dan Peminjaman port `3002`).
* Mengimplementasikan 7 endpoint kontrak minimum di bawah prefiks `/api/v1`.
* Menerapkan aturan integritas jadwal peminjaman: pencegahan bentrok waktu untuk status `pending` dan `approved`, pengabaian status `rejected`, serta toleransi batas waktu yang menempel.
* Mengimplementasikan komunikasi antar-layanan (*inter-service call*) dengan meneruskan Bearer token pengguna.
* Menyediakan program klien terminal otomatis untuk mahasiswa dan mendemonstrasikan fungsi admin melalui Postman.
* Memenuhi 10 skenario pengujian resmi (U01–U10) dan menyusun laporan kelompok 4–6 halaman.

### 3.2 Batasan Sistem (Di Luar Lingkup)

* **Antarmuka Grafis (GUI)**: Tidak menggunakan tampilan web HTML/CSS atau aplikasi mobile; interaksi mahasiswa diwakili oleh skrip terminal konsol, sedangkan operasi admin diuji melalui Postman.
* **Perubahan Data Katalog via API**: Penambahan atau pembaruan katalog tidak disediakan melalui endpoint API; data fasilitas bersumber dari data awal (*seed data*).
* **Registrasi Pengguna Mandiri**: Akun pengguna (admin dan mahasiswa) ditentukan melalui data awal yang dikendalikan oleh server.
* **Fitur Pembatalan dan Pengembalian**: Pembatalan reservasi dan alur pengembalian barang berada di luar lingkup sistem wajib.

---

## 4. Aktor Sistem

| Aktor | Peran Utama | Hak Akses |
|---|---|---|
| **Mahasiswa (`student`)** | Peminjam Fasilitas | • Melakukan login untuk memperoleh token JWT.<br/>• Melihat daftar dan detail fasilitas aktif.<br/>• Mengajukan peminjaman atas nama sendiri.<br/>• Melihat daftar dan detail pengajuan miliknya sendiri. |
| **Admin (`admin`)** | Pengelola Operasional Fasilitas | • Melakukan login untuk memperoleh token JWT.<br/>• Melihat daftar dan detail seluruh fasilitas.<br/>• Melihat seluruh pengajuan dari semua mahasiswa.<br/>• Menyetujui (`approved`) atau menolak (`rejected`) pengajuan berstatus `pending`. |
| **Layanan Peminjaman** | Konsumen Layanan Antar-Sistem | • Memanggil API Layanan Katalog via HTTP untuk memvalidasi keberadaan dan status aktif fasilitas dengan meneruskan token pengguna. |
| **Program Klien Terminal** | Konsumen Konsol Mahasiswa | • Menjalankan otomasi alur login mahasiswa, pembacaan katalog, pengiriman pengajuan, dan pengecekan status secara terurut. |

---

## 5. Ruang Lingkup Fungsional

### 5.1 Komponen Wajib
1. **Layanan Katalog (Port 3001)**:
   * Menyediakan `GET /api/v1/facilities` dan `GET /api/v1/facilities/:id`.
   * Mendukung parameter kueri filter kategori (`?category=...`) dan paginasi data (`?page=...&limit=...`).
   * Menggunakan penyimpanan persisten SQLite `catalog.db`.
   * Memvalidasi token JWT pada endpoint yang terlindungi.
2. **Layanan Peminjaman (Port 3002)**:
   * Menyediakan modul autentikasi `POST /api/v1/auth/login`.
   * Menyediakan `POST /api/v1/loans`, `GET /api/v1/loans`, `GET /api/v1/loans/:id`, dan `PATCH /api/v1/loans/:id`.
   * Menjalankan validasi rentang waktu dan query deteksi bentrok jadwal.
   * Menggunakan modul HTTP client untuk memverifikasi fasilitas ke Katalog.
   * Menggunakan penyimpanan persisten SQLite `loan.db`.
3. **Program Klien Terminal**:
   * Skrip Node.js `client/client.js` yang menjalankan alur mahasiswa secara otomatis.
4. **Data Awal**:
   * Minimal 4 fasilitas (3 aktif dan 1 nonaktif) pada `catalog.db`.
   * Minimal 3 akun pengguna (1 admin dan 2 mahasiswa) dengan password ter-hash pada `loan.db`.

---

## 6. Aturan Bisnis (Business Rules)

| Kode | Aturan Bisnis | Konsekuensi Implementasi |
|---|---|---|
| **BR-01** | Komposisi Pengajuan | Satu pengajuan memuat tepat satu fasilitas, `start_at`, `end_at`, dan `purpose`. |
| **BR-02** | Format & Zona Waktu | Format waktu wajib berupa **ISO 8601 dengan offset zona waktu eksplisit** (contoh: `2026-11-02T09:00:00+07:00`). Server memproses dan menyimpan dalam standar **UTC (`Z`)**. Input tanpa offset ditolak dengan status **400 Bad Request**. |
| **BR-03** | Validitas Waktu | Waktu selesai (`end_at`) harus lebih besar secara mutlak dibanding waktu mulai (`start_at`). Pelanggaran aturan ini menghasilkan status **400 Bad Request**. |
| **BR-04** | Status Awal | Setiap pengajuan baru wajib memiliki status awal **`pending`**. |
| **BR-05** | Wewenang Keputusan | Hanya pengguna dengan peran **`admin`** yang berhak menyetujui (`approved`) atau menolak (`rejected`) pengajuan. Akses oleh mahasiswa ditolak dengan status **403 Forbidden**. |
| **BR-06** | Finalitas Status | Hanya pengajuan berstatus **`pending`** yang dapat diproses. Status **`approved`** dan **`rejected`** bersifat final. Percobaan memproses ulang menghasilkan status **409 Conflict**. |
| **BR-07** | Deteksi Bentrok Jadwal | Pengajuan pada fasilitas yang sama ditolak jika jadwalnya bertumpang tindih dengan pengajuan lain yang berstatus **`pending`** atau **`approved`**.<br/>Rumus irisan bentrok: `(start_baru < end_lama) AND (end_baru > start_lama)`.<br/>Terjadinya benturan menghasilkan status **409 Conflict**. |
| **BR-08** | Toleransi Batas Waktu | Jadwal yang batas mulainya tepat bertemu dengan batas selesai jadwal lama (`start_baru == end_lama`) atau sebaliknya **diperbolehkan** dan menghasilkan status **201 Created**. |
| **BR-09** | Status Rejected Bebas | Pengajuan berstatus **`rejected`** tidak memblokir jadwal fasilitas. |
| **BR-10** | Status Fasilitas | Fasilitas harus ada di Katalog dan berstatus aktif (`is_active == 1`). Fasilitas tidak ada menghasilkan **404 Not Found**. Fasilitas nonaktif menghasilkan **409 Conflict**. |
| **BR-11** | Integritas Kepemilikan | `borrower_id` diambil dari klaim subjek (`sub`) token JWT. Nilai `borrower_id` pada body request diabaikan oleh server. |
| **BR-12** | Batasan Pembuat | Akun dengan peran `admin` tidak diperbolehkan membuat pengajuan peminjaman (khusus mahasiswa). Pelanggaran menghasilkan **403 Forbidden**. |
| **BR-13** | Isolasi Visibilitas | Mahasiswa hanya dapat melihat pengajuan miliknya sendiri. Akses ke pengajuan orang lain menghasilkan **403 Forbidden**. Admin dapat melihat seluruh pengajuan. |

---

## 7. Use Case Utama

Sistem memiliki tiga use case utama:

```
+------------------------------------------------------------------------+
|                               CAMPUSLOAN                               |
|                                                                        |
|   +---------------+      UC-01: Melihat Fasilitas      +-----------+   |
|   |   Mahasiswa   |----------------------------------->|   Admin   |   |
|   +---------------+                                    +-----------+   |
|           |                                                  |         |
|           |              UC-02: Mengajukan Peminjaman        |         |
|           +--------------------------------------------------+         |
|           |                                                  |         |
|           |              UC-03: Memproses Pengajuan          |         |
|           +------------------------------------------------->+         |
+------------------------------------------------------------------------+
```

### 7.1 UC-01: Melihat Fasilitas
* **Aktor**: Mahasiswa dan Admin.
* **Prakondisi**: Pengguna telah login dan memiliki token JWT valid.
* **Alur Berhasil**:
  1. Pengguna memanggil `GET /api/v1/facilities` dengan header Bearer token.
  2. Layanan Katalog memverifikasi token dan mengembalikan daftar fasilitas kampus (200 OK).
  3. Pengguna memanggil `GET /api/v1/facilities/:id` untuk fasilitas tertentu.
  4. Layanan Katalog mengembalikan data detail fasilitas (200 OK).
* **Alur Gagal**:
  - Pengguna meminta ID fasilitas yang tidak terdaftar (misal ID `999`) $\rightarrow$ Server merespons **404 Not Found**.
* **Pascakondisi**: Data katalog tidak berubah (*safe method*).

### 7.2 UC-02: Mengajukan Peminjaman
* **Aktor**: Mahasiswa (`student`).
* **Prakondisi**: Mahasiswa telah login; fasilitas berstatus aktif.
* **Alur Berhasil**:
  1. Mahasiswa mengirim `POST /api/v1/loans` dengan data: `facility_id`, `start_at`, `end_at`, `purpose`.
  2. Layanan Peminjaman memverifikasi token dan peran `student`.
  3. Layanan Peminjaman memvalidasi format waktu ($end\_at > start\_at$).
  4. Layanan Peminjaman memanggil `GET /api/v1/facilities/:id` ke Katalog dengan meneruskan token pengguna.
  5. Layanan Katalog mengonfirmasi fasilitas ada dan aktif.
  6. Layanan Peminjaman memeriksa bentrok jadwal pada `loan.db`; tidak ditemukan tumpang tindih.
  7. Pengajuan disimpan dengan status `pending` dan `borrower_id` dari token.
  8. Mengembalikan representasi pengajuan baru (**201 Created**).
* **Alur Gagal**:
  - Mahasiswa mengajukan jadwal yang bertumpang tindih dengan jadwal aktif $\rightarrow$ Server merespons **409 Conflict** (`SCHEDULE_CONFLICT`).
* **Pascakondisi**: Pengajuan tersimpan jika berhasil; data tidak bertambah jika gagal.

### 7.3 UC-03: Memproses Pengajuan
* **Aktor**: Admin (`admin`).
* **Prakondisi**: Admin telah login; terdapat pengajuan berstatus `pending`.
* **Alur Berhasil**:
  1. Admin mengirim `PATCH /api/v1/loans/:id` dengan body `{"status": "approved"}` (atau `"rejected"`).
  2. Layanan Peminjaman memverifikasi peran `admin`.
  3. Memeriksa status saat ini; terbukti masih `pending`.
  4. Memperbarui status menjadi `approved` atau `rejected` dan mencatat timestamp pemrosesan.
  5. Mengembalikan data pengajuan terbaru (**200 OK**).
* **Alur Gagal**:
  - Admin mencoba memproses pengajuan yang sudah berstatus `approved` atau `rejected` $\rightarrow$ Server merespons **409 Conflict** (`INVALID_STATUS_TRANSITION`).
* **Pascakondisi**: Status pengajuan tersimpan permanen dan tidak dapat diubah lagi.

---

## 8. Kebutuhan Fungsional

### 8.1 Autentikasi dan Pengguna
* **FR-AUTH-01**: Menyediakan `POST /api/v1/auth/login` yang memvalidasi username dan password terhadap hash bcrypt di database.
* **FR-AUTH-02**: Menerbitkan token JWT bertanda tangan digital dengan algoritma `HS256`, memuat klaim `sub`, `username`, `role`, dan `exp`.
* **FR-AUTH-03**: Menolak kredensial tidak valid dengan respons `401 Unauthorized`.
* **FR-AUTH-04**: Mengamankan endpoint privat dengan middleware verifikasi token JWT dan penegakan peran (*Role-Based Access Control*).

### 8.2 Layanan Katalog Fasilitas
* **FR-CAT-01**: Menyediakan `GET /api/v1/facilities` untuk menyajikan seluruh daftar fasilitas kampus.
* **FR-CAT-02**: Mendukung parameter kueri filter kategori (`?category=...`) dan paginasi data (`?page=...&limit=...`).
* **FR-CAT-03**: Menyediakan `GET /api/v1/facilities/:id` untuk menyajikan rincian fasilitas berdasarkan ID (mengembalikan 404 jika tidak ditemukan).
* **FR-CAT-04**: Seluruh operasi GET pada Katalog dijamin aman (*safe*) dan tidak mengubah data pada basis data.

### 8.3 Layanan Peminjaman Fasilitas
* **FR-LOAN-01**: Menyediakan `POST /api/v1/loans` untuk membuat pengajuan baru berstatus `pending` khusus bagi mahasiswa.
* **FR-LOAN-02**: Melakukan validasi rentang waktu dan kueri pencegahan tumpang tindih jadwal.
* **FR-LOAN-03**: Melakukan panggilan HTTP inter-service ke Layanan Katalog dengan meneruskan token Bearer mahasiswa.
* **FR-LOAN-04**: Menyediakan `GET /api/v1/loans`. Mahasiswa hanya melihat pengajuan miliknya; admin melihat seluruh pengajuan.
* **FR-LOAN-05**: Menyediakan `GET /api/v1/loans/:id` dengan kontrol kepemilikan (hanya pemilik atau admin yang diizinkan; selain itu 403 Forbidden).
* **FR-LOAN-06**: Menyediakan `PATCH /api/v1/loans/:id` khusus admin untuk menyetujui atau menolak pengajuan pending.

### 8.4 Program Klien Terminal
* **FR-CLI-01**: Menyediakan skrip Node.js tunggal `client/client.js` yang secara otomatis menjalankan alur: login mahasiswa $\rightarrow$ ambil katalog $\rightarrow$ buat pengajuan $\rightarrow$ lihat pengajuan sendiri.
* **FR-CLI-02**: Menyimpan token JWT di memori selama proses eksekusi dan mengirimkannya via header `Authorization: Bearer <token>`.

---

## 9. Kebutuhan Non-Fungsional

| ID | Parameter | Keterangan Teknis |
|---|---|---|
| **NFR-01** | Keamanan Password | Password pengguna wajib disimpan dalam bentuk hash menggunakan algoritma **bcrypt** (minimal 10 salt rounds). Hash maupun password asli tidak boleh dikembalikan dalam respons API. |
| **NFR-02** | Keamanan Token | Algoritma penandatanganan JWT dikunci pada **`HS256`** di server. Secret key disimpan dalam variabel lingkungan (`.env`). Token yang diubah payload-nya wajib ditolak signature-nya. |
| **NFR-03** | Statelessness | Server tidak menyimpan status sesi pada memori. Setiap permintaan membawa seluruh konteks otentikasi pada header HTTP. |
| **NFR-04** | Loose Coupling | Layanan Peminjaman tidak boleh mengakses berkas atau tabel Layanan Katalog secara langsung. Komunikasi wajib melalui kontrak HTTP REST. |
| **NFR-05** | Isolasi Port | Layanan Katalog berjalan pada port **`3001`**, dan Layanan Peminjaman berjalan pada port **`3002`**. |
| **NFR-06** | Ketahanan Jaringan | Panggilan antar-layanan dilengkapi batas waktu (*timeout*) 3.000 ms. Jika Katalog tidak merespons, Peminjaman mengembalikan status **503 Service Unavailable**. |
| **NFR-07** | Auditabilitas Log | Layanan Peminjaman mencatat log konsol saat memanggil Katalog, memuat metode, URL tujuan, header Authorization, dan status respons. |

---

## 10. Arsitektur Layanan dan Prinsip SOA

### 10.1 Diagram Komponen Arsitektur

```
                           +----------------------------------------+
                           |              KLIEN SISTEM              |
                           |  +------------------+  +-------------+ |
                           |  | Skrip Terminal   |  | Postman     | |
                           |  | (Mahasiswa Flow) |  | (Admin/QA)  | |
                           |  +------------------+  +-------------+ |
                           +----------------------------------------+
                                       |                |
                       HTTP REST/JSON  |                | HTTP REST/JSON
                     (Bearer JWT User) |                | (Bearer JWT)
                                       v                v
+------------------------------------------+        +------------------------------------------+
|      LAYANAN PEMINJAMAN (Port 3002)      |        |        LAYANAN KATALOG (Port 3001)       |
|                                          |        |                                          |
|  +-------------------+  +-------------+  |  HTTP  |  +-------------------+  +-------------+  |
|  | Modul Auth        |  | Loans API   |  |------->|  | Middleware JWT    |  | Facilities  |  |
|  | POST /auth/login  |  | /loans      |  | Token  |  | (Katalog Guard)   |  | API         |  |
|  +-------------------+  +-------------+  | Forward|  +-------------------+  +-------------+  |
|  +-------------------+  +-------------+  |        +------------------------------------------+
|  | Middleware JWT    |  | Catalog     |  |                             |
|  | (RBAC & Owner)    |  | HTTP Client |  |                             v
|  +-------------------+  +-------------+  |                  +--------------------+
+------------------------------------------+                  | catalog.db (SQLite)|
                     |                                        | - facilities       |
                     v                                        +--------------------+
          +--------------------+
          |  loan.db (SQLite)  |
          |  - users           |
          |  - loans           |
          +--------------------+
```

### 10.2 Matriks Interaksi Komponen

| Jalur Komunikasi | Komponen Pemanggil (*Consumer*) | Komponen Penyedia (*Provider*) | Protokol | Format & Kredensial | Lokasi Penyimpanan |
|---|---|---|---|---|---|
| **Otentikasi Login** | Skrip Klien / Postman | Layanan Peminjaman (Modul Auth) | HTTP/1.1 POST | JSON (Username, Password) $\rightarrow$ JWT Token | Database `loan.db` |
| **Katalog Fasilitas** | Skrip Klien / Postman | Layanan Katalog | HTTP/1.1 GET | JSON, Header `Authorization: Bearer <token>` | Database `catalog.db` |
| **Pengajuan Baru** | Skrip Klien / Postman | Layanan Peminjaman | HTTP/1.1 POST | JSON, Header `Authorization: Bearer <token>` | Database `loan.db` |
| **Panggilan Inter-Service** | Layanan Peminjaman (`catalogClient.js`) | Layanan Katalog | HTTP/1.1 GET | JSON, Meneruskan token pengguna | Memori (Panggilan HTTP) |
| **Persetujuan Admin** | Postman | Layanan Peminjaman | HTTP/1.1 PATCH | JSON (`{"status": "approved"}`), Token Admin | Database `loan.db` |

### 10.3 Empat Prinsip Inti Layanan

1. **Standardized Service Contract**: Seluruh endpoint menggunakan format seragam: prefiks `/api/v1`, header `Accept: application/json`, dan envelope respons terstandar (`{ "data": ... }` untuk sukses dan `{ "error": ... }` untuk gagal).
2. **Loose Coupling**: Layanan Peminjaman tidak membaca berkas SQLite atau tabel Katalog secara langsung. Hubungan murni melalui kontrak Web API dan URL dinamis pada variabel lingkungan (`CATALOG_BASE_URL`).
3. **Statelessness**: Server tidak menyimpan sesi. Setiap request membawa token JWT yang memuat identitas dan hak akses secara mandiri.
4. **Composability**: Layanan Peminjaman mengomposisikan kemampuan Layanan Katalog (validasi status aktif fasilitas) ke dalam alur transaksi peminjaman.

### 10.4 Pemanfaatan Ulang dan Logika Agnostic

* **Contoh Reuse**: Layanan Katalog dirancang bersifat otonom sehingga dapat dimanfaatkan langsung oleh aplikasi kampus lain (misalnya Sistem Informasi Jadwal Kuliah) tanpa memerlukan modifikasi pada kode Katalog.
* **Logic Agnostic**: Modul verifikasi tanda tangan JWT, middleware penanganan error JSON, dan endpoint pembacaan daftar fasilitas Katalog (dapat dipakai lintas proses bisnis).
* **Logic Non-Agnostic**: Aturan bentrok jadwal rentang waktu dan aturan transisi status peminjaman (khusus untuk alur bisnis peminjaman).

### 10.5 Format Bukti Log HTTP Inter-Service

Layanan Peminjaman mencatat rekaman log konsol saat memanggil Katalog:
```text
[INTER-SERVICE CALL] 2026-10-24T08:30:00.120Z | OUTGOING HTTP REQUEST
  Origin Service : Loan-Service (Port 3002)
  Target Service : Catalog-Service (Port 3001)
  Method / URL   : GET http://localhost:3001/api/v1/facilities/1
  Headers Sent   : { "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6..." }
[INTER-SERVICE RESP] 2026-10-24T08:30:00.155Z | INCOMING HTTP RESPONSE
  Response Status: 200 OK (Latency: 35ms)
  Response Body  : { "data": { "id": 1, "name": "Ruang Seminar A", "is_active": 1 } }
```

---

## 11. Perancangan REST API dan RMM Level 2

Sistem memenuhi **Richardson Maturity Model (RMM) Level 2**:
* **Resource URIs**: Menggunakan kata benda jamak yang intuitif (`/api/v1/facilities` dan `/api/v1/loans`).
* **HTTP Verbs**: Menggunakan kata kerja HTTP sesuai semantik:
  * `GET`: Membaca data tanpa efek samping modifikasi (*safe method*).
  * `POST`: Membuat data transaksi baru atau memproses kredensial login.
  * `PATCH`: Memodifikasi sebagian status resource secara spesifik.
* **HTTP Status Codes**: Menggunakan kode status resmi (200, 201, 400, 401, 403, 404, 409, 503).

### 11.1 Bukti Bahwa GET Bersifat Aman (*Safe Method*)
Operasi `GET` diuji pada skenario U02. Pemanggilan `GET /facilities` secara berulang-ulang membuktikan bahwa isi tabel dan checksum basis data `catalog.db` tidak mengalami perubahan (*safe & read-only*).

### 11.2 Risiko Pengulangan POST
Metode `POST` bersifat tidak idempoten (*non-idempotent*). Pengiriman `POST /loans` berulang akibat gangguan jaringan dimitigasi oleh aturan bentrok jadwal (BR-07). Request pengulangan kedua yang membawa rentang waktu sama persis akan langsung ditolak dengan status **409 Conflict** (`SCHEDULE_CONFLICT`).

### 11.3 Justifikasi Pemilihan PATCH Dibanding PUT
Metode `PUT` mengganti seluruh representasi resource dan mewajibkan klien mengirim ulang seluruh field. Karena proses persetujuan admin hanya memodifikasi atribut status, penggunaan **`PATCH /loans/:id`** lebih efisien, hemat bandwidth, dan mencegah risiko tertimpanya field lain.

---

## 12. Struktur Basis Data

### 12.1 Layanan Katalog (`catalog.db`)

**Tabel `facilities`**:
```sql
CREATE TABLE facilities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('room', 'equipment')),
    description TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1))
);
```

### 12.2 Layanan Peminjaman (`loan.db`)

**Tabel `users`**:
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('student', 'admin')),
    full_name TEXT NOT NULL
);
```

**Tabel `loans`**:
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

*Catatan*: Relasi `loans.facility_id` ke tabel fasilitas bersifat logis (*logical reference*) tanpa foreign key fisik lintas berkas database, menjamin asas kemandirian basis data (*database-per-service*).

---

## 13. Spesifikasi Kontrak REST API

Berikut adalah **tabel tunggal terpadu** yang memuat spesifikasi 7 kontrak endpoint minimum sesuai ketentuan Bab 3.2 pedoman tugas:

| No | Pemilik Layanan | Method & URL | Parameter & Body Request | Hak Akses | Status Sukses | Status Error & Kondisi Pemicu |
|---|---|---|---|---|---|---|
| **1** | Layanan Peminjaman | `POST /api/v1/auth/login` | **Body (JSON)**:<br/>• `username`: string, wajib<br/>• `password`: string, wajib | Publik (Tanpa token) | **200 OK** | • **400 Bad Request**: Field kosong / JSON rusak.<br/>• **401 Unauthorized**: Username tidak ada / password salah. |
| **2** | Layanan Katalog | `GET /api/v1/facilities` | **Query Parameter (Opsional)**:<br/>• `category`: string enum (`room`, `equipment`)<br/>• `page`: integer $\ge 1$<br/>• `limit`: integer $\ge 1$ | Mahasiswa & Admin (Wajib Bearer JWT) | **200 OK** | • **401 Unauthorized**: Token hilang / tidak valid / kedaluwarsa. |
| **3** | Layanan Katalog | `GET /api/v1/facilities/:id` | **Path Parameter**:<br/>• `id`: integer positif, wajib | Mahasiswa & Admin (Wajib Bearer JWT) | **200 OK** | • **401 Unauthorized**: Token tidak valid.<br/>• **404 Not Found**: ID fasilitas tidak terdaftar. |
| **4** | Layanan Peminjaman | `POST /api/v1/loans` | **Body (JSON)**:<br/>• `facility_id`: integer, wajib<br/>• `start_at`: string ISO 8601 + offset, wajib<br/>• `end_at`: string ISO 8601 + offset, wajib, harus $> start\_at$<br/>• `purpose`: string, wajib, 5–255 char | Mahasiswa Saja (Role `student`) | **201 Created** | • **400 Bad Request**: Waktu selesai $\le$ mulai, format waktu tanpa offset.<br/>• **401 Unauthorized**: Token hilang / tidak valid.<br/>• **403 Forbidden**: Role pemanggil adalah `admin`.<br/>• **404 Not Found**: Fasilitas tidak ada di Katalog.<br/>• **409 Conflict**: Fasilitas nonaktif (`FACILITY_INACTIVE`) atau jadwal bentrok (`SCHEDULE_CONFLICT`). |
| **5** | Layanan Peminjaman | `GET /api/v1/loans` | **Query Parameter (Opsional)**:<br/>• `status`: string enum (`pending`, `approved`, `rejected`) | Mahasiswa & Admin | **200 OK** | • **401 Unauthorized**: Token hilang / tidak valid. *(Mahasiswa hanya melihat miliknya; Admin melihat seluruh data).* |
| **6** | Layanan Peminjaman | `GET /api/v1/loans/:id` | **Path Parameter**:<br/>• `id`: integer positif, wajib | Pemilik Data atau Admin | **200 OK** | • **401 Unauthorized**: Token tidak valid.<br/>• **403 Forbidden**: Mahasiswa mencoba mengakses pengajuan milik mahasiswa lain.<br/>• **404 Not Found**: ID pengajuan tidak ditemukan. |
| **7** | Layanan Peminjaman | `PATCH /api/v1/loans/:id` | **Path Parameter**:<br/>• `id`: integer positif, wajib<br/>**Body (JSON)**:<br/>• `status`: string enum (`approved`, `rejected`), wajib | Admin Saja (Role `admin`) | **200 OK** | • **400 Bad Request**: Nilai status tidak valid.<br/>• **401 Unauthorized**: Token tidak valid.<br/>• **403 Forbidden**: Mahasiswa mencoba memproses status.<br/>• **404 Not Found**: ID pengajuan tidak ditemukan.<br/>• **409 Conflict**: Status pengajuan sudah final (`approved` atau `rejected`). |

---

### 13.1 Format Envelope Respon Standar

**Respon Berhasil**:
```json
{
  "data": { ... }
}
```

**Respon Gagal**:
```json
{
  "error": {
    "code": "SCHEDULE_CONFLICT",
    "message": "Jadwal peminjaman bertumpang tindih dengan pengajuan aktif lainnya.",
    "details": []
  }
}
```

---

## 14. Otentifikasi dan Otorisasi

### 14.1 Alur Kerja JWT
1. Klien mengirim kredensial ke `POST /api/v1/auth/login`.
2. Server memvalidasi kecocokan password menggunakan `bcrypt.compare()`.
3. Server menerbitkan JWT bertanda tangan digital dengan algoritma `HS256` menggunakan kunci rahasia pada variabel lingkungan `JWT_SECRET`.
4. Payload JWT memuat klaim standar: `sub` (User ID), `username`, `role` (`student` atau `admin`), dan `exp` (waktu kedaluwarsa 1 jam).
5. Klien menyertakan token pada header: `Authorization: Bearer <token>`.
6. Middleware memvalidasi signature dan masa aktif token (`exp`). Token yang hilang, rusak, kedaluwarsa, atau dimodifikasi ditolak dengan respons **401 Unauthorized**.
7. Handler rute memverifikasi hak akses peran dan kepemilikan data (menolak akses terlarang dengan **403 Forbidden**).

### 14.2 Matriks Hak Akses Minimum

| Operasi | Mahasiswa (`student`) | Admin (`admin`) | Tanpa Token |
|---|---|---|---|
| Login Akun Uji | Ya | Ya | Ya (200 OK) |
| Melihat Katalog dan Detail | Ya (200 OK) | Ya (200 OK) | Ditolak (401) |
| Membuat Pengajuan Baru | Ya, atas nama sendiri (201) | Ditolak (403) | Ditolak (401) |
| Melihat Daftar Seluruh Pengajuan | Hanya miliknya (200) | Seluruh data sistem (200) | Ditolak (401) |
| Melihat Detail Pengajuan Spesifik | Hanya miliknya (200) | Bebas akses semua (200) | Ditolak (401) |
| Menyetujui / Menolak Pengajuan | Ditolak (403) | Ya, untuk pending (200) | Ditolak (401) |

---

## 15. Rencana Pengujian (10 Skenario Minimum)

Pengujian mencakup 10 skenario wajib sesuai tabel halaman 4 pedoman tugas:

| ID | Skenario Pengujian | Akun & Prasyarat | Endpoint & Tindakan | Hasil yang Diharapkan | Kode Status |
|---|---|---|---|---|---|
| **U01** | Login benar lalu login password salah | Akun `mhs_budi` | 1. Login password benar.<br/>2. Login password salah. | 1. 200 dengan token JWT.<br/>2. 401 tanpa token JWT. | 200 OK<br/>401 Unauthorized |
| **U02** | Baca daftar dan detail fasilitas; ulangi GET | Token valid mahasiswa | 1. `GET /facilities`<br/>2. `GET /facilities/1`<br/>3. Ulangi GET berulang. | Data sesuai data awal dan tidak berubah akibat operasi GET. | 200 OK |
| **U03** | Mahasiswa membuat pengajuan valid | Akun `mhs_budi` (fasilitas 1 aktif) | `POST /loans` jadwal valid di masa depan. | 201 pending; pemilik dari token; panggilan HTTP ke Katalog terbukti di log konsol. | 201 Created |
| **U04** | Admin menyetujui satu pending dan menolak pending lain | Akun `admin_kampus` & 2 pengajuan pending | 1. `PATCH /loans/1` approved.<br/>2. `PATCH /loans/2` rejected. | Status approved/rejected tersimpan dan dapat dilihat oleh pemilik pengajuan. | 200 OK |
| **U05** | Waktu selesai sebelum mulai; jadwal bertumpang tindih | Akun `mhs_budi` | 1. `POST /loans` ($end \le start$).<br/>2. `POST /loans` jadwal bentrok. | 1. 400 untuk waktu tidak valid.<br/>2. 409 untuk benturan; tidak ada data baru. | 400 Bad Request<br/>409 Conflict |
| **U06** | Panggil endpoint terlindungi tanpa token | Tanpa header Authorization | Panggil `GET /facilities` atau `POST /loans`. | 401 Unauthorized; tidak ada perubahan data pada sistem. | 401 Unauthorized |
| **U07** | Panggil endpoint dengan token kedaluwarsa | Token uji expired | Panggil `GET /loans` dengan token lampau. | 401 Unauthorized; membuktikan klaim `exp` benar-benar divalidasi. | 401 Unauthorized |
| **U08** | Ubah payload role JWT tanpa signature baru | Token mahasiswa diubah role jadi admin | Panggil `PATCH /loans/1` dengan token hasil manipulasi payload. | 401 Unauthorized; token hasil manipulasi ditolak karena signature tidak cocok. | 401 Unauthorized |
| **U09** | Mahasiswa mencoba menyetujui pengajuan | Akun `mhs_budi` (role `student`) | Mahasiswa memanggil `PATCH /loans/1` status approved. | 403 Forbidden; status pengajuan tidak berubah di database. | 403 Forbidden |
| **U10** | Mahasiswa A membaca/ubah pengajuan B & memalsukan borrower_id | Akun `mhs_budi` (A) & `mhs_sari` (B) | 1. Mahasiswa A panggil `GET /loans/:id_B`.<br/>2. Mahasiswa A kirim `POST /loans` dengan `borrower_id: B`. | 1. 403 Forbidden pada akses data B.<br/>2. Pengajuan baru tetap milik token A. | 403 Forbidden<br/>201 Created |

---

## 16. Program Klien Terminal

Program klien terminal diimplementasikan pada berkas `client/client.js`. Skrip ini dieksekusi melalui perintah:
```bash
node client/client.js
```

### Alur Eksekusi Otomatis Konsol
1. **Langkah 1**: Melakukan login otomatis akun mahasiswa `mhs_budi` $\rightarrow$ memperoleh token JWT dan menyimpannya di memori.
2. **Langkah 2**: Memanggil `GET /api/v1/facilities` ke Layanan Katalog di port 3001 $\rightarrow$ menampilkan daftar fasilitas aktif pada layar terminal.
3. **Langkah 3**: Mengirim `POST /api/v1/loans` ke Layanan Peminjaman di port 3002 $\rightarrow$ membuat permohonan peminjaman baru.
4. **Langkah 4**: Memanggil `GET /api/v1/loans` $\rightarrow$ menampilkan riwayat pengajuan milik mahasiswa tersebut dan mengonfirmasi status `pending`.

---

## 17. Data Awal (Seed Data)

### 17.1 Fasilitas Kampus (`catalog.db`)
| ID | Nama Fasilitas | Kategori | Deskripsi | Status Aktif | Kebutuhan Uji |
|---|---|---|---|---|---|
| **1** | Ruang Seminar Gedung A | `room` | Kapasitas 60 kursi, AC, proyektor | **Aktif** (`1`) | Pengajuan utama (U03) |
| **2** | Proyektor Portabel Epson P-01 | `equipment` | Proyektor 4000 lumens dan HDMI | **Aktif** (`1`) | Pengujian peminjaman alat |
| **3** | Studio Multimedia Kreatif | `room` | Peredam suara dan kamera 4K | **Aktif** (`1`) | Reservasi ruangan khusus |
| **4** | Lab Komputer Pemrograman 2 | `room` | Sedang dalam pemeliharaan berkala | **Nonaktif** (`0`) | Pengujian error 409 fasilitas nonaktif |

### 17.2 Akun Pengguna Uji (`loan.db`)
| ID | Username | Role | Password Plaintext (Hanya untuk Uji) | Nama Pengguna | Kebutuhan Uji |
|---|---|---|---|---|---|
| **1** | `admin_kampus` | `admin` | `Admin#Pass2026` | Administrator Sarpras | Persetujuan admin (U04) & RBAC |
| **2** | `mhs_budi` | `student` | `Budi#Pass2026` | Budi Santoso | Alur pengajuan utama (Aktor A) |
| **3** | `mhs_sari` | `student` | `Sari#Pass2026` | Siti Sari Lestari | Isolasi kepemilikan data (Aktor B - U10) |

---

## 18. Struktur Berkas Proyek

```text
source_code/
├── catalog-service/                  # Layanan Katalog (Port 3001)
│   ├── src/
│   │   ├── config/database.js        # Koneksi SQLite catalog.db
│   │   ├── controllers/catalog.js    # Handler fasilitas, filter, & paginasi
│   │   ├── middleware/auth.js        # Middleware verifikasi token JWT
│   │   ├── routes/facilities.js      # Rute /api/v1/facilities
│   │   └── server.js                 # Entry point Express Port 3001
│   ├── data/
│   │   └── seed.js                   # Skrip DDL & seed facilities
│   ├── .env.example
│   └── package.json
├── loan-service/                     # Layanan Peminjaman (Port 3002)
│   ├── src/
│   │   ├── clients/catalogClient.js  # HTTP Client pemanggil Katalog (token forward)
│   │   ├── config/database.js        # Koneksi SQLite loan.db
│   │   ├── controllers/
│   │   │   ├── auth.js               # Handler login & pembuatan JWT
│   │   │   └── loan.js               # Handler pengajuan, PATCH, & kepemilikan
│   │   ├── middleware/
│   │   │   ├── auth.js               # Middleware verifikasi token JWT
│   │   │   └── rbac.js               # Middleware otorisasi peran
│   │   ├── routes/
│   │   │   ├── auth.js               # Rute /api/v1/auth
│   │   │   └── loans.js              # Rute /api/v1/loans
│   │   ├── services/loanService.js   # Mesin bentrok jadwal & validasi waktu
│   │   └── server.js                 # Entry point Express Port 3002
│   ├── data/
│   │   └── seed.js                   # Skrip DDL & seed users/loans
│   ├── .env.example
│   └── package.json
├── client/
│   ├── client.js                     # Program klien terminal otomatis
│   └── package.json
├── postman/
│   └── CampusLoan.postman_collection.json # Koleksi pengujian Postman
├── package.json                      # Root workspace scripts
└── Panduan_dan_Dokumentasi_API.md     # Berkas panduan resmi
```

---

## 19. Deliverable dan Laporan Kelompok

Arsip final dikumpulkan dalam satu berkas **`ABS_KelompokXX.zip`** yang memuat:
1. `Laporan_Kelompok.pdf` (ketat 4–6 halaman di luar sampul dan daftar pustaka).
2. Folder `source_code/` (kedua layanan, skrip klien, seed data, tanpa `node_modules`).
3. `Panduan_dan_Dokumentasi_API.md` (spesifikasi 7 endpoint dan panduan instalasi).

### Struktur 7 Bagian Laporan Kelompok
* **Cover**: Judul proyek, nomor kelompok, nama lengkap, dan NIM seluruh anggota.
* **Bab 1**: Pendahuluan, rumusan masalah, aktor sistem, dan 3 use case (alur berhasil dan gagal).
* **Bab 2**: Arsitektur dan konsep layanan (diagram komponen, bukti 4 prinsip inti SOA, logic agnostic/non-agnostic, contoh reuse, dan cuplikan log HTTP inter-service).
* **Bab 3**: Perancangan dan implementasi REST API (skema resource, bukti RMM Level 2, bukti GET aman, risiko POST berulang, dan justifikasi PATCH vs PUT).
* **Bab 4**: Otentifikasi dan otorisasi (alur login, bagian JWT, verifikasi signature & exp, penerusan token, statelessness, dan matriks hak akses).
* **Bab 5**: Hasil pengujian (tabel 10 skenario uji, respon aktual, kesimpulan lulus/gagal, dan cuplikan respon penting).
* **Bab 6**: Evaluasi dan kontribusi anggota (capaian, kendala, tabel nama/NIM, pekerjaan konkret, lokasi berkas/commit, pengujian tiap anggota, refleksi pembelajaran, dan daftar pustaka).

---

## 20. Alokasi Kerja Tim dan Runbook Demonstrasi

### 20.1 Matriks Pembagian Kerja Tim (3 Anggota)

Pembagian kerja disusun secara berimbang dan mencerminkan kemandirian eksekusi sejak fase awal:

| Identitas Anggota | Peran Modul & Tanggung Jawab | Implementasi Kodingan Konkret | Tanggung Jawab Pengujian | Tanggung Jawab Laporan |
|---|---|---|---|---|
| **Mahasiswa 1** | **Pengembang Layanan Katalog & Autentikasi Sistem** | • Layanan Katalog Port 3001 (`catalog-service`).<br/>• Konfigurasi basis data SQLite `catalog.db` & `loan.db`.<br/>• Modul Login `POST /auth/login` & penerbitan token JWT.<br/>• Middleware `verifyToken` JWT di kedua layanan. | Skenario **U01, U02, U06, U07** | Penulisan Bab 1 (Pendahuluan & Kebutuhan) & Bab 4 (Otentifikasi & Keamanan). |
| **Mahasiswa 2** | **Pengembang Layanan Peminjaman & Integritas Transaksi** | • Layanan Peminjaman Port 3002 (`loan-service`).<br/>• Mesin deteksi bentrok jadwal (*overlap engine*).<br/>• Endpoint `POST /loans` & `GET /loans`.<br/>• Modul HTTP inter-service `catalogClient.js` & logger. | Skenario **U03, U05** | Penulisan Bab 2 (Arsitektur Layanan) & Bab 3 (Perancangan Transaksi REST API). |
| **Mahasiswa 3** | **Pengembang Program Klien & Otorisasi Operasional Admin** | • Program Klien Terminal konsol (`client/client.js`).<br/>• Endpoint persetujuan admin `PATCH /loans/:id`.<br/>• Kontrol kepemilikan data `GET /loans/:id`.<br/>• Penyusunan Postman Collection (`CampusLoan.json`). | Skenario **U04, U08, U09, U10** | Penulisan Bab 5 (Hasil Pengujian) & Bab 6 (Evaluasi Kontribusi Anggota). |

### 20.2 Alur Kronologis Pengerjaan Proyek

```
[FASE 1: FONDASI & KEAMANAN]
  Mahasiswa 1: Membangun basis data SQLite, modul login, penerbitan JWT, dan Layanan Katalog (Port 3001).
  (Fondasi sistem dan token autentikasi siap digunakan).
        │
        ▼
[FASE 2: TRANSAKSI & BENTROK JADWAL]
  Mahasiswa 2: Mengembangkan Layanan Peminjaman (Port 3002), rumus bentrok jadwal, dan pemanggilan HTTP ke Katalog.
  (Transaksi peminjaman mahasiswa aktif dan terverifikasi).
        │
        ▼
[FASE 3: KEPUTUSAN ADMIN & KLIEN TERMINAL]
  Mahasiswa 3: Mengembangkan endpoint persetujuan admin (PATCH) dan program klien terminal konsol.
  (Seluruh alur sistem end-to-end terhubung penuh).
        │
        ▼
[FASE 4: PENGUJIAN & PELAPORAN]
  Seluruh Tim: Menjalankan 10 skenario pengujian di Postman, melengkapi screenshot, dan menyusun laporan akhir.
```

### 20.3 Runbook Demonstrasi (10 Menit Presentasi + 5 Menit Q&A)

* **Menit 00:00–02:00 (Arsitektur & Kontrak Layanan)**:
  * Pemaparan diagram komponen dua layanan (port 3001 dan port 3002), pemisahan database SQLite, kontrak 7 endpoint, dan penerapan 4 prinsip inti SOA.
* **Menit 02:00–07:00 (Alur Peminjaman Mahasiswa & Persetujuan Admin)**:
  * Menjalankan skrip konsol `node client/client.js` untuk mendemonstrasikan login mahasiswa, pembacaan katalog, pengiriman pengajuan, dan pengecekan status secara otomatis.
  * Membuka Postman untuk mendemonstrasikan akun Admin yang meninjau pengajuan mahasiswa dan menyetujuinya via `PATCH`.
* **Menit 07:00–10:00 (Pengujian Kasus Negatif & Bukti Inter-Service)**:
  * Menunjukkan bukti rekaman log HTTP konsol saat Peminjaman memanggil Katalog.
  * Menunjukkan penolakan bentrok jadwal (409 Conflict).
  * Menunjukkan penolakan token palsu/kedaluwarsa (401 Unauthorized) dan penolakan hak akses (403 Forbidden).
* **Menit 10:00–15:00 (Sesi Tanya Jawab Individu dengan Dosen)**:
  * Setiap anggota menjawab pertanyaan teknis mengenai berkas kode yang ditulisnya dan keterkaitannya dengan sistem secara keseluruhan.

---

## 21. Matriks Keterlacakan Kebutuhan

| Ketentuan Dokumen Tugas ABS 2026 v1 | Bagian Terkait pada PRD |
|---|---|
| Pemisahan dua proses layanan domain pada port berbeda | §10.1, §18 |
| Penyimpanan terpisah per layanan (*database-per-service*) | §12.1, §12.2 |
| Kontrak minimum 7 endpoint diawali `/api/v1` | §13 |
| Validasi bentrok jadwal & status final | §6 (BR-02–BR-09), §10.3 |
| Panggilan HTTP antar-layanan dengan penerusan Bearer token | §10.3, §10.5 |
| Richardson Maturity Model Level 2, GET aman, POST retry, PATCH vs PUT | §11.1–§11.3 |
| Verifikasi tanda tangan JWT, claim `exp`, dan kontrol RBAC | §14.1, §14.2 |
| Program klien terminal konsol sederhana | §16 |
| 10 Skenario pengujian minimum (U01–U10) | §15 |
| Seed data minimal 3 fasilitas dan 3 akun pengguna | §17.1, §17.2 |
| Komponen pengumpulan berkas dan struktur 7 bab laporan | §19 |
| Keterlibatan dan kesiapan 3 anggota tim | §20.1, §20.3 |

---

## 22. Glosarium

* **JSON Web Token (JWT)**: Standar terbuka (RFC 7519) untuk mentransmisikan klaim identitas secara aman dalam bentuk objek JSON bertanda tangan digital.
* **Role-Based Access Control (RBAC)**: Mekanisme pembatasan wewenang sistem berdasarkan peran pengguna yang telah terverifikasi.
* **Loose Coupling**: Sifat arsitektur di mana komponen layanan memiliki ketergantungan minimal satu sama lain dan hanya berinteraksi melalui antarmuka kontrak resmi.
* **Statelessness**: Karakteristik layanan di mana server tidak menyimpan status sesi klien di antara permintaan; setiap permintaan membawa seluruh konteks yang diperlukan.
* **Composability**: Kemampuan merangkai fungsionalitas dari beberapa layanan independen untuk merealisasikan proses bisnis yang lebih luas.
* **Idempotency**: Karakteristik operasi API di mana pemanggilan berulang kali dengan parameter yang sama menghasilkan dampak dan kondisi akhir sistem yang konsisten.

---


