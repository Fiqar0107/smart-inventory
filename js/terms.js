/**
 * ════════════════════════════════════════════════════════
 *  Smart Inventory Desa — Mode Pengguna & Istilah
 *  js/terms.js
 *
 *  Website punya dua mode tampilan:
 *    - "umkm"   : toko / warung (istilah asli: Pemilik Toko, Karyawan)
 *    - "poktan" : kelompok tani (Ketua Kelompok, Petugas Pencatat)
 *
 *  Mode dipilih di halaman masuk (index.html) dan disimpan di
 *  localStorage. File ini HARUS dimuat paling awal di <head>,
 *  sebelum auth.js dan api.js, karena api.js memilih data contoh
 *  berdasarkan mode.
 *
 *  Nilai role internal (pemilik, karyawan, admin, dinas) dan ID
 *  (TOKO-001, dst.) TIDAK diubah, supaya Apps Script & Google
 *  Sheets tetap bekerja tanpa deploy ulang. Yang diganti hanya
 *  teks yang tampil di layar.
 * ════════════════════════════════════════════════════════
 */
(function () {
  const KEY = "si_mode";
  const MODES = ["umkm", "poktan"];

  function readMode() {
    try {
      const m = localStorage.getItem(KEY);
      return MODES.includes(m) ? m : "umkm";
    } catch (e) {
      return "umkm";
    }
  }

  const MODE = readMode();
  document.documentElement.setAttribute("data-mode", MODE);

  /* Label per mode — dipakai langsung oleh kode halaman */
  const LABEL = {
    umkm: {
      nama: "UMKM",
      unit: "Toko",
      unitKecil: "toko",
      pengelola: "Pemilik Toko",
      pencatat: "Karyawan",
      pemantau: "Pemantau",
      ikonUnit: "🏪",
      keluar: "terjual",
      contohMasuk: "cth: dari penyalur/grosir",
      contohKeluar: "cth: terjual ke pelanggan",
    },
    poktan: {
      nama: "Kelompok Tani",
      unit: "Kelompok",
      unitKecil: "kelompok",
      pengelola: "Ketua Kelompok",
      pencatat: "Petugas Pencatat",
      pemantau: "Pemantau",
      ikonUnit: "🌾",
      keluar: "disalurkan ke anggota",
      contohMasuk: "cth: dari kios pupuk lengkap",
      contohKeluar: "cth: disalurkan ke anggota",
    },
  };

  /*
   * Aturan penggantian teks untuk mode kelompok tani.
   * Urutan penting: frasa panjang dulu, lalu kata tunggal.
   * (?<![@\w.]) dan (?![@\w-]) menjaga agar email (pemilik@demo.com)
   * dan ID (TOKO-001) tidak ikut berubah.
   */
  const B = "(?<![@\\w.])";
  const A = "(?![@\\w-])";
  const R = (s, flags = "g") => new RegExp(B + s + A, flags);

  const RULES = {
    umkm: [],
    poktan: [
      [R("Pemilik Toko"), "Ketua Kelompok"],
      [R("pemilik toko"), "ketua kelompok"],
      [R("Nama Pemilik"), "Nama Ketua"],
      [R("Pemilik"), "Ketua"],
      [R("pemilik"), "ketua"],
      [R("PEMILIK"), "KETUA"],
      [R("Karyawan"), "Petugas Pencatat"],
      [R("karyawan"), "petugas pencatat"],
      [R("KARYAWAN"), "PETUGAS PENCATAT"],
      [R("Toko"), "Kelompok"],
      [R("toko"), "kelompok"],
      [R("TOKO"), "KELOMPOK"],
      [R("UMKM"), "Kelompok Tani"],
      [R("Jenis Usaha"), "Komoditas Utama"],
      [R("Penjualan"), "Penyaluran"],
      [R("penjualan"), "penyaluran"],
      [R("terjual"), "disalurkan"],
      [R("Terjual"), "Disalurkan"],
      [R("pelanggan"), "anggota"],
      [R("Supplier"), "Penyalur"],
      [R("supplier"), "penyalur"],
    ],
  };

  const rules = RULES[MODE];

  function convert(str) {
    if (!str || !rules.length) return str;
    let out = str;
    for (const [re, rep] of rules) out = out.replace(re, rep);
    return out;
  }

  const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "CODE", "NOSCRIPT"]);
  const ATTRS = ["placeholder", "title", "aria-label"];

  function walk(node) {
    if (!rules.length || !node) return;
    if (node.nodeType === 3) {
      const p = node.parentNode;
      if (!p || SKIP.has(p.nodeName) || (p.closest && p.closest("[data-noterm]"))) return;
      const v = convert(node.nodeValue);
      if (v !== node.nodeValue) node.nodeValue = v;
      return;
    }
    if (node.nodeType !== 1 || SKIP.has(node.nodeName) || node.hasAttribute("data-noterm")) return;
    for (const a of ATTRS) {
      if (node.hasAttribute(a)) {
        const old = node.getAttribute(a);
        const v = convert(old);
        if (v !== old) node.setAttribute(a, v);
      }
    }
    for (const c of Array.from(node.childNodes)) walk(c);
  }

  // Sembunyikan halaman sebentar di mode poktan agar istilah lama tidak "berkedip"
  if (rules.length) {
    const st = document.createElement("style");
    st.id = "si-mode-cloak";
    st.textContent = "body{visibility:hidden}";
    document.head.appendChild(st);
  }

  // Tampilkan/sembunyikan elemen khusus mode: data-only="umkm" / data-only="poktan"
  const st2 = document.createElement("style");
  st2.textContent =
    'html[data-mode="umkm"] [data-only="poktan"]{display:none!important}' +
    'html[data-mode="poktan"] [data-only="umkm"]{display:none!important}';
  document.head.appendChild(st2);

  function applyAll() {
    document.title = convert(document.title);
    walk(document.body);
    const cloak = document.getElementById("si-mode-cloak");
    if (cloak) cloak.remove();
  }

  document.addEventListener("DOMContentLoaded", () => {
    applyAll();
    if (!rules.length) return;
    // Konten yang dirender belakangan oleh JavaScript ikut dikonversi
    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === "characterData") walk(m.target);
        else m.addedNodes.forEach((nd) => walk(nd));
      }
    });
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });
  });
  // Jaring pengaman: kalau ada error JS, halaman tetap tampil
  setTimeout(() => { const c = document.getElementById("si-mode-cloak"); if (c) c.remove(); }, 1500);

  window.SI = {
    mode: MODE,
    L: LABEL[MODE],
    t: convert,
    setMode(m) {
      if (!MODES.includes(m)) return;
      try { localStorage.setItem(KEY, m); } catch (e) {}
      // Tiap mode punya Google Sheets sendiri → akun tidak terbawa antar-mode
      const diIndex = /(^|\/)(index\.html)?$/.test(location.pathname);
      if (m !== MODE && !diIndex) {
        try { sessionStorage.removeItem("si_user"); } catch (e) {}
        location.href = "index.html";
      } else {
        location.reload();
      }
    },
  };
})();
