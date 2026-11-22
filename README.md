# Smart Inventory Desa — Pangkep

Sistem pencatatan persediaan berbasis website untuk UMKM dan kelompok tani di
Kabupaten Pangkajene Kepulauan. Data tersimpan di Google Sheets, dan website
terhubung ke sana lewat Google Apps Script.

Website: https://fiqar0107.github.io/smart-inventory/

## Dua mode tampilan

Di halaman masuk, pengguna memilih **UMKM** atau **Kelompok Tani**. Pilihan ini
disimpan di perangkat dan bisa diganti kapan saja dari menu Profil.

| Hal | Mode UMKM | Mode Kelompok Tani |
|---|---|---|
| Pengelola | Pemilik Toko | Ketua Kelompok |
| Pencatat | Karyawan | Petugas Pencatat |
| Unit usaha | Toko | Kelompok |
| Contoh barang | sembako, minuman, sabun | pupuk, benih, pestisida |

**Data kedua mode disimpan terpisah.** Mode UMKM memakai Google Sheets lama
(`urlUmkm` di `js/api.js`, data lama tidak diubah). Mode Kelompok Tani memakai
Google Sheets sendiri (`urlPoktan`). Selama `urlPoktan` belum diisi, mode
Kelompok Tani menampilkan data contoh. Cara menyambungkannya:
[PANDUAN-KELOMPOK-TANI.md](PANDUAN-KELOMPOK-TANI.md).

Selain sumber data, yang berubah hanya **teks di layar**. Nilai role di Google Sheets (`pemilik`,
`karyawan`, `admin`, `dinas`) dan ID (`TOKO-001`, dst.) tetap sama, jadi
Apps Script tidak perlu di-deploy ulang. Penggantian istilah ada di `js/terms.js`.

## Peran pengguna

| Role (di Sheets) | Tampil sebagai | Halaman |
|---|---|---|
| `pemilik` | Pemilik Toko / Ketua Kelompok | `dashboard.html` |
| `karyawan` | Karyawan / Petugas Pencatat | `karyawan.html` |
| `admin` | Admin Pengabdian | `admin.html` |
| `dinas` | Pemantau | `dinas.html` |

## Rumus

Sistem hanya memakai titik pesan ulang:

```
ROP = d × L
d = rata-rata barang keluar per hari
L = waktu tunggu pengiriman (hari)
```

EOQ tidak lagi ditampilkan.

## Akun demo

Semua password `demo123`: `pemilik@demo.com`, `karyawan@demo.com`,
`admin@demo.com`, `dinas@demo.com`.

## Data contoh

Jika Google Sheets tidak dapat dihubungi, website menampilkan **data contoh**
dan memasang banner merah di bawah layar. Data contoh bukan data mitra.
Semua angka di website (statistik, grafik, rekap) dihitung dari data, tidak
ada angka yang ditulis tetap di kode.

## Menu Laporan (dashboard pengelola)

Menu **Laporan** menghitung rekap penggunaan sistem dari data yang tercatat:

1. Periode pemantauan
2. Jumlah jenis barang yang tercatat
3. Jumlah transaksi masuk dan keluar
4. Jumlah hari dengan pencatatan
5. Jumlah pengguna yang aktif mencatat
6. Jumlah peringatan reorder point yang muncul (dihitung dari riwayat stok)
7. Barang di bawah ROP saat ini

Rekap bisa diunduh sebagai CSV atau dicetak ke PDF.

## Catatan untuk Apps Script

Website sekarang mengirim beberapa kolom tambahan. Apps Script lama tetap
berjalan, tetapi agar rekap lengkap, sebaiknya kolom ini ikut disimpan:

- `simpanTransaksi` → kolom `oleh` (nama pencatat). Tanpa kolom ini,
  indikator "pengguna yang aktif mencatat" tampil "tidak tersedia".
- `saveDraftStok` → kolom `d`, `lt`, `rop` per barang. Halaman Setup Stok
  Awal sekarang benar-benar mengirim data lewat action ini. Jika action ini
  belum ada di Apps Script, halaman akan menampilkan pesan gagal, bukan
  pura-pura berhasil.
- `getBarang` → jika mengirim kolom `lt` (waktu tunggu), menu ROP akan
  menampilkan L per barang.
- `saveEoqParams` → nama action lama dipertahankan; sekarang hanya
  mengirim `leadTime` dan `periode`.

## Struktur file

```
index.html        masuk, daftar, pilih mode
dashboard.html    pengelola: dashboard, barang, transaksi, ROP, laporan, peringatan, profil
karyawan.html     pencatat (tampilan HP)
admin.html        admin pengabdian
dinas.html        pemantau (baca saja)
setup-stok.html   input stok awal + d, L, ROP
css/style.css
js/terms.js       mode & istilah (dimuat paling awal)
js/auth.js        sesi & label peran
js/api.js         koneksi Apps Script, data contoh, rumus ROP, rekap
```
