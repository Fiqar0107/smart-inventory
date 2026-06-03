/**
 * ═══════════════════════════════════════════════════
 *  Smart Inventory UMKM Pangkep — API Layer
 *  js/api.js
 *
 *  Satu-satunya file yang berkomunikasi dengan
 *  Google Apps Script (backend) dan Google Sheets.
 *
 *  Cara pakai di setiap halaman:
 *    <script src="js/api.js"></script>
 *    const data = await API.getBarang(tokoId);
 * ═══════════════════════════════════════════════════
 */

/* ── KONFIGURASI ─────────────────────────────────── */
const API_CONFIG = {
  // Ganti setelah Apps Script di-deploy (Langkah 3 panduan)
  url: "ISI_URL_APPS_SCRIPT_DISINI",

  // Jika true → pakai data lokal (DEMO_DATA) tanpa panggil API
  // Otomatis aktif jika url belum diisi
  get demoMode() {
    return !this.url || this.url.startsWith("ISI_URL");
  },

  timeout: 10000, // 10 detik
};

/* ── DATA DEMO (sumber kebenaran tunggal) ────────── */
const DEMO_DATA = {
  pengguna: [
    { id:"USR-001", nama:"Pak Ahmad",          email:"pemilik@demo.com",  password:"demo123", role:"pemilik",  tokoId:"TOKO-001" },
    { id:"USR-002", nama:"Andi Karyawan",       email:"karyawan@demo.com", password:"demo123", role:"karyawan", tokoId:"TOKO-001" },
    { id:"USR-003", nama:"Sari Karyawan",       email:"sari@demo.com",     password:"demo123", role:"karyawan", tokoId:"TOKO-001" },
    { id:"USR-004", nama:"Bu Rahmawati",        email:"pemilik2@demo.com", password:"demo123", role:"pemilik",  tokoId:"TOKO-002" },
    { id:"USR-005", nama:"Budi Karyawan",       email:"budi@demo.com",     password:"demo123", role:"karyawan", tokoId:"TOKO-002" },
    { id:"USR-006", nama:"Dr. Budi Santoso",    email:"admin@demo.com",    password:"demo123", role:"admin",    tokoId:"" },
    { id:"USR-007", nama:"Kepala Bidang UMKM",  email:"dinas@demo.com",    password:"demo123", role:"dinas",    tokoId:"" },
  ],

  toko: [
    { id:"TOKO-001", nama:"Toko Berkah Jaya",      pemilik:"Pak Ahmad",      kecamatan:"Bungoro",    noHp:"081234567890", jenis:"Sembako",   status:"aktif" },
    { id:"TOKO-002", nama:"Warung Bu Rahmawati",   pemilik:"Bu Rahmawati",   kecamatan:"Pangkajene", noHp:"081298765432", jenis:"Kelontong", status:"aktif" },
    { id:"TOKO-003", nama:"UD Maju Bersama",       pemilik:"Pak Saleh",      kecamatan:"Minasatene", noHp:"081311223344", jenis:"Sembako",   status:"aktif" },
    { id:"TOKO-004", nama:"Toko Sumber Rezeki",    pemilik:"Bu Minarti",     kecamatan:"Labakkang",  noHp:"081355667788", jenis:"Kelontong", status:"aktif" },
    { id:"TOKO-005", nama:"Warung Pak Jumadi",     pemilik:"Pak Jumadi",     kecamatan:"Mandalle",   noHp:"081377889900", jenis:"Warung",    status:"aktif" },
  ],

  barang: [
    { id:"BRG-001", tokoId:"TOKO-001", nama:"Minyak Goreng Bimoli 1L",      sku:"MGB-001", stok:8,   satuan:"botol",   harga:15000, kategori:"sembako", eoq:45,  rop:20 },
    { id:"BRG-002", tokoId:"TOKO-001", nama:"Gula Pasir 1Kg",               sku:"GP-002",  stok:5,   satuan:"kg",      harga:14000, kategori:"sembako", eoq:30,  rop:15 },
    { id:"BRG-003", tokoId:"TOKO-001", nama:"Tepung Terigu Segitiga 1Kg",   sku:"TT-003",  stok:12,  satuan:"bungkus", harga:11000, kategori:"sembako", eoq:50,  rop:25 },
    { id:"BRG-004", tokoId:"TOKO-001", nama:"Beras Premium 5Kg",            sku:"BP-004",  stok:60,  satuan:"sak",     harga:65000, kategori:"sembako", eoq:100, rop:30 },
    { id:"BRG-005", tokoId:"TOKO-001", nama:"Sabun Mandi Lifebuoy",         sku:"SL-005",  stok:35,  satuan:"biji",    harga:4500,  kategori:"sabun",   eoq:60,  rop:20 },
    { id:"BRG-006", tokoId:"TOKO-001", nama:"Indomie Goreng",               sku:"IG-006",  stok:120, satuan:"biji",    harga:3000,  kategori:"sembako", eoq:200, rop:50 },
    { id:"BRG-007", tokoId:"TOKO-001", nama:"Indomie Kuah Ayam Bawang",     sku:"IA-007",  stok:85,  satuan:"biji",    harga:3000,  kategori:"sembako", eoq:180, rop:45 },
    { id:"BRG-008", tokoId:"TOKO-001", nama:"Aqua Gelas 240ml",             sku:"AQ-008",  stok:24,  satuan:"dus",     harga:18000, kategori:"minuman", eoq:40,  rop:15 },
    { id:"BRG-009", tokoId:"TOKO-001", nama:"Teh Botol Sosro 450ml",        sku:"TB-009",  stok:18,  satuan:"botol",   harga:6000,  kategori:"minuman", eoq:35,  rop:12 },
    { id:"BRG-010", tokoId:"TOKO-001", nama:"Kopi Kapal Api Sachet",        sku:"KA-010",  stok:3,   satuan:"renceng", harga:23000, kategori:"minuman", eoq:20,  rop:10 },
    { id:"BRG-011", tokoId:"TOKO-001", nama:"Shampo Sunsilk Sachet",        sku:"SS-011",  stok:2,   satuan:"renceng", harga:15000, kategori:"sabun",   eoq:18,  rop:8  },
    { id:"BRG-012", tokoId:"TOKO-001", nama:"Deterjen Rinso 1Kg",           sku:"DR-012",  stok:22,  satuan:"bungkus", harga:20000, kategori:"sabun",   eoq:40,  rop:15 },
    { id:"BRG-013", tokoId:"TOKO-001", nama:"Kecap Manis Bango 220ml",      sku:"KB-013",  stok:14,  satuan:"botol",   harga:10000, kategori:"bumbu",   eoq:25,  rop:10 },
    { id:"BRG-014", tokoId:"TOKO-001", nama:"Saus Sambal ABC",              sku:"SA-014",  stok:10,  satuan:"botol",   harga:8000,  kategori:"bumbu",   eoq:20,  rop:8  },
    { id:"BRG-015", tokoId:"TOKO-001", nama:"Rokok Gudang Garam Filter",    sku:"RG-015",  stok:45,  satuan:"bungkus", harga:25000, kategori:"rokok",   eoq:80,  rop:30 },
    { id:"BRG-016", tokoId:"TOKO-001", nama:"Biscuit Oreo",                 sku:"BO-016",  stok:30,  satuan:"bungkus", harga:6000,  kategori:"snack",   eoq:55,  rop:20 },
    { id:"BRG-017", tokoId:"TOKO-001", nama:"Wafer Tango Coklat",           sku:"WT-017",  stok:25,  satuan:"bungkus", harga:5000,  kategori:"snack",   eoq:45,  rop:18 },
    { id:"BRG-018", tokoId:"TOKO-001", nama:"Pasta Gigi Pepsodent",         sku:"PG-018",  stok:16,  satuan:"biji",    harga:10000, kategori:"sabun",   eoq:30,  rop:12 },
    { id:"BRG-019", tokoId:"TOKO-001", nama:"Telur Ayam",                   sku:"TE-019",  stok:50,  satuan:"butir",   harga:2500,  kategori:"sembako", eoq:120, rop:40 },
    { id:"BRG-020", tokoId:"TOKO-001", nama:"Garam Halus 500g",             sku:"GH-020",  stok:20,  satuan:"bungkus", harga:3000,  kategori:"bumbu",   eoq:35,  rop:14 },
    { id:"BRG-021", tokoId:"TOKO-002", nama:"Minyak Goreng Sania 2L",       sku:"MS-021",  stok:15,  satuan:"botol",   harga:28000, kategori:"sembako", eoq:35,  rop:12 },
    { id:"BRG-022", tokoId:"TOKO-002", nama:"Beras Medium 5Kg",             sku:"BM-022",  stok:30,  satuan:"sak",     harga:58000, kategori:"sembako", eoq:60,  rop:20 },
    { id:"BRG-023", tokoId:"TOKO-002", nama:"Gula Pasir 1Kg",               sku:"GP-023",  stok:8,   satuan:"kg",      harga:14000, kategori:"sembako", eoq:25,  rop:10 },
    { id:"BRG-024", tokoId:"TOKO-002", nama:"Sabun Cuci Piring Sunlight",   sku:"SC-024",  stok:20,  satuan:"botol",   harga:9000,  kategori:"sabun",   eoq:40,  rop:15 },
    { id:"BRG-025", tokoId:"TOKO-002", nama:"Susu Kental Manis Frisian",    sku:"SK-025",  stok:12,  satuan:"kaleng",  harga:11000, kategori:"minuman", eoq:22,  rop:8  },
  ],

  transaksi: [
    { id:"TX-0001", tokoId:"TOKO-001", barangId:"BRG-006", jenis:"masuk",  jumlah:120, tanggal:"2026-06-03", keterangan:"dari supplier" },
    { id:"TX-0002", tokoId:"TOKO-001", barangId:"BRG-001", jenis:"keluar", jumlah:5,   tanggal:"2026-06-03", keterangan:"terjual" },
    { id:"TX-0003", tokoId:"TOKO-001", barangId:"BRG-002", jenis:"keluar", jumlah:3,   tanggal:"2026-06-03", keterangan:"terjual" },
    { id:"TX-0004", tokoId:"TOKO-001", barangId:"BRG-019", jenis:"keluar", jumlah:10,  tanggal:"2026-06-03", keterangan:"penjualan pagi" },
    { id:"TX-0005", tokoId:"TOKO-001", barangId:"BRG-005", jenis:"masuk",  jumlah:60,  tanggal:"2026-06-02", keterangan:"restock mingguan" },
    { id:"TX-0006", tokoId:"TOKO-001", barangId:"BRG-015", jenis:"keluar", jumlah:8,   tanggal:"2026-06-02", keterangan:"terjual" },
    { id:"TX-0007", tokoId:"TOKO-001", barangId:"BRG-004", jenis:"masuk",  jumlah:100, tanggal:"2026-06-01", keterangan:"kiriman supplier" },
    { id:"TX-0008", tokoId:"TOKO-001", barangId:"BRG-016", jenis:"keluar", jumlah:5,   tanggal:"2026-06-01", keterangan:"terjual" },
    { id:"TX-0009", tokoId:"TOKO-001", barangId:"BRG-007", jenis:"keluar", jumlah:12,  tanggal:"2026-05-31", keterangan:"dijual ke pelanggan" },
    { id:"TX-0010", tokoId:"TOKO-001", barangId:"BRG-019", jenis:"masuk",  jumlah:120, tanggal:"2026-05-31", keterangan:"tambah stok" },
  ],

  notifikasi: [
    { id:"NOT-001", tokoId:"TOKO-001", pesan:"⚠️ STOK KRITIS: Minyak Goreng Bimoli 1L — sisa 8 botol, batas ROP = 20. Segera pesan 45 botol.", tipe:"kritis",    waktu:"2026-06-03 14:22" },
    { id:"NOT-002", tokoId:"TOKO-001", pesan:"⚠️ STOK KRITIS: Gula Pasir 1Kg — sisa 5 kg, batas ROP = 15. Segera pesan 30 kg.",                tipe:"kritis",    waktu:"2026-06-03 14:22" },
    { id:"NOT-003", tokoId:"TOKO-001", pesan:"⚠️ STOK KRITIS: Tepung Terigu 1Kg — sisa 12, batas ROP = 25. Segera pesan 50 bungkus.",          tipe:"kritis",    waktu:"2026-06-03 14:22" },
    { id:"NOT-004", tokoId:"TOKO-001", pesan:"📐 EOQ & ROP diperbarui otomatis untuk 20 jenis barang Toko Berkah Jaya.",                        tipe:"sistem",    waktu:"2026-06-03 00:01" },
    { id:"NOT-005", tokoId:"TOKO-001", pesan:"🟡 MENDEKATI ROP: Kopi Kapal Api Sachet — sisa 3 renceng, batas ROP = 10.",                      tipe:"perhatian", waktu:"2026-06-02 10:05" },
    { id:"NOT-006", tokoId:"TOKO-001", pesan:"⚠️ STOK KRITIS: Shampo Sunsilk Sachet — sisa 2 renceng, batas ROP = 8.",                         tipe:"kritis",    waktu:"2026-06-02 10:05" },
  ],

  log: [
    { id:"LOG-001", tipe:"error",   pesan:"Kalkulasi EOQ gagal: data transaksi kosong untuk BRG-024 (TOKO-002).", waktu:"2026-06-03 00:01" },
    { id:"LOG-002", tipe:"info",    pesan:"EOQ & ROP dihitung otomatis untuk TOKO-001: 20 barang berhasil.",      waktu:"2026-06-03 00:01" },
    { id:"LOG-003", tipe:"success", pesan:"Notifikasi WA terkirim ke 081234567890 (TOKO-001) — 3 barang kritis.", waktu:"2026-06-03 00:02" },
    { id:"LOG-004", tipe:"info",    pesan:"Login berhasil: pemilik@demo.com (TOKO-001) pukul 08:12.",             waktu:"2026-06-03 08:12" },
    { id:"LOG-005", tipe:"success", pesan:"Transaksi masuk: 120 biji Indomie Goreng oleh Andi Karyawan.",         waktu:"2026-06-03 09:30" },
    { id:"LOG-006", tipe:"error",   pesan:"Google Apps Script timeout TOKO-004 — retry gagal 3x.",                waktu:"2026-06-02 23:58" },
  ],

  pendaftaran: [
    { id:1, nama:"Toko Sinar Harapan",  pemilik:"Ibu Rahmawati", kec:"Bungoro",    tgl:"03/06/2026", status:"pending", hp:"0812-3456-7890", jenis:"Sembako",  barang:"~35 item" },
    { id:2, nama:"UD Berkah Mandiri",   pemilik:"Pak Saleh",     kec:"Pangkajene", tgl:"03/06/2026", status:"review",  hp:"0813-2222-3333", jenis:"Kelontong",barang:"~50 item" },
    { id:3, nama:"Toko Ibu Minarti",    pemilik:"Ibu Minarti",   kec:"Minasatene", tgl:"02/06/2026", status:"pending", hp:"0815-4444-5555", jenis:"Sembako",  barang:"~20 item" },
    { id:4, nama:"Warung Pak Jumadi",   pemilik:"Pak Jumadi",    kec:"Labakkang",  tgl:"01/06/2026", status:"review",  hp:"0817-6666-7777", jenis:"Warung",   barang:"~15 item" },
  ],
};

/* ── STATE RUNTIME (simulasi perubahan data) ─────── */
const _state = {
  barang:      JSON.parse(JSON.stringify(DEMO_DATA.barang)),
  transaksi:   JSON.parse(JSON.stringify(DEMO_DATA.transaksi)),
  pendaftaran: JSON.parse(JSON.stringify(DEMO_DATA.pendaftaran)),
};

/* ── CORE FETCH ──────────────────────────────────── */
async function _apiFetch(action, payload = {}) {
  if (API_CONFIG.demoMode) return _demoHandler(action, payload);
  try {
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), API_CONFIG.timeout);
    const res  = await fetch(API_CONFIG.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
      signal: ctrl.signal,
    });
    clearTimeout(tid);
    return await res.json();
  } catch (err) {
    console.warn("[API] Gagal, fallback demo mode:", err.message);
    return _demoHandler(action, payload);
  }
}

/* ── DEMO HANDLER ────────────────────────────────── */
function _demoHandler(action, payload) {
  const delay = ms => new Promise(r => setTimeout(r, ms));
  // semua handler mengembalikan Promise
  switch (action) {

    case "login": {
      const u = DEMO_DATA.pengguna.find(
        x => x.email === payload.email && x.password === payload.password
      );
      return u
        ? Promise.resolve({ success:true, role:u.role, nama:u.nama, tokoId:u.tokoId, userId:u.id })
        : Promise.resolve({ success:false, msg:"Email atau password salah." });
    }

    case "getBarang": {
      const list = _state.barang.filter(b =>
        payload.tokoId ? b.tokoId === payload.tokoId : true
      );
      return Promise.resolve({ success:true, data:list });
    }

    case "getToko": {
      const list = payload.tokoId
        ? DEMO_DATA.toko.filter(t => t.id === payload.tokoId)
        : DEMO_DATA.toko;
      return Promise.resolve({ success:true, data:list });
    }

    case "getTransaksi": {
      let list = _state.transaksi.filter(t =>
        payload.tokoId ? t.tokoId === payload.tokoId : true
      );
      if (payload.barangId) list = list.filter(t => t.barangId === payload.barangId);
      if (payload.limit)    list = list.slice(0, payload.limit);
      return Promise.resolve({ success:true, data:list });
    }

    case "getNotifikasi": {
      const list = DEMO_DATA.notifikasi.filter(n =>
        payload.tokoId ? n.tokoId === payload.tokoId : true
      );
      return Promise.resolve({ success:true, data:list });
    }

    case "getLog": {
      const list = DEMO_DATA.log.slice(0, payload.limit || 20);
      return Promise.resolve({ success:true, data:list });
    }

    case "getDashboard": {
      const barang   = _state.barang.filter(b => b.tokoId === payload.tokoId);
      const kritis   = barang.filter(b => b.stok <= b.rop).length;
      const tx       = _state.transaksi.filter(t => t.tokoId === payload.tokoId && t.tanggal === _today());
      const txMasuk  = tx.filter(t => t.jenis==="masuk").length;
      const txKeluar = tx.filter(t => t.jenis==="keluar").length;
      return Promise.resolve({ success:true, data:{ totalBarang:barang.length, stokKritis:kritis, txMasuk, txKeluar }});
    }

    case "simpanTransaksi": {
      return delay(400).then(() => {
        const { tokoId, barangId, jenis, jumlah, keterangan } = payload;
        const id = "TX-" + String(Date.now()).slice(-6);
        const tx = { id, tokoId, barangId, jenis, jumlah: Number(jumlah), tanggal: _today(), keterangan };
        _state.transaksi.unshift(tx);
        // update stok
        const idx = _state.barang.findIndex(b => b.id === barangId);
        if (idx >= 0) {
          _state.barang[idx].stok = jenis === "masuk"
            ? _state.barang[idx].stok + Number(jumlah)
            : Math.max(0, _state.barang[idx].stok - Number(jumlah));
        }
        return { success:true, msg:"Transaksi tersimpan.", txId: id };
      });
    }

    case "getPendaftaran": {
      return Promise.resolve({ success:true, data: _state.pendaftaran });
    }

    case "approveToko": {
      return delay(300).then(() => {
        _state.pendaftaran = _state.pendaftaran.filter(p => p.id !== payload.id);
        return { success:true, msg:"Toko disetujui." };
      });
    }

    case "rejectToko": {
      return delay(300).then(() => {
        _state.pendaftaran = _state.pendaftaran.filter(p => p.id !== payload.id);
        return { success:true, msg:"Pendaftaran ditolak." };
      });
    }

    case "saveEoqParams": {
      return delay(200).then(() => ({ success:true, msg:"Parameter EOQ disimpan." }));
    }

    case "registerToko": {
      return delay(600).then(() => ({ success:true, msg:"Pendaftaran diterima. Tunggu persetujuan admin." }));
    }

    case "getGlobalStats": {
      const semua = _state.barang;
      return Promise.resolve({ success:true, data:{
        totalToko: DEMO_DATA.toko.length,
        totalBarang: semua.length,
        totalTransaksi: _state.transaksi.length,
        itemKritis: semua.filter(b => b.stok <= b.rop).length,
        tokoList: DEMO_DATA.toko.map(t => ({
          ...t,
          jumlahBarang: semua.filter(b => b.tokoId===t.id).length,
          txBulanIni: _state.transaksi.filter(tx => tx.tokoId===t.id).length,
          itemKritis: semua.filter(b => b.tokoId===t.id && b.stok<=b.rop).length,
        })),
      }});
    }

    case "saveDraftStok": {
      return delay(300).then(() => {
        payload.items.forEach(item => {
          const existing = _state.barang.findIndex(b => b.id === item.id);
          if (existing >= 0) _state.barang[existing].stok = item.stok;
          else _state.barang.push({ ...item, tokoId: payload.tokoId, eoq:0, rop:0 });
        });
        return { success:true, msg:`${payload.items.length} barang disimpan.` };
      });
    }

    default:
      return Promise.resolve({ success:false, msg:`Action '${action}' tidak dikenal.` });
  }
}

function _today() {
  return new Date().toISOString().split("T")[0];
}

/* ── PUBLIC API ──────────────────────────────────── */
const API = {
  // Auth
  login:         (email, password)          => _apiFetch("login",            { email, password }),
  register:      (data)                     => _apiFetch("registerToko",      data),

  // Barang
  getBarang:     (tokoId)                   => _apiFetch("getBarang",         { tokoId }),

  // Toko
  getToko:       (tokoId)                   => _apiFetch("getToko",           { tokoId }),
  getAllToko:     ()                         => _apiFetch("getToko",           {}),

  // Transaksi
  getTransaksi:  (tokoId, limit=20)         => _apiFetch("getTransaksi",      { tokoId, limit }),
  simpanTransaksi: (tokoId,barangId,jenis,jumlah,ket) =>
                                               _apiFetch("simpanTransaksi",   { tokoId, barangId, jenis, jumlah, keterangan:ket }),

  // Dashboard
  getDashboard:  (tokoId)                   => _apiFetch("getDashboard",      { tokoId }),

  // Notifikasi
  getNotifikasi: (tokoId)                   => _apiFetch("getNotifikasi",     { tokoId }),

  // Admin
  getPendaftaran: ()                        => _apiFetch("getPendaftaran",    {}),
  approveToko:   (id, catatan)              => _apiFetch("approveToko",       { id, catatan }),
  rejectToko:    (id, catatan)              => _apiFetch("rejectToko",        { id, catatan }),
  saveEoqParams: (params)                   => _apiFetch("saveEoqParams",     params),
  getLog:        (limit=20)                 => _apiFetch("getLog",            { limit }),

  // Dinas
  getGlobalStats: ()                        => _apiFetch("getGlobalStats",    {}),

  // Setup stok
  saveDraftStok: (tokoId, items)            => _apiFetch("saveDraftStok",     { tokoId, items }),

  // Helper: apakah mode demo?
  isDemoMode: () => API_CONFIG.demoMode,
};

/* ── BANNER MODE DEMO ────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  if (!API_CONFIG.demoMode) return;
  const bar = document.createElement("div");
  bar.id = "demo-mode-bar";
  bar.style.cssText = [
    "position:fixed","bottom:0","left:0","right:0","z-index:9999",
    "background:#0f4a4a","color:#d0f5f5","font-family:sans-serif",
    "font-size:11px","font-weight:600","padding:6px 16px",
    "display:flex","align-items:center","gap:10px","justify-content:center",
  ].join(";");
  bar.innerHTML = `
    <span>🧪 MODE DEMO — data lokal, belum terhubung ke Google Sheets</span>
    <span style="opacity:.5">|</span>
    <span>Isi <code style="background:rgba(255,255,255,.1);padding:1px 6px;border-radius:3px">API_CONFIG.url</code> di js/api.js untuk mengaktifkan koneksi nyata</span>
    <button onclick="this.parentElement.remove()" style="margin-left:auto;background:none;border:none;color:inherit;cursor:pointer;font-size:14px">✕</button>`;
  document.body.appendChild(bar);
});
