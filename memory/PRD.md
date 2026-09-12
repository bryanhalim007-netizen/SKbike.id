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

## Backlog / Next
- P2: Menu hamburger mobile untuk navigasi (Katalog & Find Us).
- P2: Favicon logo SK.
- P2: Halaman "Tentang / Kontak" terpisah.
- P3: APK rilis bertanda-tangan untuk Play Store.
- Catatan: rebuild APK setelah deploy ke domain produksi (REACT_APP_BACKEND_URL tertanam saat build).
