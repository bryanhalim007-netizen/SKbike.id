# SK BIKE — Katalog Sepeda & Sepeda Listrik (Offline PWA)

## Problem Statement (asli)
Website jual sepeda biasa & sepeda listrik: katalog + kategori (Sepeda Gunung, BMX, Sepeda Anak, Sepeda Lipat, Sepeda Listrik), tombol pop-out kontak WhatsApp admin, dan Admin Panel untuk mengelola daftar barang.

## Arsitektur
- **Mode: OFFLINE-first PWA (100% tanpa server).** Semua data & sesi login di localStorage browser via `frontend/src/lib/store.js`.
- Frontend: React (CRA + craco), Tailwind, shadcn/ui, lucide-react, sonner.
- PWA: `public/manifest.json` + `public/sw.js` (cache app shell + gambar), ikon 192/512/apple-touch.
- Backend FastAPI+Mongo masih ada di repo tapi TIDAK dipakai aplikasi (legacy).

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

## Backlog / Next
- P2: Menu hamburger mobile untuk navigasi.
- P2: Halaman "Tentang / Kontak" terpisah.
- P2: Ikon aplikasi PWA/APK kustom (logo SK Bike).
- P3: APK rilis bertanda-tangan untuk Play Store.
