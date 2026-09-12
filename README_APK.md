# SK BIKE — Aplikasi Offline & APK Android

Aplikasi ini adalah **PWA (Progressive Web App) offline** — data produk, harga, kode, stok,
dan login admin disimpan lokal di perangkat (localStorage). Tidak butuh server.

Kredensial admin (untuk melihat & mengelola harga):
- Email: bryan.halim007@gmail.com
- Password: velox2026

---

## A. Cara Tercepat: Pasang Langsung dari Browser (PWA)
Di HP/laptop, buka website lalu:
- **Android/Chrome/Edge**: muncul tombol "Pasang App" di navbar, atau menu ⋮ → "Install app / Tambahkan ke Layar Utama".
- **iPhone/Safari**: tombol Share → "Add to Home Screen".

Setelah terpasang, ada ikon aplikasi, buka layar penuh, dan berfungsi offline setelah kunjungan pertama.

---

## B. File Offline (ZIP hasil build)
File `skbike-offline-app.zip` berisi hasil build statis (folder `build/`).

Cara pakai:
1. Ekstrak ZIP.
2. Cara termudah (disarankan) — jalankan server statis lokal agar semua fitur + offline cache (service worker) aktif:
   ```bash
   # butuh Node.js
   npx serve -s build
   # lalu buka http://localhost:3000
   ```
   atau dengan Python:
   ```bash
   cd build && python3 -m http.server 8080
   # buka http://localhost:8080
   ```
3. Alternatif cepat: buka `build/index.html` langsung (double click). Catatan: mode file:// tidak
   mengaktifkan service worker & tidak mendukung reload di halaman /admin (gunakan tautan di dalam
   aplikasi, jangan reload). Untuk pengalaman penuh gunakan langkah 2.

Catatan gambar: gambar produk contoh (seed) diambil dari internet pada pemuatan pertama, lalu
di-cache. Gambar yang di-upload admin disimpan lokal (base64) sehingga tetap tampil offline.

---

## C. Membuat APK Android
Aplikasi ini adalah PWA yang valid (manifest + service worker + ikon), sehingga bisa dibungkus
menjadi APK. Pilih salah satu:

### Opsi 1 — PWABuilder (paling mudah, tanpa install apa pun)
1. Deploy/aktifkan website (URL publik). Contoh URL preview: https://pedal-pro-18.preview.emergentagent.com
2. Buka https://www.pwabuilder.com , masukkan URL tersebut → Start.
3. Pilih platform **Android** → **Generate Package**.
4. Unduh paket (berisi APK/AAB yang sudah ditandatangani untuk uji + petunjuk publish Play Store).
5. Install APK ke HP (aktifkan "Install from unknown sources").

### Opsi 2 — Bubblewrap CLI (Trusted Web Activity)
Butuh Node.js + JDK 17 + Android SDK.
```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://<URL-ANDA>/manifest.json
bubblewrap build
# menghasilkan app-release-signed.apk
```

### Opsi 3 — Capacitor (bungkus build lokal jadi APK)
Butuh Android Studio + JDK.
```bash
# dari folder frontend
yarn add @capacitor/core @capacitor/cli @capacitor/android
npx cap init "SK BIKE" com.skbike.ketapang --web-dir=build
yarn build
npx cap add android
npx cap copy
npx cap open android   # build & Run APK dari Android Studio
```

> Catatan: kompilasi APK memerlukan Android SDK/Android Studio di komputer Anda; langkah build
> native tidak dapat dijalankan penuh di lingkungan cloud ini. Opsi 1 (PWABuilder) adalah cara
> tercepat mendapatkan file .apk.
