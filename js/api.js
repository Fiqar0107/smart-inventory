// ══ KONFIGURASI API ══
// PENTING: Ganti nilai di bawah ini dengan URL Web App dari Google Apps Script setelah di-deploy.
const API_URL = "https://script.google.com/macros/s/AKfycbxBVwfqCUx2LodQuRx1NCL63nKXfg_52jGnhkFJ85vlEPwYG6WlUgJ-fmc4Wg9zsrwslg/exec"; 

/**
 * Fungsi utama (helper) untuk mengirim data ke Google Sheets via Apps Script.
 * Secara otomatis membungkus action dan payload data ke dalam format JSON.
 */
async function apiCall(action, data = {}) {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      // Mode 'no-cors' terkadang diperlukan jika ada kendala CORS dari Google Script, 
      // namun untuk menerima respons JSON, Google Script biasanya menggunakan redirect.
      // Pastikan fetch berjalan normal tanpa tambahan mode jika Apps Script merespons JSON standar.
      headers: { 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({ action, ...data })
    });
    
    return await res.json();
  } catch (err) {
    console.error(`API Error pada action '${action}':`, err);
    return { success: false, msg: err.message };
  }
}

// ══ FUNGSI-FUNGSI API ══

/**
 * Melakukan proses login pengguna.
 */
async function login(email, password) {
  return apiCall("login", { 
    email: email, 
    password: password 
  });
}

/**
 * Mengambil daftar barang berdasarkan ID Toko.
 */
async function getBarang(tokoId) {
  return apiCall("getBarang", { 
    tokoId: tokoId 
  });
}

/**
 * Menyimpan transaksi baru (Masuk/Keluar).
 */
async function simpanTransaksi(tokoId, barangId, jenis, jumlah, ket) {
  return apiCall("simpanTransaksi", { 
    tokoId: tokoId, 
    barangId: barangId, 
    jenis: jenis, 
    jumlah: Number(jumlah), // Memastikan jumlah berupa angka
    ket: ket 
  });
}

/**
 * Mengambil data statistik untuk halaman dashboard berdasarkan ID Toko.
 */
async function getDashboard(tokoId) {
  return apiCall("getDashboard", { 
    tokoId: tokoId 
  });
}