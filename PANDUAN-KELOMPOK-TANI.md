# Panduan: Menyambungkan Mode Kelompok Tani ke Google Sheets

Website memakai **dua Google Sheets terpisah**:

| Mode | Spreadsheet | Isi |
|---|---|---|
| UMKM | spreadsheet lama | data toko lama — **tidak diubah** |
| Kelompok Tani | spreadsheet baru | data kelompok tani |

Selama spreadsheet kelompok tani belum disambungkan, mode Kelompok Tani
menampilkan **data contoh** (pupuk, benih, pestisida) dengan banner
"MODE PERAGAAN KELOMPOK TANI". Data UMKM lama tidak pernah tampil di mode ini.

Langkah di bawah membuat spreadsheet baru **tanpa menyentuh spreadsheet lama**.

---

## Langkah 1 — Buat salinan spreadsheet

1. Buka spreadsheet Smart Inventory yang lama di Google Drive.
2. Klik **File → Buat salinan** (File → Make a copy).
3. Beri nama, misalnya `Smart Inventory - Kelompok Tani`.
4. Klik **Buat salinan**.

Spreadsheet lama tetap utuh. Semua langkah berikutnya dikerjakan di **salinan**.

## Langkah 2 — Kosongkan data toko lama di salinan

Di spreadsheet **salinan** (bukan yang lama):

1. Sheet **Barang**: hapus semua baris data, **sisakan baris judul kolom**.
2. Sheet **Transaksi**: hapus semua baris data, sisakan baris judul.
3. Sheet **Notifikasi** dan **Log** (jika ada): hapus baris data, sisakan judul.
4. Sheet **Toko**: ubah baris `TOKO-001` menjadi data kelompok, misalnya
   nama `Kelompok Tani Bulo Pao Dua`, kecamatan `Ma'rang`, jenis `Padi`.
   Hapus baris toko lainnya.
5. Sheet **Pengguna**: biarkan akun demo, atau ganti nama/email sesuai
   pengurus kelompok. Pastikan `tokoId`-nya `TOKO-001`.

Kalau nama sheet di spreadsheet Bapak berbeda, ikuti nama yang ada.
Yang penting: **baris judul kolom jangan dihapus atau diubah**.

## Langkah 3 — Deploy Apps Script untuk salinan

**Jika di salinan ada menu Ekstensi → Apps Script yang berisi kode Smart Inventory**
(Apps Script menempel di spreadsheet, ikut tersalin otomatis):

1. Di spreadsheet salinan, klik **Ekstensi → Apps Script**.
2. Klik **Terapkan (Deploy) → Deployment baru (New deployment)**.
3. Jenis: **Aplikasi web (Web app)**.
4. *Execute as*: **Saya (Me)**. *Who has access*: **Siapa saja (Anyone)**.
5. Klik **Deploy**, izinkan akses, lalu **salin URL Web App** (berakhiran `/exec`).

**Jika Apps Script-nya file terpisah di Drive** (tidak ikut tersalin):

1. Buka file Apps Script lama di Drive → **File → Buat salinan**.
2. Di salinan Apps Script, cari ID spreadsheet lama (teks panjang di dalam
   `SpreadsheetApp.openById("...")`), ganti dengan ID spreadsheet salinan.
   ID ada di alamat spreadsheet: `docs.google.com/spreadsheets/d/`**`ID_INI`**`/edit`.
3. Lanjutkan dari nomor 2 di bagian atas (Deploy → Deployment baru).

## Langkah 4 — Pasang URL di website

1. Di GitHub, buka file `js/api.js` → klik ikon pensil (Edit).
2. Cari baris:
   ```js
   urlPoktan: "ISI_URL_APPS_SCRIPT_KELOMPOK_TANI",
   ```
3. Ganti isinya dengan URL Web App dari Langkah 3, misalnya:
   ```js
   urlPoktan: "https://script.google.com/macros/s/AKfy..../exec",
   ```
4. Klik **Commit changes**. Tunggu 1–10 menit, lalu buka website dengan Ctrl+Shift+R.

**Jangan ubah baris `urlUmkm`** — itu sambungan ke data UMKM lama.

## Langkah 5 — Isi data barang kelompok

1. Buka website → pilih **Kelompok Tani** → masuk sebagai ketua kelompok.
2. Banner merah/peragaan seharusnya sudah **tidak muncul**.
3. Buka **Setup Stok Awal** → pilih barang (pupuk, benih, pestisida) →
   isi stok, **d** (rata-rata keluar per hari), dan **L** (waktu tunggu hari).
4. Klik **Simpan ke Sistem**.

Jika muncul **"Gagal Menyimpan"**, berarti Apps Script belum punya action
`saveDraftStok`. Isi barang langsung di sheet **Barang** spreadsheet salinan
(kolom ROP = d × L), atau kirim kode Apps Script untuk ditambahkan action-nya.

## Pemeriksaan akhir

- Mode **UMKM**: data toko lama masih tampil seperti sebelumnya.
- Mode **Kelompok Tani**: hanya data kelompok yang tampil.
- Menu **Laporan** di mode Kelompok Tani: tulisan **Sumber: Google Sheets**.
  Angka di sana baru boleh dipakai untuk laporan setelah tulisan ini muncul.

## Catatan

- Akun di mode UMKM dan mode Kelompok Tani **terpisah**. Pindah mode akan
  mengeluarkan pengguna dari akunnya.
- Pendaftaran kelompok baru (tab "Daftar Kelompok") masuk ke spreadsheet
  kelompok tani. Admin menyetujuinya dengan masuk di mode Kelompok Tani.
