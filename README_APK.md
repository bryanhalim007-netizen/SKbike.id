# SK Bike Store — APK Android (Download dari Admin Panel)

Aplikasi Android SK Bike Store dibungkus dengan **Capacitor** dari web app **online**.
Admin dapat mengunduh file APK langsung dari **Admin Panel** (tombol "Download APK").

> Catatan: Aplikasi ini terhubung ke server online (produk & data dari backend), jadi
> membutuhkan koneksi internet untuk menampilkan katalog & login admin.

## Cara Admin Mengunduh
1. Login ke `/admin/login` (Email: bryan.halim007@gmail.com).
2. Di dashboard, klik tombol **"Download APK Android"** (kartu merah di atas statistik) atau **"Download APK"** di header.
3. File `SK-Bike-Store.apk` (± 5.8 MB) akan terunduh.

## Cara Pasang di HP Android
1. Pindahkan APK ke HP (USB / WhatsApp / Drive).
2. Buka file → jika muncul "Sumber tidak dikenal", izinkan pemasangan.
3. Tekan **Pasang / Install**, lalu buka aplikasi **SK Bike Store**.

## Detail Teknis
- Endpoint download (admin-only, cookie auth): `GET /api/admin/app`
- Info APK: `GET /api/admin/app-info`
- File tersimpan di: `/app/backend/static/SK-Bike-Store.apk`
- Package: `com.skbike.store` · minSdk 22 (Android 5.1+)

## Build Ulang APK (developer)
Jalankan setiap kali web app berubah agar APK ikut ter-update:

```bash
cd /app/frontend && yarn build
cd /app/mobile && rm -rf www && cp -r /app/frontend/build www
export ANDROID_HOME=/app/android-sdk ANDROID_SDK_ROOT=/app/android-sdk JAVA_HOME=/usr/lib/jvm/java-17-openjdk-arm64
npx cap sync android
cd android && ./gradlew assembleDebug --no-daemon
cp app/build/outputs/apk/debug/app-debug.apk /app/backend/static/SK-Bike-Store.apk
```

> Host arm64: aapt2 x86_64 dijalankan via `qemu-x86_64-static` melalui
> `android.aapt2FromMavenOverride=/app/aapt2-wrap/aapt2` di `android/gradle.properties`. Jangan hapus.

> PENTING: URL backend (REACT_APP_BACKEND_URL) tertanam di build saat kompilasi. Setelah
> deploy ke domain produksi, rebuild APK agar aplikasi menunjuk ke URL produksi.
