/**
 * ════════════════════════════════════════════════════════════════
 *  SMART INVENTORY — BACKEND KELOMPOK TANI (Google Apps Script)
 *  Satu file. Tempel seluruh isi file ini ke Ekstensi → Apps Script
 *  pada SPREADSHEET BARU yang masih kosong.
 *
 *  Cara pakai singkat (lengkapnya di PANDUAN-KELOMPOK-TANI.md):
 *   1. Tempel kode ini, simpan, lalu muat ulang spreadsheet.
 *   2. Menu "Smart Inventory" → "1. Siapkan Spreadsheet" → isi formulir.
 *   3. Terapkan → Deployment baru → Aplikasi web
 *      (Jalankan sebagai: Saya · Akses: Siapa saja) → salin URL /exec.
 *   4. Tempel URL itu ke baris urlPoktan di js/api.js website.
 *
 *  Rumus yang dipakai: ROP = d × L
 *    d = rata-rata barang keluar per hari
 *    L = waktu tunggu pengiriman (hari)
 *
 *  Kode ini TIDAK menyentuh spreadsheet UMKM yang lama.
 * ════════════════════════════════════════════════════════════════
 */

/* ── KONFIGURASI ─────────────────────────────────────────────── */
var TZ = "Asia/Makassar"; // WITA

var SHEETS = {
  Pengguna:    ["id", "nama", "email", "salt", "hash", "role", "tokoId", "status", "dibuat"],
  Toko:        ["id", "nama", "pemilik", "desa", "kecamatan", "noHp", "jenis", "status", "dibuat"],
  Barang:      ["id", "tokoId", "nama", "sku", "kategori", "satuan", "harga", "stok", "d", "lt", "rop", "diperbarui"],
  Transaksi:   ["id", "tokoId", "barangId", "jenis", "jumlah", "tanggal", "keterangan", "oleh", "dicatatPada"],
  Pendaftaran: ["id", "nama", "pemilik", "noHp", "kecamatan", "jenis", "email", "salt", "hash", "tgl", "status", "catatan"],
  Log:         ["waktu", "tipe", "pesan"],
  Pengaturan:  ["kunci", "nilai"],
};

// Kolom yang disimpan sebagai teks agar Google Sheets tidak mengubahnya jadi tanggal/angka
var KOLOM_TEKS = {
  Pengguna: ["id", "email", "salt", "hash", "tokoId", "dibuat"],
  Toko: ["id", "noHp", "dibuat"],
  Barang: ["id", "tokoId", "sku", "diperbarui"],
  Transaksi: ["id", "tokoId", "barangId", "tanggal", "dicatatPada"],
  Pendaftaran: ["id", "noHp", "email", "salt", "hash", "tgl"],
  Log: ["waktu"],
};

var ROLES = ["pemilik", "karyawan", "admin", "dinas"];

/* ════════════════════════════════════════════════════════════════
 *  PINTU MASUK WEB APP
 * ════════════════════════════════════════════════════════════════ */
function doGet(e) {
  var p = (e && e.parameter) || {};
  var payload = {};
  try { payload = p.payload ? JSON.parse(p.payload) : {}; } catch (err) { return kirim({ success: false, msg: "Payload bukan JSON yang valid." }); }
  return kirim(jalankan(p.action, payload));
}

function doPost(e) {
  var body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || "{}"); } catch (err) { return kirim({ success: false, msg: "Body bukan JSON yang valid." }); }
  var action = body.action;
  delete body.action;
  return kirim(jalankan(action, body));
}

function kirim(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function jalankan(action, p) {
  if (!siap()) return { success: false, msg: "Spreadsheet belum disiapkan. Buka menu Smart Inventory → 1. Siapkan Spreadsheet." };
  var fn = ACTIONS[action];
  if (!fn) return { success: false, msg: "Action '" + action + "' tidak dikenal." };
  try {
    return fn(p || {});
  } catch (err) {
    catatLog("error", action + ": " + err.message);
    return { success: false, msg: "Terjadi kesalahan: " + err.message };
  }
}

/* ════════════════════════════════════════════════════════════════
 *  ACTION (nama & bentuk jawaban sesuai js/api.js di website)
 * ════════════════════════════════════════════════════════════════ */
var ACTIONS = {

  login: function (p) {
    var email = String(p.email || "").trim().toLowerCase();
    var u = baca("Pengguna").filter(function (x) { return String(x.email).toLowerCase() === email; })[0];
    if (!u || u.status === "nonaktif" || !cocokPassword(p.password, u.salt, u.hash)) {
      return { success: false, msg: "Email atau password salah." };
    }
    catatLog("info", "Login: " + email);
    return { success: true, role: u.role, nama: u.nama, tokoId: u.tokoId || "", userId: u.id };
  },

  registerToko: function (p) {
    var wajib = ["namaToko", "namaPemilik", "noHp", "kecamatan", "jenis", "email", "password"];
    for (var i = 0; i < wajib.length; i++) if (!String(p[wajib[i]] || "").trim()) return { success: false, msg: "Kolom " + wajib[i] + " wajib diisi." };
    if (String(p.password).length < 6) return { success: false, msg: "Password minimal 6 karakter." };
    var email = String(p.email).trim().toLowerCase();
    if (emailDipakai(email)) return { success: false, msg: "Email sudah terdaftar." };
    var s = buatSalt();
    tambah("Pendaftaran", {
      id: idBerikut("Pendaftaran", "DFT-"), nama: p.namaToko, pemilik: p.namaPemilik, noHp: p.noHp,
      kecamatan: p.kecamatan, jenis: p.jenis, email: email, salt: s, hash: hashPassword(p.password, s),
      tgl: hariIni(), status: "pending", catatan: "",
    });
    catatLog("info", "Pendaftaran baru: " + p.namaToko);
    return { success: true, msg: "Pendaftaran diterima. Tunggu persetujuan admin." };
  },

  getToko: function (p) {
    var list = baca("Toko").map(bentukToko);
    if (p.tokoId) list = list.filter(function (t) { return t.id === p.tokoId; });
    return { success: true, data: list };
  },

  getBarang: function (p) {
    var list = baca("Barang").map(bentukBarang);
    if (p.tokoId) list = list.filter(function (b) { return b.tokoId === p.tokoId; });
    return { success: true, data: list };
  },

  getTransaksi: function (p) {
    var list = baca("Transaksi").map(bentukTransaksi);
    if (p.tokoId) list = list.filter(function (t) { return t.tokoId === p.tokoId; });
    if (p.barangId) list = list.filter(function (t) { return t.barangId === p.barangId; });
    list.sort(function (a, b) {
      if (a.tanggal !== b.tanggal) return a.tanggal < b.tanggal ? 1 : -1;
      return a.dicatatPada < b.dicatatPada ? 1 : -1;
    });
    if (p.limit) list = list.slice(0, Number(p.limit));
    return { success: true, data: list };
  },

  simpanTransaksi: function (p) {
    var jenis = String(p.jenis || "");
    var jumlah = Number(p.jumlah);
    if (jenis !== "masuk" && jenis !== "keluar") return { success: false, msg: "Jenis harus masuk atau keluar." };
    if (!(jumlah > 0)) return { success: false, msg: "Jumlah harus lebih dari 0." };

    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      var sh = lembar("Barang");
      var rows = baca("Barang");
      var idx = -1;
      for (var i = 0; i < rows.length; i++) if (rows[i].id === p.barangId && rows[i].tokoId === p.tokoId) { idx = i; break; }
      if (idx < 0) return { success: false, msg: "Barang tidak ditemukan." };

      var stokLama = Number(rows[idx].stok) || 0;
      var stokBaru = jenis === "masuk" ? stokLama + jumlah : Math.max(0, stokLama - jumlah);
      tulisSel(sh, idx, "Barang", "stok", stokBaru);
      tulisSel(sh, idx, "Barang", "diperbarui", waktuSekarang());

      var id = idBerikut("Transaksi", "TX-");
      tambah("Transaksi", {
        id: id, tokoId: p.tokoId, barangId: p.barangId, jenis: jenis, jumlah: jumlah,
        tanggal: hariIni(), keterangan: p.keterangan || "", oleh: p.oleh || "", dicatatPada: waktuSekarang(),
      });
      var rop = Number(rows[idx].rop) || 0;
      if (jenis === "keluar" && rop > 0 && stokLama > rop && stokBaru <= rop) {
        catatLog("peringatan", "Stok " + rows[idx].nama + " turun ke " + stokBaru + " (ROP " + rop + ")");
      }
      return { success: true, msg: "Transaksi tersimpan.", txId: id, stok: stokBaru };
    } finally {
      lock.releaseLock();
    }
  },

  getDashboard: function (p) {
    var barang = baca("Barang").map(bentukBarang).filter(function (b) { return b.tokoId === p.tokoId; });
    var tx = baca("Transaksi").map(bentukTransaksi).filter(function (t) { return t.tokoId === p.tokoId && t.tanggal === hariIni(); });
    return { success: true, data: {
      totalBarang: barang.length,
      stokKritis: barang.filter(diBawahRop).length,
      txMasuk: tx.filter(function (t) { return t.jenis === "masuk"; }).length,
      txKeluar: tx.filter(function (t) { return t.jenis === "keluar"; }).length,
    } };
  },

  getNotifikasi: function (p) {
    var barang = baca("Barang").map(bentukBarang);
    if (p.tokoId) barang = barang.filter(function (b) { return b.tokoId === p.tokoId; });
    var waktu = waktuSekarang().slice(0, 16);
    var list = barang
      .filter(function (b) { return b.rop > 0 && b.stok <= b.rop * 1.5; })
      .sort(function (a, b) { return a.stok / a.rop - b.stok / b.rop; })
      .map(function (b, i) {
        var kritis = b.stok <= b.rop;
        return {
          id: "NOT-" + (i + 1), tokoId: b.tokoId, barangId: b.id, tipe: kritis ? "kritis" : "perhatian", waktu: waktu,
          pesan: kritis
            ? "⚠️ STOK DI BAWAH ROP: " + b.nama + " — sisa " + b.stok + " " + b.satuan + ", batas ROP = " + b.rop + ". Segera pesan ulang."
            : "🟡 MENDEKATI ROP: " + b.nama + " — sisa " + b.stok + " " + b.satuan + ", batas ROP = " + b.rop + ".",
        };
      });
    return { success: true, data: list };
  },

  getPendaftaran: function () {
    var list = baca("Pendaftaran")
      .filter(function (x) { return x.status === "pending" || x.status === "review"; })
      .map(function (x) {
        return { id: x.id, nama: x.nama, pemilik: x.pemilik, kec: x.kecamatan, tgl: x.tgl, status: x.status, hp: x.noHp, jenis: x.jenis, barang: "—" };
      });
    return { success: true, data: list };
  },

  approveToko: function (p) {
    var sh = lembar("Pendaftaran");
    var rows = baca("Pendaftaran");
    var idx = cariIndex(rows, p.id);
    if (idx < 0) return { success: false, msg: "Pendaftaran tidak ditemukan." };
    var d = rows[idx];
    if (d.status === "disetujui") return { success: false, msg: "Pendaftaran ini sudah disetujui." };
    if (emailDipakaiPengguna(d.email)) return { success: false, msg: "Email " + d.email + " sudah dipakai akun lain." };

    var tokoId = idBerikut("Toko", "TOKO-");
    tambah("Toko", { id: tokoId, nama: d.nama, pemilik: d.pemilik, desa: "", kecamatan: d.kecamatan, noHp: d.noHp, jenis: d.jenis, status: "aktif", dibuat: waktuSekarang() });
    tambah("Pengguna", { id: idBerikut("Pengguna", "USR-"), nama: d.pemilik, email: d.email, salt: d.salt, hash: d.hash, role: "pemilik", tokoId: tokoId, status: "aktif", dibuat: waktuSekarang() });
    tulisSel(sh, idx, "Pendaftaran", "status", "disetujui");
    tulisSel(sh, idx, "Pendaftaran", "catatan", p.catatan || "");
    catatLog("info", "Pendaftaran disetujui: " + d.nama + " (" + tokoId + ")");
    return { success: true, msg: "Disetujui.", tokoId: tokoId };
  },

  rejectToko: function (p) {
    var sh = lembar("Pendaftaran");
    var rows = baca("Pendaftaran");
    var idx = cariIndex(rows, p.id);
    if (idx < 0) return { success: false, msg: "Pendaftaran tidak ditemukan." };
    tulisSel(sh, idx, "Pendaftaran", "status", "ditolak");
    tulisSel(sh, idx, "Pendaftaran", "catatan", p.catatan || "");
    catatLog("info", "Pendaftaran ditolak: " + rows[idx].nama);
    return { success: true, msg: "Ditolak." };
  },

  // nama lama dipertahankan agar cocok dengan website; isinya parameter ROP
  saveEoqParams: function (p) {
    if (p.leadTime) aturPengaturan("leadTime", Number(p.leadTime));
    if (p.periode) aturPengaturan("periode", Number(p.periode));
    catatLog("info", "Parameter ROP default diubah: L=" + p.leadTime + " hari, periode=" + p.periode + " hari");
    return { success: true, msg: "Parameter ROP disimpan." };
  },

  getLog: function (p) {
    var list = baca("Log").reverse().slice(0, Number(p.limit) || 20).map(function (l, i) {
      return { id: "LOG-" + (i + 1), tipe: l.tipe === "peringatan" ? "info" : l.tipe, pesan: l.pesan, waktu: teks(l.waktu) };
    });
    return { success: true, data: list };
  },

  getGlobalStats: function () {
    var toko = baca("Toko").map(bentukToko);
    var barang = baca("Barang").map(bentukBarang);
    var batas = tanggalMundur(29);
    var tx = baca("Transaksi").map(bentukTransaksi).filter(function (t) { return t.tanggal >= batas; });
    return { success: true, data: {
      totalToko: toko.length,
      totalBarang: barang.length,
      totalTransaksi: tx.length,
      itemKritis: barang.filter(diBawahRop).length,
      tokoList: toko.map(function (t) {
        var b = barang.filter(function (x) { return x.tokoId === t.id; });
        return Object.assign({}, t, {
          jumlahBarang: b.length,
          txBulanIni: tx.filter(function (x) { return x.tokoId === t.id; }).length,
          itemKritis: b.filter(diBawahRop).length,
        });
      }),
    } };
  },

  // Setup Stok Awal: tambah barang baru atau perbarui barang dengan nama yang sama
  saveDraftStok: function (p) {
    if (!p.tokoId) return { success: false, msg: "tokoId wajib diisi." };
    if (!baca("Toko").some(function (t) { return t.id === p.tokoId; })) return { success: false, msg: "Kelompok " + p.tokoId + " tidak ditemukan." };
    var items = p.items || [];
    if (!items.length) return { success: false, msg: "Tidak ada barang yang dikirim." };
    var defaultL = Number(ambilPengaturan("leadTime")) || 0;

    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      var sh = lembar("Barang");
      var rows = baca("Barang");
      var baru = 0, diubah = 0;
      items.forEach(function (it) {
        var nama = String(it.nama || "").trim();
        if (!nama) return;
        var d = Number(it.d) || 0;
        var lt = Number(it.lt) || 0;
        var rop = Number(it.rop) || (d > 0 ? Math.ceil(d * (lt || defaultL)) : 0);
        var idx = -1;
        for (var i = 0; i < rows.length; i++) if (rows[i].tokoId === p.tokoId && String(rows[i].nama).toLowerCase() === nama.toLowerCase()) { idx = i; break; }
        if (idx >= 0) {
          var ubah = { stok: Number(it.stok) || 0, satuan: it.satuan || rows[idx].satuan, kategori: it.kategori || rows[idx].kategori, harga: Number(it.harga) || rows[idx].harga, diperbarui: waktuSekarang() };
          if (d) ubah.d = d;
          if (lt) ubah.lt = lt;
          if (rop) ubah.rop = rop;
          Object.keys(ubah).forEach(function (k) { tulisSel(sh, idx, "Barang", k, ubah[k]); });
          diubah++;
        } else {
          tambah("Barang", {
            id: idBerikut("Barang", "BRG-"), tokoId: p.tokoId, nama: nama, sku: it.sku || "", kategori: it.kategori || "",
            satuan: it.satuan || "unit", harga: Number(it.harga) || 0, stok: Number(it.stok) || 0,
            d: d || "", lt: lt || "", rop: rop || "", diperbarui: waktuSekarang(),
          });
          rows = baca("Barang");
          baru++;
        }
      });
      catatLog("info", "Setup stok " + p.tokoId + ": " + baru + " barang baru, " + diubah + " diperbarui");
      return { success: true, msg: baru + " barang baru, " + diubah + " barang diperbarui." };
    } finally {
      lock.releaseLock();
    }
  },
};

/* ════════════════════════════════════════════════════════════════
 *  BENTUK DATA YANG DIKIRIM KE WEBSITE
 * ════════════════════════════════════════════════════════════════ */
function bentukToko(t) {
  return { id: teks(t.id), nama: t.nama, pemilik: t.pemilik, desa: t.desa, kecamatan: t.kecamatan, noHp: teks(t.noHp), jenis: t.jenis, status: t.status || "aktif" };
}
function bentukBarang(b) {
  return {
    id: teks(b.id), tokoId: teks(b.tokoId), nama: b.nama, sku: teks(b.sku), kategori: b.kategori, satuan: b.satuan,
    harga: Number(b.harga) || 0, stok: Number(b.stok) || 0, d: Number(b.d) || 0, lt: Number(b.lt) || 0, rop: Number(b.rop) || 0,
  };
}
function bentukTransaksi(t) {
  return {
    id: teks(t.id), tokoId: teks(t.tokoId), barangId: teks(t.barangId), jenis: t.jenis, jumlah: Number(t.jumlah) || 0,
    tanggal: tanggalTeks(t.tanggal), keterangan: t.keterangan, oleh: t.oleh, dicatatPada: teks(t.dicatatPada),
  };
}
function diBawahRop(b) { return b.rop > 0 && b.stok <= b.rop; }

/* ════════════════════════════════════════════════════════════════
 *  MENU DI SPREADSHEET
 * ════════════════════════════════════════════════════════════════ */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Smart Inventory")
    .addItem("1. Siapkan Spreadsheet", "bukaFormSetup")
    .addItem("Tambah Pengguna", "bukaFormPengguna")
    .addItem("Ganti Password Pengguna", "bukaFormPassword")
    .addSeparator()
    .addItem("Cek Kesiapan", "cekKesiapan")
    .addToUi();
}

function bukaFormSetup() {
  if (siap()) {
    var ui = SpreadsheetApp.getUi();
    var r = ui.alert("Spreadsheet sudah pernah disiapkan.", "Jalankan lagi hanya untuk menambah kelompok dan akun baru. Data yang ada tidak akan dihapus. Lanjutkan?", ui.ButtonSet.YES_NO);
    if (r !== ui.Button.YES) return;
  }
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(HTML_SETUP).setWidth(460).setHeight(640), "Siapkan Smart Inventory Kelompok Tani");
}

function bukaFormPengguna() {
  if (!siap()) { SpreadsheetApp.getUi().alert("Jalankan dulu: Smart Inventory → 1. Siapkan Spreadsheet."); return; }
  var opsi = baca("Toko").map(function (t) { return '<option value="' + esc(t.id) + '">' + esc(t.nama) + " (" + esc(t.id) + ")</option>"; }).join("");
  var html = HTML_PENGGUNA.replace("{{OPSI_TOKO}}", opsi);
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(420).setHeight(480), "Tambah Pengguna");
}

function bukaFormPassword() {
  if (!siap()) { SpreadsheetApp.getUi().alert("Jalankan dulu: Smart Inventory → 1. Siapkan Spreadsheet."); return; }
  var opsi = baca("Pengguna").map(function (u) { return '<option value="' + esc(u.email) + '">' + esc(u.nama) + " — " + esc(u.email) + "</option>"; }).join("");
  var html = HTML_PASSWORD.replace("{{OPSI_PENGGUNA}}", opsi);
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(420).setHeight(300), "Ganti Password");
}

/* Dipanggil dari formulir setup */
function prosesSetup(f) {
  if (!String(f.namaKelompok || "").trim()) throw new Error("Nama kelompok wajib diisi.");
  [["ketuaEmail", "ketuaPass"], ["adminEmail", "adminPass"]].forEach(function (k) {
    if (!String(f[k[0]] || "").trim()) throw new Error("Email wajib diisi.");
    if (String(f[k[1]] || "").length < 6) throw new Error("Password minimal 6 karakter.");
  });
  if (String(f.ketuaEmail).trim().toLowerCase() === String(f.adminEmail).trim().toLowerCase()) throw new Error("Email ketua dan admin harus berbeda.");

  buatSemuaSheet();
  if (emailDipakaiPengguna(f.ketuaEmail)) throw new Error("Email " + f.ketuaEmail + " sudah terdaftar.");

  var tokoId = idBerikut("Toko", "TOKO-");
  tambah("Toko", {
    id: tokoId, nama: f.namaKelompok, pemilik: f.ketuaNama || "Ketua Kelompok", desa: f.desa || "",
    kecamatan: f.kecamatan || "", noHp: f.noHp || "", jenis: f.komoditas || "Padi", status: "aktif", dibuat: waktuSekarang(),
  });
  buatPengguna(f.ketuaNama || "Ketua Kelompok", f.ketuaEmail, f.ketuaPass, "pemilik", tokoId);
  if (!emailDipakaiPengguna(f.adminEmail)) buatPengguna(f.adminNama || "Admin Pengabdian", f.adminEmail, f.adminPass, "admin", "");
  if (String(f.pencatatEmail || "").trim()) {
    if (String(f.pencatatPass || "").length < 6) throw new Error("Password petugas pencatat minimal 6 karakter.");
    buatPengguna(f.pencatatNama || "Petugas Pencatat", f.pencatatEmail, f.pencatatPass, "karyawan", tokoId);
  }
  if (!ambilPengaturan("leadTime")) aturPengaturan("leadTime", 3);
  if (!ambilPengaturan("periode")) aturPengaturan("periode", 30);
  catatLog("info", "Spreadsheet disiapkan untuk " + f.namaKelompok + " (" + tokoId + ")");
  return "Selesai. Kelompok " + f.namaKelompok + " tercatat sebagai " + tokoId + ". Langkah berikutnya: Terapkan → Deployment baru → Aplikasi web.";
}

function prosesTambahPengguna(f) {
  if (ROLES.indexOf(f.role) < 0) throw new Error("Peran tidak dikenal.");
  if (String(f.password || "").length < 6) throw new Error("Password minimal 6 karakter.");
  if (emailDipakaiPengguna(f.email)) throw new Error("Email sudah dipakai.");
  var butuhToko = f.role === "pemilik" || f.role === "karyawan";
  buatPengguna(f.nama, f.email, f.password, f.role, butuhToko ? f.tokoId : "");
  return "Akun " + f.email + " dibuat.";
}

function prosesGantiPassword(f) {
  if (String(f.password || "").length < 6) throw new Error("Password minimal 6 karakter.");
  var sh = lembar("Pengguna");
  var rows = baca("Pengguna");
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].email).toLowerCase() === String(f.email).toLowerCase()) {
      var s = buatSalt();
      tulisSel(sh, i, "Pengguna", "salt", s);
      tulisSel(sh, i, "Pengguna", "hash", hashPassword(f.password, s));
      catatLog("info", "Password diganti: " + f.email);
      return "Password " + f.email + " sudah diganti.";
    }
  }
  throw new Error("Pengguna tidak ditemukan.");
}

function cekKesiapan() {
  var ui = SpreadsheetApp.getUi();
  if (!siap()) { ui.alert("Belum siap", "Jalankan Smart Inventory → 1. Siapkan Spreadsheet.", ui.ButtonSet.OK); return; }
  var u = baca("Pengguna"), t = baca("Toko"), b = baca("Barang"), x = baca("Transaksi");
  var url = "";
  try { url = ScriptApp.getService().getUrl() || ""; } catch (e) {}
  ui.alert("Smart Inventory siap",
    "Kelompok: " + t.length + "\nPengguna: " + u.length + "\nBarang: " + b.length + "\nTransaksi: " + x.length +
    "\n\nURL Web App: " + (url || "(belum di-deploy — Terapkan → Deployment baru → Aplikasi web)"),
    ui.ButtonSet.OK);
}

/* ════════════════════════════════════════════════════════════════
 *  UTILITAS SHEET
 * ════════════════════════════════════════════════════════════════ */
function ss() { return SpreadsheetApp.getActiveSpreadsheet(); }

function siap() {
  var s = ss();
  return Object.keys(SHEETS).every(function (n) { return !!s.getSheetByName(n); });
}

function buatSemuaSheet() {
  var s = ss();
  Object.keys(SHEETS).forEach(function (nama) {
    var sh = s.getSheetByName(nama);
    if (!sh) sh = s.insertSheet(nama);
    var head = SHEETS[nama];
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight("bold").setBackground("#d0f5f5");
      sh.setFrozenRows(1);
    }
    (KOLOM_TEKS[nama] || []).forEach(function (k) {
      var c = head.indexOf(k) + 1;
      if (c > 0) sh.getRange(2, c, sh.getMaxRows() - 1, 1).setNumberFormat("@");
    });
  });
  // Sembunyikan kolom rahasia password
  ["Pengguna", "Pendaftaran"].forEach(function (n) {
    var sh = s.getSheetByName(n), head = SHEETS[n];
    sh.hideColumns(head.indexOf("salt") + 1, 2);
  });
  var awal = s.getSheetByName("Sheet1") || s.getSheetByName("Lembar1");
  if (awal && awal.getLastRow() === 0 && s.getSheets().length > 1) s.deleteSheet(awal);
}

function lembar(nama) { return ss().getSheetByName(nama); }

function baca(nama) {
  var sh = lembar(nama);
  var last = sh.getLastRow();
  if (last < 2) return [];
  var head = SHEETS[nama];
  var vals = sh.getRange(2, 1, last - 1, head.length).getValues();
  return vals
    .filter(function (r) { return r.some(function (v) { return v !== "" && v !== null; }); })
    .map(function (r) { var o = {}; head.forEach(function (h, i) { o[h] = r[i]; }); return o; });
}

function tambah(nama, obj) {
  var head = SHEETS[nama];
  lembar(nama).appendRow(head.map(function (h) { return obj[h] === undefined ? "" : obj[h]; }));
}

// idx = urutan baris data (0 = baris pertama setelah judul)
function tulisSel(sh, idx, nama, kolom, nilai) {
  var c = SHEETS[nama].indexOf(kolom) + 1;
  if (c > 0) sh.getRange(idx + 2, c).setValue(nilai);
}

function cariIndex(rows, id) {
  for (var i = 0; i < rows.length; i++) if (String(rows[i].id) === String(id)) return i;
  return -1;
}

function idBerikut(nama, prefix) {
  var max = 0;
  baca(nama).forEach(function (r) {
    var m = String(r.id || "").match(/(\d+)$/);
    if (m && String(r.id).indexOf(prefix) === 0) max = Math.max(max, Number(m[1]));
  });
  return prefix + ("000" + (max + 1)).slice(-Math.max(3, String(max + 1).length));
}

function ambilPengaturan(k) {
  var r = baca("Pengaturan").filter(function (x) { return x.kunci === k; })[0];
  return r ? r.nilai : "";
}
function aturPengaturan(k, v) {
  var sh = lembar("Pengaturan"), rows = baca("Pengaturan");
  for (var i = 0; i < rows.length; i++) if (rows[i].kunci === k) { tulisSel(sh, i, "Pengaturan", "nilai", v); return; }
  tambah("Pengaturan", { kunci: k, nilai: v });
}

function catatLog(tipe, pesan) {
  try { tambah("Log", { waktu: waktuSekarang(), tipe: tipe, pesan: pesan }); } catch (e) {}
}

/* ── PENGGUNA & PASSWORD ── */
function buatPengguna(nama, email, password, role, tokoId) {
  var s = buatSalt();
  tambah("Pengguna", {
    id: idBerikut("Pengguna", "USR-"), nama: nama, email: String(email).trim().toLowerCase(),
    salt: s, hash: hashPassword(password, s), role: role, tokoId: tokoId || "", status: "aktif", dibuat: waktuSekarang(),
  });
}
function emailDipakaiPengguna(email) {
  var e = String(email || "").trim().toLowerCase();
  return baca("Pengguna").some(function (u) { return String(u.email).toLowerCase() === e; });
}
function emailDipakai(email) {
  var e = String(email || "").trim().toLowerCase();
  return emailDipakaiPengguna(e) || baca("Pendaftaran").some(function (d) { return String(d.email).toLowerCase() === e && d.status !== "ditolak"; });
}
function buatSalt() { return Utilities.getUuid().replace(/-/g, "").slice(0, 16); }
function hashPassword(password, salt) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(salt) + "|" + String(password), Utilities.Charset.UTF_8);
  return bytes.map(function (b) { return ("0" + (b & 0xff).toString(16)).slice(-2); }).join("");
}
function cocokPassword(password, salt, hash) {
  return !!hash && hashPassword(password || "", salt) === String(hash);
}

/* ── TANGGAL ── */
function hariIni() { return Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd"); }
function waktuSekarang() { return Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd HH:mm:ss"); }
function tanggalMundur(n) { var d = new Date(); d.setDate(d.getDate() - n); return Utilities.formatDate(d, TZ, "yyyy-MM-dd"); }
function tanggalTeks(v) {
  if (v instanceof Date) return Utilities.formatDate(v, TZ, "yyyy-MM-dd");
  return String(v || "").slice(0, 10);
}
function teks(v) {
  if (v instanceof Date) return Utilities.formatDate(v, TZ, "yyyy-MM-dd HH:mm:ss");
  return v === null || v === undefined ? "" : String(v);
}
function esc(v) { return String(v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

/* ════════════════════════════════════════════════════════════════
 *  FORMULIR (HTML) — ditempel di sini agar cukup satu file
 * ════════════════════════════════════════════════════════════════ */
var CSS_FORM = "<style>body{font-family:Arial,sans-serif;font-size:13px;color:#1e293b;margin:0;padding:4px 6px}" +
  "h3{font-size:13px;margin:14px 0 6px;color:#0f4a4a;border-bottom:1px solid #d0f5f5;padding-bottom:4px}" +
  "label{display:block;font-size:11px;font-weight:bold;color:#64748b;margin:8px 0 3px}" +
  "input,select{width:100%;box-sizing:border-box;padding:7px 9px;border:1px solid #cbd5e1;border-radius:6px;font-size:13px}" +
  ".row{display:flex;gap:8px}.row>div{flex:1}.hint{font-size:11px;color:#94a3b8;margin-top:2px}" +
  "button{margin-top:16px;width:100%;padding:10px;background:#136b6b;color:#fff;border:0;border-radius:8px;font-weight:bold;font-size:14px;cursor:pointer}" +
  "button:disabled{opacity:.6}#msg{margin-top:10px;font-size:12px;white-space:pre-wrap}.ok{color:#15803d}.er{color:#dc2626}</style>";

var JS_FORM = "<script>function kirimForm(fn){var f=document.getElementById('f');var o={};" +
  "Array.prototype.forEach.call(f.elements,function(e){if(e.name)o[e.name]=e.value;});" +
  "var b=document.getElementById('btn');var m=document.getElementById('msg');b.disabled=true;m.className='';m.textContent='Memproses…';" +
  "google.script.run.withSuccessHandler(function(r){m.className='ok';m.textContent='✅ '+r;b.textContent='Tutup';b.disabled=false;b.onclick=function(){google.script.host.close();};})" +
  ".withFailureHandler(function(e){m.className='er';m.textContent='❌ '+e.message;b.disabled=false;})[fn](o);}</script>";

var HTML_SETUP = CSS_FORM + JS_FORM +
  "<form id='f' onsubmit='return false'>" +
  "<h3>Data Kelompok Tani</h3>" +
  "<label>Nama kelompok *</label><input name='namaKelompok' value='Kelompok Tani Bulo Pao Dua'>" +
  "<div class='row'><div><label>Desa</label><input name='desa' value='Padanglampe'></div><div><label>Kecamatan</label><input name='kecamatan' value=\"Ma'rang\"></div></div>" +
  "<div class='row'><div><label>Komoditas utama</label><input name='komoditas' value='Padi'></div><div><label>No. WhatsApp ketua</label><input name='noHp'></div></div>" +
  "<h3>Akun Ketua Kelompok (pengelola)</h3>" +
  "<label>Nama ketua</label><input name='ketuaNama'>" +
  "<div class='row'><div><label>Email login *</label><input name='ketuaEmail' type='email'></div><div><label>Password * (min. 6)</label><input name='ketuaPass' type='password'></div></div>" +
  "<h3>Akun Admin Pengabdian</h3>" +
  "<label>Nama</label><input name='adminNama' value='Admin Pengabdian'>" +
  "<div class='row'><div><label>Email login *</label><input name='adminEmail' type='email'></div><div><label>Password * (min. 6)</label><input name='adminPass' type='password'></div></div>" +
  "<h3>Akun Petugas Pencatat (opsional)</h3>" +
  "<label>Nama</label><input name='pencatatNama'>" +
  "<div class='row'><div><label>Email login</label><input name='pencatatEmail' type='email'></div><div><label>Password</label><input name='pencatatPass' type='password'></div></div>" +
  "<div class='hint'>Password disimpan dalam bentuk acak (hash), tidak bisa dibaca dari spreadsheet. Catat di tempat aman.</div>" +
  "<button id='btn' onclick=\"kirimForm('prosesSetup')\">Siapkan Spreadsheet</button><div id='msg'></div></form>";

var HTML_PENGGUNA = CSS_FORM + JS_FORM +
  "<form id='f' onsubmit='return false'>" +
  "<label>Nama</label><input name='nama'>" +
  "<label>Email login</label><input name='email' type='email'>" +
  "<label>Password (min. 6)</label><input name='password' type='password'>" +
  "<label>Peran</label><select name='role'>" +
  "<option value='karyawan'>Petugas Pencatat</option><option value='pemilik'>Ketua Kelompok</option>" +
  "<option value='admin'>Admin Pengabdian</option><option value='dinas'>Pemantau</option></select>" +
  "<label>Kelompok</label><select name='tokoId'>{{OPSI_TOKO}}</select>" +
  "<div class='hint'>Kelompok hanya dipakai untuk Ketua dan Petugas Pencatat.</div>" +
  "<button id='btn' onclick=\"kirimForm('prosesTambahPengguna')\">Tambah Pengguna</button><div id='msg'></div></form>";

var HTML_PASSWORD = CSS_FORM + JS_FORM +
  "<form id='f' onsubmit='return false'>" +
  "<label>Pengguna</label><select name='email'>{{OPSI_PENGGUNA}}</select>" +
  "<label>Password baru (min. 6)</label><input name='password' type='password'>" +
  "<button id='btn' onclick=\"kirimForm('prosesGantiPassword')\">Ganti Password</button><div id='msg'></div></form>";
