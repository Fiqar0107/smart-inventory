/**
 * ════════════════════════════════════════════════════════
 *  Smart Inventory UMKM Pangkep — Authentication Logic
 *  js/auth.js
 *
 *  Tanggung jawab:
 *  - Login / logout pengguna
 *  - Simpan & baca sesi dari sessionStorage
 *  - Guard: redirect jika belum login atau salah role
 *  - Helper UI: toast, redirect, tanggal
 * ════════════════════════════════════════════════════════
 */

/* ── KONFIGURASI ─────────────────────────────────────── */

// Ganti nilai ini setelah Apps Script di-deploy
const API_URL = "ISI_URL_APPS_SCRIPT_DISINI";

// Key untuk menyimpan data sesi di sessionStorage
const SESSION_KEY = "si_user";

// Peta role → halaman tujuan setelah login
const ROLE_PAGE = {
  pemilik:  "dashboard.html",
  karyawan: "karyawan.html",
  admin:    "admin.html",
  dinas:    "dinas.html",
};

// Akun demo (hanya aktif jika API_URL belum diisi)
const DEMO_ACCOUNTS = [
  { email: "pemilik@demo.com",  password: "demo123", role: "pemilik",  nama: "Pak Ahmad",         tokoId: "TOKO-001" },
  { email: "karyawan@demo.com", password: "demo123", role: "karyawan", nama: "Andi Karyawan",      tokoId: "TOKO-001" },
  { email: "admin@demo.com",    password: "demo123", role: "admin",    nama: "Dr. Budi Santoso",   tokoId: null       },
  { email: "dinas@demo.com",    password: "demo123", role: "dinas",    nama: "Kepala Bidang UMKM", tokoId: null       },
];

/* ── SESSION HELPERS ─────────────────────────────────── */

/**
 * Simpan data pengguna ke sessionStorage setelah login berhasil.
 * @param {object} user - { email, role, nama, tokoId }
 */
function saveSession(user) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    ...user,
    loginAt: new Date().toISOString(),
  }));
}

/**
 * Ambil data sesi saat ini.
 * @returns {object|null} data pengguna, atau null jika belum login
 */
function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Hapus sesi (logout).
 */
function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

/**
 * Cek apakah pengguna sudah login.
 * @returns {boolean}
 */
function isLoggedIn() {
  return getSession() !== null;
}

/* ── GUARD ───────────────────────────────────────────── */

/**
 * Panggil di awal setiap halaman yang butuh login.
 * Jika belum login → redirect ke index.html.
 * Jika role tidak sesuai → redirect ke halaman role yang benar.
 *
 * @param {string|string[]} allowedRoles - role yang boleh akses halaman ini
 *
 * Contoh pemakaian di dashboard.html:
 *   <script>requireAuth('pemilik');</script>
 *   atau untuk multi-role:
 *   <script>requireAuth(['pemilik', 'admin']);</script>
 */
function requireAuth(allowedRoles) {
  const user = getSession();

  // Belum login → ke halaman login
  if (!user) {
    window.location.replace("index.html");
    return;
  }

  // Normalkan ke array
  const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  // Role tidak sesuai → redirect ke halaman yang benar
  if (!allowed.includes(user.role)) {
    const target = ROLE_PAGE[user.role] || "index.html";
    window.location.replace(target);
  }
}

/* ── LOGIN ───────────────────────────────────────────── */

/**
 * Proses login. Coba ke API Apps Script dulu;
 * jika API belum dikonfigurasi, fallback ke akun demo.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{success, user?, message?}>}
 */
async function doLogin(email, password) {
  email    = email.trim().toLowerCase();
  password = password.trim();

  if (!email || !password) {
    return { success: false, message: "Email dan password wajib diisi." };
  }

  // — Mode API (Apps Script sudah dikonfigurasi) —
  if (API_URL && !API_URL.startsWith("ISI_URL")) {
    try {
      const res  = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email, password }),
      });
      const data = await res.json();

      if (data.success) {
        saveSession({ email, role: data.role, nama: data.nama, tokoId: data.tokoId });
        return { success: true, user: data };
      }
      return { success: false, message: data.msg || "Email atau password salah." };
    } catch (err) {
      // Network error → fallback ke demo agar tidak dead-lock
      console.warn("API tidak dapat dijangkau, mencoba akun demo...", err);
    }
  }

  // — Mode Demo (API belum dikonfigurasi atau tidak tersedia) —
  const found = DEMO_ACCOUNTS.find(
    a => a.email === email && a.password === password
  );

  if (found) {
    const user = { email: found.email, role: found.role, nama: found.nama, tokoId: found.tokoId };
    saveSession(user);
    return { success: true, user };
  }

  return { success: false, message: "Email atau password salah. Coba akun demo." };
}

/* ── LOGOUT ──────────────────────────────────────────── */

/**
 * Logout: hapus sesi dan kembali ke halaman login.
 * @param {boolean} confirm - tampilkan konfirmasi sebelum logout
 */
function logout(confirm = true) {
  if (confirm) {
    if (!window.confirm("Yakin ingin keluar dari akun?")) return;
  }
  clearSession();
  window.location.replace("index.html");
}

/* ── REGISTER (PENDAFTARAN TOKO BARU) ────────────────── */

/**
 * Kirim data pendaftaran toko baru ke Apps Script.
 * Jika API belum dikonfigurasi, simulasikan sukses.
 *
 * @param {object} data - { namaToko, namaPemilik, noHp, kecamatan, jenis, email, password }
 * @returns {Promise<{success, message?}>}
 */
async function registerToko(data) {
  const required = ["namaToko", "namaPemilik", "noHp", "kecamatan", "jenis", "email", "password"];
  for (const key of required) {
    if (!data[key] || !String(data[key]).trim()) {
      return { success: false, message: `Kolom "${key}" wajib diisi.` };
    }
  }
  if (data.password.length < 6) {
    return { success: false, message: "Password minimal 6 karakter." };
  }

  // — Mode API —
  if (API_URL && !API_URL.startsWith("ISI_URL")) {
    try {
      const res  = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "registerToko", ...data }),
      });
      const resp = await res.json();
      return resp.success
        ? { success: true }
        : { success: false, message: resp.msg || "Pendaftaran gagal." };
    } catch (err) {
      return { success: false, message: "Koneksi bermasalah. Coba lagi nanti." };
    }
  }

  // — Mode Demo: simulasi sukses —
  return { success: true };
}

/* ── UI HELPERS ──────────────────────────────────────── */

/**
 * Tampilkan toast notification di pojok kanan bawah.
 * @param {string} pesan   - teks yang ditampilkan
 * @param {'success'|'error'|'warning'|''} tipe
 * @param {number} durasi  - milidetik (default 3000)
 */
function showToast(pesan, tipe = "", durasi = 3000) {
  // Buat container jika belum ada
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const icons = { success: "✅", error: "❌", warning: "⚠️", "": "ℹ️" };
  const toast = document.createElement("div");
  toast.className = `toast${tipe ? " " + tipe : ""}`;
  toast.innerHTML = `<span>${icons[tipe] || "ℹ️"}</span><span>${pesan}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("out");
    toast.addEventListener("animationend", () => toast.remove(), { once: true });
  }, durasi);
}

/**
 * Isi label tanggal hari ini di elemen dengan id tertentu.
 * @param {string} elementId - default "today-date"
 */
function renderTodayDate(elementId = "today-date") {
  const el = document.getElementById(elementId);
  if (!el) return;
  const hariArr  = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
  const bulanArr = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
  const now = new Date();
  el.textContent = `${hariArr[now.getDay()]}, ${now.getDate()} ${bulanArr[now.getMonth()]} ${now.getFullYear()}`;
}

/**
 * Isi nama & info pengguna yang sedang login ke elemen-elemen UI.
 * Menargetkan elemen dengan data-auth="nama", data-auth="role", dll.
 */
function renderUserInfo() {
  const user = getSession();
  if (!user) return;

  document.querySelectorAll("[data-auth]").forEach(el => {
    const key = el.dataset.auth;
    if (user[key] !== undefined) el.textContent = user[key];
  });
}

/**
 * Toggle sidebar untuk tampilan mobile.
 * @param {string} sidebarId  - default "sidebar"
 * @param {string} overlayId  - default "sidebar-overlay"
 */
function toggleSidebar(sidebarId = "sidebar", overlayId = "sidebar-overlay") {
  const sb = document.getElementById(sidebarId);
  const ov = document.getElementById(overlayId);
  if (!sb) return;
  const isOpen = sb.classList.contains("open");
  sb.classList.toggle("open", !isOpen);
  if (ov) ov.classList.toggle("open", !isOpen);
}

/**
 * Highlight nav item yang aktif berdasarkan filename halaman saat ini.
 */
function highlightActiveNav() {
  const current = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-item[data-page]").forEach(el => {
    el.classList.toggle("active", el.dataset.page === current);
  });
}

/* ── INIT OTOMATIS ───────────────────────────────────── */

/**
 * Jalankan inisialisasi umum saat DOM siap.
 * Dipanggil oleh setiap halaman yang menyertakan auth.js.
 */
document.addEventListener("DOMContentLoaded", () => {
  renderTodayDate();
  renderUserInfo();
  highlightActiveNav();

  // Daftarkan tombol logout global (elemen dengan id="btn-logout" atau onclick="logout()")
  document.querySelectorAll("[data-logout]").forEach(el => {
    el.addEventListener("click", () => logout());
  });

  // Sidebar overlay — tutup sidebar saat klik overlay
  const overlay = document.getElementById("sidebar-overlay");
  if (overlay) {
    overlay.addEventListener("click", () => toggleSidebar());
  }

  // Mobile FAB — buka/tutup sidebar
  const fab = document.getElementById("mobile-fab");
  if (fab) {
    fab.addEventListener("click", () => toggleSidebar());
  }
});
