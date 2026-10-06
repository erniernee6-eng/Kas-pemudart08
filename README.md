# Kas Pembukuan Pemuda Pemudi RT 08 — Versi Lengkap

Aplikasi kas berbasis React/Vite + Firebase Authentication + Firestore.

## Fitur
- Login dan registrasi
- Role admin/member
- Dashboard saldo
- Pemasukan/pengeluaran
- Pencarian transaksi
- Export CSV
- Export PDF
- Cetak laporan
- Data anggota
- Iuran bulanan per anggota
- Rekap laporan berdasarkan bulan
- Pengaturan nama organisasi/alamat
- Firestore realtime
- Firebase Hosting
- Responsive untuk HP

## Instalasi

```bash
npm install
cp .env.example .env
npm run dev
```

Isi `.env` dengan konfigurasi Web App dari Firebase Console.

## Firebase
Aktifkan:
1. Authentication > Email/Password
2. Firestore Database
3. Firebase Hosting

Deploy rules dan hosting:

```bash
npm install -g firebase-tools
firebase login
firebase use --add
npm run build
firebase deploy
```

## Struktur Firestore

### users/{uid}
```json
{
  "name": "Nama",
  "email": "email@example.com",
  "role": "member",
  "createdAt": "serverTimestamp"
}
```

Role:
- member
- admin

Set akun pertama menjadi admin melalui Firestore:
`users/{UID}` -> `role: "admin"`

### settings/app
```json
{
  "name": "Pemuda Pemudi RT 08",
  "address": "Alamat RT 08"
}
```

### members/{memberId}
```json
{
  "name": "Budi",
  "phone": "08123456789",
  "status": "aktif",
  "address": "Alamat"
}
```

### transactions/{transactionId}
```json
{
  "type": "income",
  "amount": 50000,
  "category": "Iuran",
  "description": "Iuran Oktober",
  "date": "2026-10-06",
  "createdBy": "UID",
  "createdAt": "serverTimestamp"
}
```

### dues/{memberId_month}
Contoh ID:
`abc123_2026-10`

```json
{
  "memberId": "abc123",
  "month": "2026-10",
  "amount": 5000,
  "status": "paid",
  "paidAt": "serverTimestamp",
  "paidBy": "UID"
}
```

## GitHub

```bash
git init
git add .
git commit -m "Initial commit - Kas RT 08 lengkap"
git branch -M main
git remote add origin https://github.com/USERNAME/kas-rt08-pemuda.git
git push -u origin main
```

Jangan commit `.env`.

## Pengembangan lanjutan yang direkomendasikan
Untuk penggunaan resmi organisasi, tambahkan:
- audit log
- nomor bukti transaksi otomatis
- upload foto nota/bukti
- approval transaksi oleh admin
- backup Firestore
- Cloud Functions untuk validasi saldo
- laporan tahunan
- multi-RT/multi-organisasi
- notifikasi WhatsApp/email
