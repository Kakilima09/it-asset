# IT Asset PM Mobile

Aplikasi mobile (Expo / React Native) untuk IT Asset PM. Mencakup autentikasi, dashboard, daftar/detail aset, pemindai barcode kamera, detail pekerjaan maintenance dengan aksi offline, serta daftar/detail/pembuatan insiden. Data disimpan di cache lokal dan perubahan diantrekan untuk disinkronkan otomatis saat kembali online.

## Prasyarat

- Node.js 20+
- Aplikasi web IT Asset PM berjalan dan dapat diakses dari perangkat/emulator
- Akun pengguna yang valid (seed demo: `superadmin@demo.com` / `Admin@123`)

## Setup

```bash
npm install
cp .env.example .env
```

Sesuaikan `EXPO_PUBLIC_API_URL` di `.env`:

- Android emulator: `http://10.0.2.2:3000`
- iOS simulator: `http://localhost:3000`
- Perangkat fisik: `http://<IP-LAN-server>:3000` (pastikan firewall mengizinkan port tersebut)

Jalankan:

```bash
npx expo start
```

Tekan `a` untuk Android, `i` untuk iOS (macOS), atau pindai QR dengan Expo Go. Beberapa modul native (SecureStore) sudah termasuk di Expo Go.

## Perintah

```bash
npm start            # Metro / Expo dev server
npm run android      # buka di emulator/perangkat Android
npm run ios          # buka di simulator iOS (macOS)
npm run web          # jalankan versi web
npm run lint         # ESLint
npm run typecheck    # TypeScript
```

## Struktur

```
src/
  app/                    # rute Expo Router
    (auth)/login.tsx      # layar masuk
    (app)/
      (tabs)/             # dashboard, aset, pekerjaan, scan, lainnya
      assets/[id].tsx     # detail aset
      maintenance/[id].tsx# checklist + aksi maintenance
      incidents/          # daftar, buat, detail insiden
  components/
    ui/                   # komponen UI dasar
    sync-status.tsx       # banner offline/antrean/gagal
  lib/
    api-client.ts         # fetch + access/refresh token + retry 401
    auth-context.tsx      # status sesi, login/logout, restore sesi
    storage.ts            # token di SecureStore, profil di AsyncStorage
    mutation-queue.ts     # antrean mutasi persisten di AsyncStorage
    sync-context.tsx      # flush /sync/push, retry, status sinkronisasi
    network.ts            # NetInfo -> TanStack onlineManager
    persister.ts          # cache query persisten
    config.ts             # EXPO_PUBLIC_API_URL
```

## Mode offline

- Cache query disimpan hingga 7 hari dan dipakai saat server tidak terjangkau.
- Aksi teknisi (mulai/simpan/selesai maintenance, buat/ubah insiden, tindakan perbaikan) masuk antrean lokal dengan id unik.
- Antrean dikirim berurutan ke `/api/v1/sync/push` saat online, saat aplikasi kembali foreground, atau lewat tombol sinkronkan.
- Server memakai idempotency per id mutasi sehingga pengiriman ulang aman.
- Mutasi yang ditolak validasi server ditandai gagal dan dapat dicoba ulang dari banner sinkronisasi.

## Build Android (APK internal)

`eas.json` sudah berisi profil `preview` yang menghasilkan APK:

```bash
npx eas-cli@latest login
npx eas-cli@latest build --profile preview --platform android
```

Untuk produksi gunakan profil `production` (AAB). Ganti `usesCleartextTraffic` menjadi `false` dan gunakan HTTPS sebelum rilis publik.

## Status Tahap

- Tahap 1 (API web `/api/v1`) selesai.
- Tahap 2 (kerangka mobile) selesai: login, sesi, navigasi, dashboard, daftar aset, daftar pekerjaan.
- Tahap 3 (inti teknisi offline) selesai: scanner kamera + input manual, detail aset, detail maintenance (mulai/hasil/selesai/batal), insiden (daftar/buat/detail/tindakan), cache persisten, antrean mutasi + sinkronisasi otomatis.
- Berikutnya: paritas admin (manajemen aset/pengguna/master data), alur PM inspection, dan hardening sinkronisasi.
