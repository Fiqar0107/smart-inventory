# Panduan: Menyambungkan Mode Kelompok Tani ke Google Sheets

Mode **Kelompok Tani** memakai Google Sheets **baru** dan kode Apps Script
**baru** (`apps-script/Code.gs`). Spreadsheet UMKM yang lama **tidak disentuh
sama sekali** dan tetap dipakai oleh mode UMKM.

Waktu yang dibutuhkan: sekitar 15 menit. Tidak perlu menulis kode.

---

## Langkah 1 — Buat spreadsheet baru

1. Buka https://sheets.new (atau Google Drive → Baru → Google Spreadsheet).
2. Beri nama, misalnya `Smart Inventory - Kelompok Tani`.

## Langkah 2 — Tempel kode

1. Di spreadsheet baru, klik **Ekstensi → Apps Script**.
2. Hapus semua isi yang ada di editor (biasanya `function myFunction() {}`).
3. Buka file [`apps-script/Code.gs`](apps-script/Code.gs) di GitHub → klik
   tombol **Copy raw file** (ikon salin) → tempel ke editor Apps Script.
4. Klik ikon **Simpan** (💾). Beri nama proyek, misalnya `Smart Inventory Poktan`.
5. Kembali ke tab spreadsheet, lalu **muat ulang halaman** (F5).
   Setelah beberapa detik, muncul menu baru **Smart Inventory** di sebelah menu Bantuan.

## Langkah 3 — Siapkan spreadsheet lewat formulir

1. Klik **Smart Inventory → 1. Siapkan Spreadsheet**.
2. Saat pertama kali, Google meminta izin:
   **Lanjutkan → pilih akun Google Bapak → Lanjutan (Advanced) →
   Buka Smart Inventory Poktan (tidak aman) → Izinkan**.
   Peringatan "tidak aman" muncul karena kode ini milik Bapak sendiri dan belum
   diverifikasi Google; ini normal untuk Apps Script pribadi.
3. Klik lagi **Smart Inventory → 1. Siapkan Spreadsheet**, lalu isi formulir:
   - Data kelompok (sudah terisi: Kelompok Tani Bulo Pao Dua, Padanglampe, Ma'rang).
   - **Email dan password Ketua Kelompok** — dipakai ketua untuk masuk website.
   - **Email dan password Admin Pengabdian** — dipakai Bapak/tim.
   - Petugas pencatat (boleh dikosongkan, bisa ditambah nanti).
4. Klik **Siapkan Spreadsheet**. Tunggu sampai muncul ✅, lalu **Tutup**.

Sheet Pengguna, Toko, Barang, Transaksi, Pendaftaran, Log, dan Pengaturan
dibuat otomatis. Password disimpan dalam bentuk acak (hash) — **catat password
di tempat aman**, karena tidak bisa dibaca kembali dari spreadsheet.

## Langkah 4 — Terbitkan sebagai Web App

1. Di editor Apps Script, klik **Terapkan (Deploy) → Deployment baru (New deployment)**.
2. Klik ikon roda gigi di samping "Pilih jenis" → **Aplikasi web (Web app)**.
3. Isi:
   - *Deskripsi*: `Smart Inventory Kelompok Tani`
   - *Jalankan sebagai (Execute as)*: **Saya (Me)**
   - *Yang memiliki akses (Who has access)*: **Siapa saja (Anyone)**
4. Klik **Terapkan (Deploy)** → izinkan akses jika diminta.
5. **Salin URL Aplikasi web** (berakhiran `/exec`).

Cek cepat: tempel URL itu di browser dan tambahkan `?action=getToko` di
belakangnya. Jika muncul teks berisi `"success":true` dan nama kelompok,
Web App sudah berjalan.

## Langkah 5 — Pasang URL di website

1. Di GitHub, buka file `js/api.js` → klik ikon pensil (**Edit**).
2. Cari baris:
   ```js
   urlPoktan: "ISI_URL_APPS_SCRIPT_KELOMPOK_TANI",
   ```
3. Ganti isinya dengan URL dari Langkah 4:
   ```js
   urlPoktan: "https://script.google.com/macros/s/AKfy..../exec",
   ```
4. Klik **Commit changes** → **Commit changes**.
5. Tunggu 1–10 menit, buka website, tekan **Ctrl+Shift+R**.

**Jangan ubah baris `urlUmkm`** — itu sambungan ke data UMKM lama.

## Langkah 6 — Isi barang kelompok

1. Buka website → pilih **Kelompok Tani** → masuk dengan email/password Ketua.
2. Banner "MODE PERAGAAN" seharusnya **tidak muncul** lagi, dan kartu akun demo
   di halaman masuk hilang.
3. Buka **Setup Stok Awal** → pilih barang (pupuk, benih, pestisida) →
   isi stok sekarang, **d** (rata-rata keluar per hari), dan **L** (waktu tunggu, hari).
4. Klik **Simpan ke Sistem** → harus muncul *"Stok Awal Berhasil Disimpan!"*.
5. Mulai catat barang masuk dan keluar dari dashboard atau dari akun petugas pencatat.

## Pemeriksaan akhir

- Mode **UMKM**: data toko lama masih tampil seperti sebelumnya.
- Mode **Kelompok Tani**: hanya data kelompok yang tampil.
- Menu **Laporan** (mode Kelompok Tani): tertulis **Sumber: Google Sheets**.
  Angka di menu ini baru boleh dipakai untuk laporan setelah tulisan ini muncul.

---

## Menu "Smart Inventory" di spreadsheet

| Menu | Kegunaan |
|---|---|
| 1. Siapkan Spreadsheet | Membuat sheet dan akun pertama. Aman dijalankan lagi untuk menambah kelompok lain — data lama tidak dihapus. |
| Tambah Pengguna | Menambah petugas pencatat, ketua, admin, atau pemantau. |
| Ganti Password Pengguna | Mengganti password jika pengguna lupa. |
| Cek Kesiapan | Menampilkan jumlah kelompok, pengguna, barang, transaksi, dan URL Web App. |

## Jika mengubah kode Apps Script nanti

Setelah mengubah `Code.gs`, klik **Terapkan → Kelola deployment → ✏️ Edit →
Versi: Versi baru → Terapkan**. Dengan cara ini URL tetap sama dan website
tidak perlu diubah. Jangan membuat "Deployment baru" lagi, karena URL-nya akan berbeda.

## Masalah yang mungkin muncul

| Gejala | Penyebab & solusi |
|---|---|
| Menu Smart Inventory tidak muncul | Muat ulang spreadsheet (F5) dan tunggu ±10 detik. |
| Banner "MODE PERAGAAN KELOMPOK TANI" masih muncul | `urlPoktan` belum diganti, atau website masih versi lama → Ctrl+Shift+R. |
| Banner "Google Sheets tidak dapat dihubungi" | Akses Web App bukan "Siapa saja", atau URL salah salin (harus berakhiran `/exec`). |
| "Spreadsheet belum disiapkan" | Jalankan Smart Inventory → 1. Siapkan Spreadsheet. |
| Ketua lupa password | Smart Inventory → Ganti Password Pengguna. |

## Catatan keamanan

Web App ini terbuka untuk siapa saja yang mengetahui URL-nya (desain yang sama
dengan sistem UMKM lama). Password tersimpan sebagai hash, tetapi pemeriksaan
hak akses dilakukan di website, bukan di server. Untuk skala pengabdian ini
masih wajar; jangan sebarkan URL `/exec` di luar tim dan mitra.
