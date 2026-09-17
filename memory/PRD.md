# SK Bike Store — PRD

## Problem Statement
Import project SKbike.id dari GitHub (branch main1), setup & install dependencies. Kemudian percantik tampilan toko (customer-facing) agar lebih menarik.

## Tech Stack
- Backend: FastAPI + MongoDB (motor), JWT auth, Emergent Object Storage untuk gambar produk
- Frontend: React 19 + CRACO + Tailwind + framer-motion, tema sporty dark/merah (#FF2E2E)
- Mobile: Capacitor (Android) wrapper

## Personas
- Pengunjung/pembeli sepeda di Ketapang (browse katalog, chat WA, keranjang)
- Admin toko (kelola produk, stok, penjualan, reseller via Admin Panel)

## Implemented
- 2026-09-17: Import repo, install deps (backend pip + frontend yarn), lengkapi .env (JWT_SECRET, ADMIN_EMAIL/PASSWORD, WHATSAPP_NUMBER, EMERGENT_LLM_KEY). App berjalan.
- 2026-09-17: Percantik tampilan toko:
  - Home: badge rating hero + tombol "Chat Admin", section "Belanja per Kategori" (6 tile gambar), banner CTA WhatsApp
  - Catalog: dukung deep-link `?kategori=<nama>` (tile kategori -> katalog terfilter) — verified BMX
  - Footer: multi-kolom (brand, navigasi, kategori, kontak & jam buka, sosial WA/IG)
- 2026-09-17: Admin panel dirapikan:
  - Sidebar dikelompokkan: Utama (Dashboard/Produk/Kasir), Operasional (Service/Pembelian/Supplier), Laporan & Data (Riwayat/Absensi/Log), Sistem (Pengaturan)
  - Tabel Produk dipercantik (header kontras, status pill berwarna), tombol aksi "Stok" redundan dihapus (badge stok tetap membuka editor)
  - Backup Export/Import (Setting) kini mencakup SEMUA data: products, sales, services, purchase_orders, suppliers, employees, attendance, price_history, pos_transactions, activity_logs
  - Tested by testing_agent: backend & frontend 100% pass
- 2026-09-17: Fitur lanjutan:
  - Tabel Produk admin: sorting kolom Harga & Stok (asc/desc), plus toggle filter "Stok Menipis" (stok ≤ ambang, default 3) dengan badge jumlah
  - Halaman Detail Produk publik penuh di `/produk/:id` (galeri warna + thumbnail, pilih warna/ukuran, spesifikasi lengkap, CTA Keranjang & WhatsApp). Bebas-harga sesuai desain (harga via WA). Endpoint publik baru GET /api/products/{id}
  - ProductCard kini menuju halaman detail (modal detail lama dihapus); modal pemilih warna/ukuran untuk aksi cepat tetap ada
  - Tested by testing_agent: backend & frontend 100% pass
- 2026-09-17: Penyempurnaan halaman detail:
  - Tambah 2 produk contoh multi-warna berfoto studio (SK Velocity Trail 29 — Merah/Hitam/Teal; SK Urban E-Move — Putih/Oranye/Navy) via scripts/seed_rich.py → galeri warna tampil penuh
  - Section "Sepeda Serupa" (produk sekategori) di bawah halaman detail
  - Tombol Bagikan produk: WhatsApp share + Salin Link (clipboard)
  - Verified via screenshot + API

- 2026-06 (re-import): Clone `main1` ke Emergent /app container (mobile/APK dikecualikan). Backend pip deps terinstall (requirements.txt bersih, tanpa litellm), frontend `yarn install` OK. `.env` backend dilengkapi: JWT_SECRET acak, ADMIN_EMAIL/PASSWORD, WHATSAPP_NUMBER, EMERGENT_LLM_KEY, FRONTEND_URL. Verifikasi lolos (testing_agent): /api/config 200, 10 produk, login admin, dashboard admin, storefront.

## Backlog (P1/P2)
- Section testimoni/galeri di beranda
- Halaman detail produk penuh (saat ini modal)
- SEO meta & Open Graph

## Credentials
Lihat /app/memory/test_credentials.md (admin@skbike.id / Admin@12345)
