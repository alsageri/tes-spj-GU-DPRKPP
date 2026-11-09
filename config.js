// ==========================================
// PENGATURAN KONEKSI KE DATABASE (APPS SCRIPT)
// ==========================================

const CONFIG = {
    // ⚠️ GANTI URL DI BAWAH INI DENGAN URL DEPLOY APPS SCRIPT ANDA (Berakhiran /exec)
    APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbyC3t-n3a5LeAcR87gpPWsjnD-iS2kAPmiymEp5d3oYOlI9w6k50qKvIN2AmF3uIV-pNg/exec",
    
    // Pagu Anggaran (Bisa diubah sesuai kebutuhan)
    PAGU_TAHUNAN: 1500000000, 
    PAGU_TRIWULAN: 350000000
};

// ==========================================
// DATA AKUN LOGIN (VERIFIKATOR & PPTK)
// ==========================================
const DATABASE_AKUN = [
    { username: "admin", password: "123", role: "VERIFIKATOR", namaLengkap: "Alsageri Ilham Ramadhan" },
    { username: "putra", password: "123", role: "PPTK", namaLengkap: "PUTRA NURHIDAYAT, SE" },
    { username: "fikri", password: "123", role: "PPTK", namaLengkap: "KHOLISHUL FIKRI, SH" },
    { username: "rudi", password: "123", role: "PPTK", namaLengkap: "RUDI WIDIANTO, ST" },
    { username: "endang", password: "123", role: "PPTK", namaLengkap: "ENDANG PUJI HAPSARI, SE, M.Si" },
    { username: "gunadi", password: "123", role: "PPTK", namaLengkap: "GUNADI, SKM, M.Si" },
    { username: "nurhidayat", password: "123", role: "PPTK", namaLengkap: "MOHAMAD NURHIDAYAT, ST, MM" },
    { username: "may", password: "123", role: "PPTK", namaLengkap: "MAY HUDHA NUGROHO, SE, MM" }
];
