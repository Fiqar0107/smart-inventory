/**
 * ═══════════════════════════════════════════════════
 *  Smart Inventory Desa — API Layer
 *  js/api.js
 *
 *  Satu-satunya file yang berkomunikasi dengan
 *  Google Apps Script (backend) dan Google Sheets.
 *
 *  Urutan <script> di setiap halaman:
 *    <script src="js/terms.js"></script>   ← mode UMKM / Kelompok Tani
 *    <script src="js/auth.js"></script>
 *    <script src="js/api.js"></script>
 *
 *  Rumus yang dipakai sistem (sesuai laporan):
 *    ROP = d × L
 *    d = rata-rata barang keluar per hari
 *    L = waktu tunggu pengiriman (hari)
 * ═══════════════════════════════════════════════════
 */

/* ── KONFIGURASI ─────────────────────────────────── */
const SI_MODE = (window.SI && window.SI.mode) || "umkm";

const API_CONFIG = {
  /*
   * Setiap mode punya Google Sheets sendiri, supaya data tidak tercampur.
   *
   * urlUmkm   : Apps Script untuk data UMKM (data lama, JANGAN diubah).
   * urlPoktan : Apps Script untuk data KELOMPOK TANI.
   *             Selama masih "ISI_URL_...", mode Kelompok Tani memakai
   *             data contoh dan menampilkan banner "mode peragaan".
   *             Cara membuatnya: lihat PANDUAN-KELOMPOK-TANI.md
   */
  urlUmkm:   "https://script.google.com/macros/s/AKfycbwoqRUaWoZMdRVl9tmRagqRv0YAvtuR1m0AJNrkl7_7Tk_BwSnigg0JqJFU1Xz5p9uxNw/exec",
  urlPoktan: "ISI_URL_APPS_SCRIPT_KELOMPOK_TANI",

  // URL yang dipakai sesuai mode yang dipilih di halaman masuk
  get url() {
    return SI_MODE === "poktan" ? this.urlPoktan : this.urlUmkm;
  },

  // Jika true → pakai data contoh tanpa memanggil API
  get demoMode() {
    return !this.url || this.url.startsWith("ISI_URL");
  },

  timeout: 10000, // 10 detik
};

/* ── UTIL TANGGAL ────────────────────────────────── */
function _today() {
  const d = new Date();
  return _ymd(d);
}
function _ymd(d) {
  const z = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
function _daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return _ymd(d);
}

/* ── RUMUS ROP ───────────────────────────────────── */
function hitungRop(d, L) {
  const dd = Number(d), ll = Number(L);
  if (!(dd > 0) || !(ll > 0)) return 0;
  return Math.ceil(dd * ll);
}

/* ═══ DATA CONTOH ═══════════════════════════════════
 * Semua data di bawah adalah DATA CONTOH untuk peragaan.
 * Bukan data mitra. Data nyata tersimpan di Google Sheets.
 * ════════════════════════════════════════════════════ */

// barang: d = rata-rata keluar/hari, lt = waktu tunggu (hari), rop = ceil(d × lt)
function _barang(list, tokoId) {
  return list.map((b, i) => ({
    id: `BRG-${String(i + 1).padStart(3, "0")}${tokoId === "TOKO-001" ? "" : "-" + tokoId.slice(-1)}`,
    tokoId,
    ...b,
    rop: hitungRop(b.d, b.lt),
  }));
}

const DEMO_UMKM = {
  pengguna: [
    { id: "USR-001", nama: "Pak Ahmad",        email: "pemilik@demo.com",  password: "demo123", role: "pemilik",  tokoId: "TOKO-001" },
    { id: "USR-002", nama: "Andi",             email: "karyawan@demo.com", password: "demo123", role: "karyawan", tokoId: "TOKO-001" },
    { id: "USR-003", nama: "Sari",             email: "sari@demo.com",     password: "demo123", role: "karyawan", tokoId: "TOKO-001" },
    { id: "USR-004", nama: "Bu Rahmawati",     email: "pemilik2@demo.com", password: "demo123", role: "pemilik",  tokoId: "TOKO-002" },
    { id: "USR-006", nama: "Admin Pengabdian", email: "admin@demo.com",    password: "demo123", role: "admin",    tokoId: "" },
    { id: "USR-007", nama: "Pemantau Program", email: "dinas@demo.com",    password: "demo123", role: "dinas",    tokoId: "" },
  ],
  toko: [
    { id: "TOKO-001", nama: "Toko Contoh Berkah",  pemilik: "Pak Ahmad",    kecamatan: "Bungoro",    noHp: "081200000001", jenis: "Sembako",   status: "aktif" },
    { id: "TOKO-002", nama: "Warung Contoh Rahma", pemilik: "Bu Rahmawati", kecamatan: "Pangkajene", noHp: "081200000002", jenis: "Kelontong", status: "aktif" },
  ],
  barangDef: {
    "TOKO-001": [
      { nama: "Minyak Goreng 1 L",     sku: "MG-001", stok: 8,   satuan: "botol",   harga: 15000, kategori: "sembako", d: 5,   lt: 4 },
      { nama: "Gula Pasir 1 kg",       sku: "GP-002", stok: 5,   satuan: "kg",      harga: 14000, kategori: "sembako", d: 3,   lt: 4 },
      { nama: "Tepung Terigu 1 kg",    sku: "TT-003", stok: 12,  satuan: "bungkus", harga: 11000, kategori: "sembako", d: 3,   lt: 4 },
      { nama: "Beras 5 kg",            sku: "BR-004", stok: 60,  satuan: "sak",     harga: 65000, kategori: "sembako", d: 6,   lt: 5 },
      { nama: "Sabun Mandi",           sku: "SM-005", stok: 35,  satuan: "biji",    harga: 4500,  kategori: "sabun",   d: 4,   lt: 5 },
      { nama: "Mi Instan Goreng",      sku: "MI-006", stok: 120, satuan: "biji",    harga: 3000,  kategori: "sembako", d: 12,  lt: 4 },
      { nama: "Air Mineral Gelas",     sku: "AM-007", stok: 24,  satuan: "dus",     harga: 18000, kategori: "minuman", d: 3,   lt: 5 },
      { nama: "Kopi Sachet",           sku: "KS-008", stok: 3,   satuan: "renceng", harga: 23000, kategori: "minuman", d: 2,   lt: 5 },
      { nama: "Deterjen 1 kg",         sku: "DT-009", stok: 22,  satuan: "bungkus", harga: 20000, kategori: "sabun",   d: 3,   lt: 5 },
      { nama: "Kecap Manis 220 ml",    sku: "KM-010", stok: 14,  satuan: "botol",   harga: 10000, kategori: "bumbu",   d: 2,   lt: 5 },
      { nama: "Telur Ayam",            sku: "TA-011", stok: 50,  satuan: "butir",   harga: 2500,  kategori: "sembako", d: 10,  lt: 4 },
      { nama: "Garam Halus 500 g",     sku: "GH-012", stok: 20,  satuan: "bungkus", harga: 3000,  kategori: "bumbu",   d: 2,   lt: 7 },
    ],
    "TOKO-002": [
      { nama: "Minyak Goreng 2 L",     sku: "MG-021", stok: 15,  satuan: "botol",   harga: 28000, kategori: "sembako", d: 3,   lt: 4 },
      { nama: "Beras 5 kg",            sku: "BR-022", stok: 30,  satuan: "sak",     harga: 58000, kategori: "sembako", d: 4,   lt: 5 },
      { nama: "Gula Pasir 1 kg",       sku: "GP-023", stok: 8,   satuan: "kg",      harga: 14000, kategori: "sembako", d: 2,   lt: 5 },
    ],
  },
  ketMasuk: ["dari grosir", "kiriman penyalur", "tambah stok"],
  ketKeluar: ["terjual", "terjual ke pelanggan", "penjualan pagi"],
  pendaftaran: [
    { id: 1, nama: "Toko Contoh Sinar",  pemilik: "Ibu Rina",   kec: "Bungoro",    tgl: _daysAgo(1), status: "pending", hp: "0812-0000-0011", jenis: "Sembako",   barang: "~35 item" },
    { id: 2, nama: "Warung Contoh Maju", pemilik: "Pak Salim",  kec: "Pangkajene", tgl: _daysAgo(3), status: "review",  hp: "0812-0000-0012", jenis: "Kelontong", barang: "~20 item" },
  ],
};

const DEMO_POKTAN = {
  pengguna: [
    { id: "USR-001", nama: "Ketua Kelompok",   email: "pemilik@demo.com",  password: "demo123", role: "pemilik",  tokoId: "TOKO-001" },
    { id: "USR-002", nama: "Petugas Pencatat", email: "karyawan@demo.com", password: "demo123", role: "karyawan", tokoId: "TOKO-001" },
    { id: "USR-003", nama: "Sekretaris",       email: "sari@demo.com",     password: "demo123", role: "karyawan", tokoId: "TOKO-001" },
    { id: "USR-004", nama: "Ketua Kelompok B", email: "pemilik2@demo.com", password: "demo123", role: "pemilik",  tokoId: "TOKO-002" },
    { id: "USR-006", nama: "Admin Pengabdian", email: "admin@demo.com",    password: "demo123", role: "admin",    tokoId: "" },
    { id: "USR-007", nama: "Pemantau Program", email: "dinas@demo.com",    password: "demo123", role: "dinas",    tokoId: "" },
  ],
  toko: [
    { id: "TOKO-001", nama: "Kelompok Tani Contoh A", pemilik: "Ketua Kelompok",   kecamatan: "Ma'rang", noHp: "081200000101", jenis: "Padi", status: "aktif" },
    { id: "TOKO-002", nama: "Kelompok Tani Contoh B", pemilik: "Ketua Kelompok B", kecamatan: "Ma'rang", noHp: "081200000102", jenis: "Padi", status: "aktif" },
  ],
  barangDef: {
    "TOKO-001": [
      { nama: "Pupuk Urea (sak 50 kg)",       sku: "PU-001", stok: 6,  satuan: "sak",     harga: 112500, kategori: "pupuk",       d: 2,   lt: 4 },
      { nama: "Pupuk NPK (sak 50 kg)",        sku: "PN-002", stok: 14, satuan: "sak",     harga: 115000, kategori: "pupuk",       d: 1.5, lt: 4 },
      { nama: "Pupuk ZA (sak 50 kg)",         sku: "PZ-003", stok: 5,  satuan: "sak",     harga: 85000,  kategori: "pupuk",       d: 1,   lt: 4 },
      { nama: "Pupuk Organik (sak 40 kg)",    sku: "PO-004", stok: 20, satuan: "sak",     harga: 32000,  kategori: "pupuk",       d: 1,   lt: 7 },
      { nama: "Benih Padi Inpari 32 (5 kg)",  sku: "BP-005", stok: 4,  satuan: "kantong", harga: 65000,  kategori: "benih",       d: 1,   lt: 7 },
      { nama: "Benih Padi Ciherang (5 kg)",   sku: "BC-006", stok: 12, satuan: "kantong", harga: 60000,  kategori: "benih",       d: 1,   lt: 7 },
      { nama: "Insektisida cair 500 ml",      sku: "IN-007", stok: 3,  satuan: "botol",   harga: 75000,  kategori: "pestisida",   d: 0.5, lt: 6 },
      { nama: "Herbisida 1 L",                sku: "HB-008", stok: 9,  satuan: "botol",   harga: 90000,  kategori: "pestisida",   d: 0.5, lt: 6 },
      { nama: "Fungisida 250 g",              sku: "FG-009", stok: 6,  satuan: "bungkus", harga: 55000,  kategori: "pestisida",   d: 0.3, lt: 6 },
      { nama: "Karung Panen",                 sku: "KP-010", stok: 40, satuan: "lembar",  harga: 3500,   kategori: "perlengkapan", d: 3,  lt: 3 },
    ],
    "TOKO-002": [
      { nama: "Pupuk Urea (sak 50 kg)",       sku: "PU-021", stok: 10, satuan: "sak",     harga: 112500, kategori: "pupuk",       d: 1.5, lt: 4 },
      { nama: "Pupuk NPK (sak 50 kg)",        sku: "PN-022", stok: 3,  satuan: "sak",     harga: 115000, kategori: "pupuk",       d: 1,   lt: 4 },
      { nama: "Benih Padi Inpari 32 (5 kg)",  sku: "BP-023", stok: 8,  satuan: "kantong", harga: 65000,  kategori: "benih",       d: 0.5, lt: 7 },
    ],
  },
  ketMasuk: ["dari kios pupuk lengkap", "kiriman penyalur", "tambah stok"],
  ketKeluar: ["disalurkan ke anggota", "disalurkan ke anggota", "dipakai lahan demplot"],
  pendaftaran: [
    { id: 1, nama: "Kelompok Tani Contoh C", pemilik: "Ketua Kelompok C", kec: "Ma'rang", tgl: _daysAgo(2), status: "pending", hp: "0812-0000-0103", jenis: "Padi", barang: "~10 item" },
  ],
};

const DEMO_SRC = SI_MODE === "poktan" ? DEMO_POKTAN : DEMO_UMKM;

/* Transaksi contoh 21 hari terakhir (deterministik, tidak acak tiap muat) */
function _buatTransaksi(barang, src) {
  const out = [];
  let seq = 1, seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const pencatat = src.pengguna.filter((u) => u.role === "karyawan" || u.role === "pemilik");
  for (let day = 20; day >= 0; day--) {
    barang.forEach((b) => {
      if (rnd() < 0.35) {
        const qty = Math.max(1, Math.round(b.d * (1 + rnd() * 2)));
        const u = pencatat.filter((x) => x.tokoId === b.tokoId)[Math.floor(rnd() * 2)] || pencatat[0];
        out.push({
          id: "TX-" + String(seq++).padStart(4, "0"), tokoId: b.tokoId, barangId: b.id,
          jenis: "keluar", jumlah: qty, tanggal: _daysAgo(day),
          keterangan: src.ketKeluar[Math.floor(rnd() * src.ketKeluar.length)], oleh: u.nama,
        });
      }
      if (day % 7 === 3 && rnd() < 0.5) {
        const u = pencatat.find((x) => x.tokoId === b.tokoId && x.role === "pemilik") || pencatat[0];
        out.push({
          id: "TX-" + String(seq++).padStart(4, "0"), tokoId: b.tokoId, barangId: b.id,
          jenis: "masuk", jumlah: Math.ceil(b.d * b.lt * 2), tanggal: _daysAgo(day),
          keterangan: src.ketMasuk[Math.floor(rnd() * src.ketMasuk.length)], oleh: u.nama,
        });
      }
    });
  }
  return out.sort((a, b) => (a.tanggal < b.tanggal ? 1 : a.tanggal > b.tanggal ? -1 : 0));
}

const DEMO_DATA = (() => {
  const barang = Object.entries(DEMO_SRC.barangDef).flatMap(([tid, list]) => _barang(list, tid));
  return {
    pengguna: DEMO_SRC.pengguna,
    toko: DEMO_SRC.toko,
    barang,
    transaksi: _buatTransaksi(barang, DEMO_SRC),
    pendaftaran: DEMO_SRC.pendaftaran,
    log: [
      { id: "LOG-001", tipe: "info", pesan: "Data contoh dimuat (mode peragaan).", waktu: _today() + " 08:00" },
    ],
  };
})();

/* Peringatan stok dibentuk dari data barang, bukan teks tetap */
function buatNotifikasi(barangList) {
  const now = new Date();
  const jam = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return barangList
    .filter((b) => Number(b.rop) > 0 && Number(b.stok) <= Number(b.rop) * 1.5)
    .sort((a, b) => a.stok / (a.rop || 1) - b.stok / (b.rop || 1))
    .map((b, i) => {
      const kritis = Number(b.stok) <= Number(b.rop);
      return {
        id: "NOT-" + (i + 1),
        tokoId: b.tokoId,
        barangId: b.id,
        tipe: kritis ? "kritis" : "perhatian",
        pesan: kritis
          ? `⚠️ STOK DI BAWAH ROP: ${b.nama} — sisa ${b.stok} ${b.satuan}, batas ROP = ${b.rop}. Segera pesan ulang.`
          : `🟡 MENDEKATI ROP: ${b.nama} — sisa ${b.stok} ${b.satuan}, batas ROP = ${b.rop}.`,
        waktu: `${_today()} ${jam}`,
      };
    });
}

/* ── STATE RUNTIME (simulasi perubahan data) ─────── */
const _state = {
  barang:      JSON.parse(JSON.stringify(DEMO_DATA.barang)),
  transaksi:   JSON.parse(JSON.stringify(DEMO_DATA.transaksi)),
  pendaftaran: JSON.parse(JSON.stringify(DEMO_DATA.pendaftaran)),
};

/* ── STATUS KONEKSI ───────────────────────────────
 * "live"     : data dari Google Sheets
 * "demo"     : API_CONFIG.url belum diisi
 * "fallback" : Google Sheets gagal dihubungi → data contoh
 */
let _koneksi = API_CONFIG.demoMode ? "demo" : "live";

/* ── CORE FETCH ──────────────────────────────────── */
async function _apiFetch(action, payload = {}) {
  if (API_CONFIG.demoMode) return _demoHandler(action, payload);
  try {
    // Google Apps Script hanya mendukung CORS bebas melalui GET + doGet
    const params = new URLSearchParams({ action, payload: JSON.stringify(payload) });
    const url  = `${API_CONFIG.url}?${params.toString()}`;
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), API_CONFIG.timeout);
    const res  = await fetch(url, { method: "GET", redirect: "follow", signal: ctrl.signal });
    clearTimeout(tid);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    // Action yang belum ada di Apps Script → pakai data contoh untuk action itu saja
    if (json && json.success === false && /tidak dikenal|unknown action/i.test(json.msg || "")) {
      _tandaiFallback(`Action "${action}" belum tersedia di Apps Script`);
      return _demoHandler(action, payload);
    }
    // Backend lama tidak mengirim notifikasi → hitung dari data barang
    if (action === "getNotifikasi" && json && json.success && Array.isArray(json.data) && !json.data.length) {
      const rb = await _apiFetch("getBarang", { tokoId: payload.tokoId });
      if (rb.success) json.data = buatNotifikasi(rb.data);
    }
    return json;
  } catch (err) {
    console.warn("[API] Gagal, pakai data contoh:", err.message);
    _tandaiFallback(err.message);
    return _demoHandler(action, payload);
  }
}

function _tandaiFallback(alasan) {
  if (_koneksi === "fallback") return;
  _koneksi = "fallback";
  _tampilkanBanner(alasan);
}

/* ── DEMO HANDLER ────────────────────────────────── */
function _demoHandler(action, payload) {
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));
  switch (action) {
    case "login": {
      const u = DEMO_DATA.pengguna.find((x) => x.email === payload.email && x.password === payload.password);
      return Promise.resolve(u
        ? { success: true, role: u.role, nama: u.nama, tokoId: u.tokoId, userId: u.id }
        : { success: false, msg: "Email atau password salah." });
    }
    case "getBarang": {
      const list = _state.barang.filter((b) => (payload.tokoId ? b.tokoId === payload.tokoId : true));
      return Promise.resolve({ success: true, data: list });
    }
    case "getToko": {
      const list = payload.tokoId ? DEMO_DATA.toko.filter((t) => t.id === payload.tokoId) : DEMO_DATA.toko;
      return Promise.resolve({ success: true, data: list });
    }
    case "getTransaksi": {
      let list = _state.transaksi.filter((t) => (payload.tokoId ? t.tokoId === payload.tokoId : true));
      if (payload.barangId) list = list.filter((t) => t.barangId === payload.barangId);
      if (payload.limit) list = list.slice(0, payload.limit);
      return Promise.resolve({ success: true, data: list });
    }
    case "getNotifikasi": {
      const list = _state.barang.filter((b) => (payload.tokoId ? b.tokoId === payload.tokoId : true));
      return Promise.resolve({ success: true, data: buatNotifikasi(list) });
    }
    case "getLog": {
      return Promise.resolve({ success: true, data: DEMO_DATA.log.slice(0, payload.limit || 20) });
    }
    case "getDashboard": {
      const barang   = _state.barang.filter((b) => b.tokoId === payload.tokoId);
      const kritis   = barang.filter((b) => b.stok <= b.rop).length;
      const tx       = _state.transaksi.filter((t) => t.tokoId === payload.tokoId && t.tanggal === _today());
      return Promise.resolve({ success: true, data: {
        totalBarang: barang.length, stokKritis: kritis,
        txMasuk: tx.filter((t) => t.jenis === "masuk").length,
        txKeluar: tx.filter((t) => t.jenis === "keluar").length,
      } });
    }
    case "simpanTransaksi": {
      return delay(400).then(() => {
        const { tokoId, barangId, jenis, jumlah, keterangan, oleh } = payload;
        const id = "TX-" + String(Date.now()).slice(-6);
        _state.transaksi.unshift({ id, tokoId, barangId, jenis, jumlah: Number(jumlah), tanggal: _today(), keterangan, oleh });
        const idx = _state.barang.findIndex((b) => b.id === barangId);
        if (idx >= 0) {
          _state.barang[idx].stok = jenis === "masuk"
            ? _state.barang[idx].stok + Number(jumlah)
            : Math.max(0, _state.barang[idx].stok - Number(jumlah));
        }
        return { success: true, msg: "Transaksi tersimpan (data contoh).", txId: id };
      });
    }
    case "getPendaftaran":
      return Promise.resolve({ success: true, data: _state.pendaftaran });
    case "approveToko":
    case "rejectToko":
      return delay(300).then(() => {
        _state.pendaftaran = _state.pendaftaran.filter((p) => p.id !== payload.id);
        return { success: true, msg: action === "approveToko" ? "Disetujui." : "Ditolak." };
      });
    case "saveEoqParams": // nama action lama dipertahankan agar cocok dengan Apps Script
      return delay(200).then(() => ({ success: true, msg: "Parameter ROP disimpan (data contoh)." }));
    case "registerToko":
      return delay(600).then(() => ({ success: true, msg: "Pendaftaran diterima. Tunggu persetujuan admin." }));
    case "getGlobalStats": {
      const semua = _state.barang;
      const batas = _daysAgo(30);
      return Promise.resolve({ success: true, data: {
        totalToko: DEMO_DATA.toko.length,
        totalBarang: semua.length,
        totalTransaksi: _state.transaksi.filter((t) => t.tanggal >= batas).length,
        itemKritis: semua.filter((b) => b.stok <= b.rop).length,
        tokoList: DEMO_DATA.toko.map((t) => ({
          ...t,
          jumlahBarang: semua.filter((b) => b.tokoId === t.id).length,
          txBulanIni: _state.transaksi.filter((tx) => tx.tokoId === t.id && tx.tanggal >= batas).length,
          itemKritis: semua.filter((b) => b.tokoId === t.id && b.stok <= b.rop).length,
        })),
      } });
    }
    case "saveDraftStok": {
      return delay(300).then(() => {
        payload.items.forEach((item, i) => {
          const existing = _state.barang.findIndex((b) => b.tokoId === payload.tokoId && b.nama === item.nama);
          if (existing >= 0) Object.assign(_state.barang[existing], item);
          else _state.barang.push({ id: "BRG-N" + Date.now() + i, sku: "", ...item, tokoId: payload.tokoId });
        });
        return { success: true, msg: `${payload.items.length} barang disimpan (data contoh).` };
      });
    }
    default:
      return Promise.resolve({ success: false, msg: `Action '${action}' tidak dikenal.` });
  }
}

/* ── NORMALISASI TANGGAL dari Google Sheets ───────
 * Sheets bisa mengirim "2026-10-07", "2026-10-07T00:00:00.000Z",
 * atau "07/10/2026". Semua dijadikan "YYYY-MM-DD".
 */
function tglISO(v) {
  if (!v) return "";
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    if (s.length > 10 && /T/.test(s)) { const d = new Date(s); if (!isNaN(d)) return _ymd(d); }
    return `${m[1]}-${m[2]}-${m[3]}`;
  }
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  const d = new Date(s);
  return isNaN(d) ? s : _ymd(d);
}

/* ── RATA-RATA KELUAR PER HARI (d) dari transaksi ── */
function rataKeluarHarian(barangId, transaksi, hari = 30) {
  const batas = _daysAgo(hari - 1);
  const keluar = transaksi.filter((t) => t.barangId === barangId && t.jenis === "keluar" && tglISO(t.tanggal) >= batas);
  if (!keluar.length) return 0;
  const pertama = keluar.map((t) => tglISO(t.tanggal)).sort()[0];
  const rentang = Math.min(hari, Math.max(1, Math.round((new Date(_today()) - new Date(pertama)) / 86400000) + 1));
  const total = keluar.reduce((s, t) => s + Number(t.jumlah || 0), 0);
  return total / rentang;
}

/* ── REKAP PENGGUNAAN SISTEM ──────────────────────
 * Indikator yang dihitung dari data di sistem:
 *  periode, jenis barang, transaksi masuk/keluar,
 *  pengguna yang mencatat, dan berapa kali peringatan
 *  ROP muncul (stok turun melewati batas ROP).
 */
function rekapPenggunaan(barang, transaksi, dari, sampai) {
  const all = transaksi.map((t) => ({ ...t, tanggal: tglISO(t.tanggal) }));
  const tx = all.filter((t) => (!dari || t.tanggal >= dari) && (!sampai || t.tanggal <= sampai));
  const tanggal = tx.map((t) => t.tanggal).sort();
  const pencatat = new Set(tx.map((t) => t.oleh || t.userId || t.dicatatOleh).filter(Boolean));

  // Rekonstruksi stok mundur dari stok sekarang untuk menghitung kejadian peringatan
  let kejadian = 0;
  const barangPernahKritis = new Set();
  barang.forEach((b) => {
    const rop = Number(b.rop);
    if (!(rop > 0)) return;
    const riwayat = all
      .filter((t) => t.barangId === b.id)
      .sort((a, c) => (a.tanggal < c.tanggal ? 1 : a.tanggal > c.tanggal ? -1 : String(c.id).localeCompare(String(a.id))));
    let stokSesudah = Number(b.stok);
    riwayat.forEach((t) => {
      const q = Number(t.jumlah || 0);
      const stokSebelum = t.jenis === "masuk" ? stokSesudah - q : stokSesudah + q;
      const dalamPeriode = (!dari || t.tanggal >= dari) && (!sampai || t.tanggal <= sampai);
      if (dalamPeriode && t.jenis === "keluar" && stokSebelum > rop && stokSesudah <= rop) {
        kejadian++;
        barangPernahKritis.add(b.id);
      }
      stokSesudah = stokSebelum;
    });
  });

  return {
    periode: tanggal.length ? `${tanggal[0]} s.d. ${tanggal[tanggal.length - 1]}` : "—",
    jenisBarang: barang.length,
    txMasuk: tx.filter((t) => t.jenis === "masuk").length,
    txKeluar: tx.filter((t) => t.jenis === "keluar").length,
    txTotal: tx.length,
    hariTercatat: new Set(tx.map((t) => t.tanggal)).size,
    pengguna: pencatat.size ? pencatat.size : null, // null = data pencatat tidak tersedia
    namaPengguna: [...pencatat],
    peringatanRop: kejadian,
    barangPernahDiBawahRop: barangPernahKritis.size,
    saatIniDiBawahRop: barang.filter((b) => Number(b.rop) > 0 && Number(b.stok) <= Number(b.rop)).length,
    barangTanpaRop: barang.filter((b) => !(Number(b.rop) > 0)).length,
  };
}

/* Unduh array objek sebagai CSV (dibuka di Excel / Google Sheets) */
function unduhCSV(namaFile, rows, kolom) {
  const esc = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = kolom.map((k) => esc(k.label)).join(",");
  const body = rows.map((r) => kolom.map((k) => esc(typeof k.get === "function" ? k.get(r) : r[k.key])).join(",")).join("\n");
  const blob = new Blob(["﻿" + head + "\n" + body], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = namaFile;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

/* ── PUBLIC API ──────────────────────────────────── */
const API = {
  // Auth
  login:         (email, password)          => _apiFetch("login",          { email, password }),
  register:      (data)                     => _apiFetch("registerToko",   data),

  // Barang
  getBarang:     (tokoId)                   => _apiFetch("getBarang",      { tokoId }),

  // Toko / Kelompok
  getToko:       (tokoId)                   => _apiFetch("getToko",        { tokoId }),
  getAllToko:    ()                         => _apiFetch("getToko",        {}),

  // Transaksi
  getTransaksi:  (tokoId, limit = 20)       => _apiFetch("getTransaksi",   { tokoId, limit }),
  simpanTransaksi: (tokoId, barangId, jenis, jumlah, ket, oleh) =>
                                               _apiFetch("simpanTransaksi", { tokoId, barangId, jenis, jumlah, keterangan: ket, oleh }),

  // Dashboard
  getDashboard:  (tokoId)                   => _apiFetch("getDashboard",   { tokoId }),

  // Notifikasi
  getNotifikasi: (tokoId)                   => _apiFetch("getNotifikasi",  { tokoId }),

  // Admin
  getPendaftaran: ()                        => _apiFetch("getPendaftaran", {}),
  approveToko:   (id, catatan)              => _apiFetch("approveToko",    { id, catatan }),
  rejectToko:    (id, catatan)              => _apiFetch("rejectToko",     { id, catatan }),
  saveRopParams: (params)                   => _apiFetch("saveEoqParams",  params),
  getLog:        (limit = 20)               => _apiFetch("getLog",         { limit }),

  // Pemantau
  getGlobalStats: ()                        => _apiFetch("getGlobalStats", {}),

  // Setup stok
  saveDraftStok: (tokoId, items)            => _apiFetch("saveDraftStok",  { tokoId, items }),

  // Helper
  hitungRop,
  rataKeluarHarian,
  rekapPenggunaan,
  tglISO,
  unduhCSV,
  isDemoMode: () => _koneksi !== "live",
  statusKoneksi: () => _koneksi,
};

/* ── BANNER STATUS DATA ──────────────────────────────
 * Selalu jelas bagi pengguna kapan yang tampil adalah data contoh.
 */
function _tampilkanBanner(alasan) {
  const pasang = () => {
    if (document.getElementById("demo-mode-bar")) return;
    const bar = document.createElement("div");
    bar.id = "demo-mode-bar";
    bar.setAttribute("data-noterm", "");
    bar.style.cssText = [
      "position:fixed", "bottom:0", "left:0", "right:0", "z-index:9999",
      "background:#7c2d12", "color:#ffedd5", "font-family:sans-serif",
      "font-size:11px", "font-weight:600", "padding:6px 16px",
      "display:flex", "align-items:center", "gap:10px", "justify-content:center", "flex-wrap:wrap",
    ].join(";");
    const pesan = _koneksi === "demo"
      ? (SI_MODE === "poktan"
          ? "🧪 MODE PERAGAAN KELOMPOK TANI — menampilkan DATA CONTOH, Google Sheets kelompok tani belum disambungkan"
          : "🧪 MODE PERAGAAN — menampilkan DATA CONTOH, belum terhubung ke Google Sheets")
      : "⚠️ Google Sheets tidak dapat dihubungi — yang tampil adalah DATA CONTOH, bukan data asli";
    bar.innerHTML = `<span>${pesan}</span>` +
      (alasan ? `<span style="opacity:.6;font-weight:400">(${String(alasan).slice(0, 80)})</span>` : "") +
      `<button onclick="this.parentElement.remove()" style="margin-left:auto;background:none;border:none;color:inherit;cursor:pointer;font-size:14px">✕</button>`;
    document.body.appendChild(bar);
    // beri ruang agar banner tidak menutupi tombol di bagian bawah layar
    const pad = () => { document.body.style.paddingBottom = bar.isConnected ? bar.offsetHeight + "px" : ""; };
    pad(); window.addEventListener("resize", pad);
    bar.querySelector("button").addEventListener("click", () => setTimeout(pad, 0));
  };
  if (document.body) pasang();
  else document.addEventListener("DOMContentLoaded", pasang);
}

if (API_CONFIG.demoMode) _tampilkanBanner("");
