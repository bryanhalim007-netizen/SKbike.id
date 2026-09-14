# SK BIKE — Katalog Sepeda & Sepeda Listrik (Online)

## Problem Statement (asli)
Website jual sepeda biasa & sepeda listrik: katalog + kategori (Sepeda Gunung, BMX, Sepeda Anak, Sepeda Lipat, Sepeda Listrik), tombol pop-out kontak WhatsApp admin, dan Admin Panel untuk mengelola daftar barang.

## Arsitektur
- **Mode: ONLINE (server + database).** Data produk & sesi login di server (FastAPI + MongoDB). Frontend memanggil backend via `REACT_APP_BACKEND_URL` (axios, `withCredentials`). Auth JWT httpOnly cookie.
- Frontend: React (CRA + craco), Tailwind, shadcn/ui, lucide-react, sonner. Data layer: `frontend/src/lib/api.js`.
- Fitur OFFLINE (localStorage `store.js`, PWA service worker, Install App, ekspor/impor) TELAH DIHAPUS (2026-06). SW lama otomatis di-unregister di `index.js` + `public/sw.js`.
- APK Android (Capacitor, `/app/mobile`) membungkus web app online; admin mengunduhnya dari Admin Panel via `GET /api/admin/app`. File di `/app/backend/static/SK-Bike-Store.apk`.

## User Personas
- Pengunjung: menelusuri katalog, filter kategori, sortir harga, chat WhatsApp.
- Admin (owner toko): kelola produk (harga, kode, stok, spesifikasi, gambar) via panel.

## Core Requirements
- Katalog publik TANPA harga & TANPA kode (hanya nama, kategori, gambar, stok, spesifikasi, deskripsi).
- Admin Panel dengan harga & kode, CRUD produk, upload gambar (base64 lokal).
- Tombol pop-out WhatsApp (nomor 628125559681).
- Tema gelap/sporty hitam-merah, Bahasa Indonesia.

## Kredensial Admin (lokal)
- Email: bryan.halim007@gmail.com / Password: velox2026 (dari env REACT_APP_ADMIN_EMAIL/PASSWORD).

## Implemented (per 2026-06)
- Storefront: hero sporty (headline italic, skew tag, speed lines, red beam, watermark, strip statistik, marquee kinetik), perks, katalog grid.
- Kategori (8): Sepeda Listrik, Sepeda Gunung, BMX, Sepeda Anak, Sepeda Lipat, Motor / Mobil Aki, Mini Trail, Road Bike.
- Filter kategori (tab) + sortir harga (Murah-Mahal / Mahal-Murah / Terbaru) + pencarian nama.
- ProductCard sporty (hover glow, zoom, tag miring, judul italic) + modal detail spesifikasi.
- Pop-out WhatsApp menarik (header gradient, topik cepat: Tanya Stok & Harga / Konsultasi Service / Sepeda Listrik, input pesan bebas).
- Admin: login lokal, dashboard stats, tabel (harga+kode), tambah/edit/hapus, pencarian kode/nama, filter kategori + pengurutan per-kategori.
- Alamat toko di footer: Jl Pawan 1, Ketapang, Kalimantan Barat.
- Responsif mobile + viewport meta; penyempurnaan mobile (kontras hero, wrap kontrol, ukuran nilai statistik).
- Code-review fixes: kredensial ke env, stable React keys, use-toast effect deps.
- PWA installable + offline setelah kunjungan pertama.
- Diverifikasi testing_agent (15/15 pass) + unit logic store.js via Node.
- Ekspor/Impor data katalog (JSON) di Admin: Ekspor unduh file, Impor mode Ganti Semua / Gabung (diuji browser: replace→2, merge→3, restore seed→8).
- APK Android (Capacitor) — `/app/SK-Bike-Store.apk` (com.skbike.store, minSdk 22, 4.6MB, offline penuh). Proyek di `/app/mobile`. Build via qemu-x86_64 aapt2 override (host arm64). Panduan di `/app/README_APK.md`.

## Migrasi ke ONLINE (per 2026-06)
- Frontend dipindah dari localStorage (`store.js` — DIHAPUS) ke backend API (`api.js`, axios withCredentials). AuthContext pakai JWT cookie via `/api/auth/*`.
- Storefront: config + produk dari `/api/config` & `/api/products`. Admin: `/api/admin/products|stats|upload` + CRUD server.
- Fitur offline dihapus: service worker (auto-unregister), tombol Install PWA, ekspor/impor.
- Data produk seed diganti brand "SK" (Velox→SK di DB & seed backend).
- Logo toko diganti dengan logo SK merah mengilap (background dibuat transparan) di navbar, footer, login & panel admin. Klik logo → scroll ke atas (kembali ke tampilan awal).
- Navbar: tab Kategori & Keunggulan dihapus; tambah tab **Find Us** (WhatsApp, Instagram @skbike_ketapang, alamat + jam buka, tombol Petunjuk Arah, peta Google Maps embed — lokasi 5X27+RQ Baru, Ketapang).
- APK Android downloadable dari Admin Panel: endpoint `GET /api/admin/app` (admin-only, cookie) + `GET /api/admin/app-info`; file `/app/backend/static/SK-Bike-Store.apk` (~5.8MB). Diuji: app-info OK, download 200 + header apk, unauth 401.
- Riwayat Perubahan Harga: setiap update harga produk dicatat di koleksi `price_history` (old/new price, changed_by, changed_at). Endpoint `GET /api/admin/price-history` & `GET /api/admin/products/{id}/price-history`. UI: tombol History per baris di Admin Panel → modal timeline (naik=merah/turun=hijau). Diuji via curl (2 record) + UI modal.

## Kasir / Kalkulator POS (per 2026-06)
- Ditambahkan fitur **Kasir** sebagai tab di dalam Admin Panel (tab: Produk | Kasir). Port setia dari repo referensi Kalkulator (bryanhalim007/Kalkulator).
- **Kalkulator kode rahasia**: keypad huruf P Y F V H K T B R Q Z (P=0,Y=1,F=2,V=3,H=4,K=5,T=6,B=7,R=8,Q=9, Z=ulang angka sebelumnya). Digit di-pad kanan ke 7 digit → Harga Modal (mis. "YVK"→"135"→Rp 1.350.000). Tujuan: sembunyikan harga modal dari pembeli di depan kasir.
- Alur: input kode → Check Harga Jual → input Margin (Rp) + chip cepat (+100rb/+250rb/+500rb/+1jt) → Harga Jual = Modal + Margin. Tombol "Harga ke Pembeli" (modal harga jual besar) & "Barang Terjual" (form catatan penjualan).
- Form penjualan (teks saja, tanpa foto): tanggal, nama pembeli, nama barang, kode barang, ukuran/warna, harga modal, margin, harga jual, metode pembayaran (Cash/Transfer), sudah diambil (Belum/Sudah), metode pengambilan (Pick up Sendiri/Travel), alamat pengiriman.
- **Riwayat penjualan**: daftar transaksi + kartu ringkasan (penjualan & omzet hari ini, total penjualan, total margin), edit & hapus (soft delete).
- Backend: koleksi `sales` + rute admin-protected `POST/GET/PUT/DELETE /api/admin/sales` & `GET /api/admin/sales/summary` (soft delete via `deleted_at`). Diuji: curl CRUD lengkap OK + testing_agent frontend 100% pass. Regresi harga publik tetap tersembunyi (dikonfirmasi).
- **Tambahan (2026-06)**: (a) modal "Harga ke Pembeli" background hitam solid; (b) Kode Harga otomatis mengisi Kode Barang di form (tetap bisa diedit); (c) upload **Foto Produk** & **Bukti Transfer** di form penjualan via object storage (`POST /api/admin/upload`, field `foto_produk`/`bukti_transfer`), tampil sebagai thumbnail + lightbox di Riwayat; (d) tombol **Bagikan ke WhatsApp** per baris Riwayat (wa.me dengan ringkasan penjualan). Diuji testing_agent 100% pass.

## Kunci PIN, Kelola Admin & Absensi (per 2026-06)
- **Kunci PIN tab**: tab Dashboard Produk (default PIN 1614) & Kasir (default PIN 1515) dikunci PinGate (keypad 4 angka, verifikasi ke server). Unlock berlaku per sesi. PIN disimpan di koleksi `settings` dan bisa diubah super admin dari tab Admin. Verifikasi via `POST /api/admin/verify-pin` (server-side, tidak bocor di frontend).
- **Kelola Admin (super admin bryan.halim007@gmail.com saja)**: tab "Admin" — buat admin baru, ubah kata sandi admin, hapus admin (admin utama tidak bisa dihapus/di-hapus-diri). Super admin ditandai `is_super` (email == ADMIN_EMAIL). Endpoint: `GET/POST /api/admin/admins`, `DELETE /api/admin/admins/{id}`, `PUT /api/admin/admins/{id}/password`, `GET/PUT /api/admin/pins` (semua super-admin only). Catatan: password super admin di-sync dari env saat startup; EXTRA_ADMINS hanya di-seed sekali (perubahan password persisten).
- **Absensi Pegawai**: tab "Absensi" untuk semua admin. Tiap admin kelola pegawai sendiri (owner_id) — tambah/hapus. Data pegawai: Nama, Umur, Jabatan, No HP, Alamat (tanpa foto KTP). Absensi harian per pegawai: Hadir/Izin/Sakit/Alpa (upsert per tanggal, tanggal WIB). Klik nama → modal detail + riwayat kehadiran. Super admin: MELIHAT semua pegawai dari semua admin, dikelompokkan per admin, read-only (403 jika coba ubah milik admin lain). Endpoint: `GET/POST /api/admin/employees`, `GET/DELETE /api/admin/employees/{id}`, `POST/GET /api/admin/attendance`. Koleksi `employees` & `attendance` (hapus pegawai → cascade hapus absensi).
- Diuji: curl backend lengkap (isolasi per-admin, upsert, super read-only 403, cascade) + testing_agent frontend 100% pass (iteration_5).

## Backlog / Next
- P2: Menu hamburger mobile untuk navigasi (Katalog & Find Us).
- P2: Favicon logo SK.
- P2: Halaman "Tentang / Kontak" terpisah.
- P3: APK rilis bertanda-tangan untuk Play Store.
- Catatan: rebuild APK setelah deploy ke domain produksi (REACT_APP_BACKEND_URL tertanam saat build).
