# SK Bike Store — Aplikasi Offline & APK Android

Aplikasi ini adalah **PWA offline** yang telah dibungkus menjadi **APK Android** menggunakan Capacitor.
Semua data (produk, harga, kode, stok, login admin) disimpan lokal di perangkat (localStorage) — **tidak butuh server / internet**.

Kredensial admin (untuk melihat & mengelola harga):
- Email: bryan.halim007@gmail.com
- Password: velox2026

---

## 📱 File APK Siap Pakai
File APK yang bisa langsung dipasang di Android:

- **`/app/SK-Bike-Store.apk`** (± 4.6 MB)
- Package: `com.skbike.store` · Nama: **SK Bike Store**
- Minimal Android: **5.1 (API 22)** ke atas
- Jenis: Debug build (sudah ditandatangani, bisa langsung dipasang)

Untuk mengunduhnya keluar dari editor, gunakan fitur **"Save to GitHub"** pada kolom chat,
lalu ambil file `SK-Bike-Store.apk` dari repositori Anda.

---

## 🔧 Cara Pasang APK di HP Android
1. Salin file `SK-Bike-Store.apk` ke HP (via kabel USB, Google Drive, WhatsApp, dsb).
2. Buka file tersebut lewat aplikasi **Files/Berkas**.
3. Jika muncul peringatan "Sumber tidak dikenal", aktifkan:
   **Setelan → Keamanan → Izinkan dari sumber ini** (atau izinkan aplikasi Files memasang APK).
4. Tekan **Pasang / Install**.
5. Buka aplikasi **SK Bike Store** dari layar utama — berjalan penuh secara offline.

> Catatan: karena ini APK debug (belum lewat Play Store), Android mungkin menampilkan
> peringatan Play Protect. Pilih **"Tetap pasang / Install anyway"**.

---

## 🌐 Alternatif: Pasang Langsung dari Browser (PWA)
Tanpa APK, buka website di HP/laptop lalu:
- **Android/Chrome/Edge**: tombol "Pasang App" di navbar, atau menu ⋮ → "Install app".
- **iPhone/Safari**: tombol Share → "Add to Home Screen".

Setelah terpasang, ikon muncul di layar utama dan berfungsi offline setelah kunjungan pertama.

---

## 🛠️ Cara Build Ulang APK (untuk developer)
Proyek Android ada di `/app/mobile` (Capacitor). Setelah mengubah web app:

```bash
# 1. Build web app terbaru
cd /app/frontend && yarn build

# 2. Salin ke Capacitor & sinkron
cd /app/mobile && rm -rf www && cp -r /app/frontend/build www
export ANDROID_HOME=/app/android-sdk ANDROID_SDK_ROOT=/app/android-sdk
npx cap sync android

# 3. Build APK debug
cd /app/mobile/android
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-arm64
./gradlew assembleDebug --no-daemon

# APK hasil:
# /app/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

> Host ini arm64, sedangkan aapt2 Android hanya tersedia untuk x86_64. Karena itu build
> memakai `qemu-x86_64-static` melalui override `android.aapt2FromMavenOverride` di
> `android/gradle.properties` (menunjuk wrapper `/app/aapt2-wrap/aapt2`). Jangan hapus baris itu.

### Membuat APK rilis (untuk Play Store)
Untuk versi rilis yang ditandatangani sendiri, buat keystore lalu jalankan `./gradlew assembleRelease`
dan tandatangani dengan `apksigner`. Debug APK di atas sudah cukup untuk penggunaan langsung/berbagi.
