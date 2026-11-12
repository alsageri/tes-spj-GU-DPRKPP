// ========================================================
// FILE: app.js (Sistem Logika Utama Terintegrasi Spreadsheet)
// ========================================================

let spjData = []; let referensiData = {}; 
let activeSelectedId = null; let pendingStatusChange = null;
let sesiAktif = { role: "", username: "", namaLengkap: "" };
let isEditMode = false; let editIdTarget = null;
let currentPage = 1; let rowsPerPage = 10;
let filterJenis = 'ALL'; 

let editIndexAkun = -1; let editIndexPptk = -1;
let paguEditType = null; 

// FUNGSI HELPER: UPDATE SAPAAN WAKTU
function updateSapaanWaktu() {
    const jam = new Date().getHours();
    let sapaan = 'Selamat Pagi';
    
    if (jam >= 3 && jam < 11) sapaan = 'Selamat Pagi';
    else if (jam >= 11 && jam < 15) sapaan = 'Selamat Siang';
    else if (jam >= 15 && jam < 18) sapaan = 'Selamat Sore';
    else sapaan = 'Selamat Malam';

    const loginSapaan = document.getElementById('sapaan-login');
    if (loginSapaan) loginSapaan.innerHTML = `${sapaan} `;
    
    const headerSapaan = document.getElementById('sapaan-header');
    if (headerSapaan) headerSapaan.innerText = sapaan;
}

// FUNGSI HELPER: FORMAT TANGGAL JADI HARI/BULAN/TAHUN (DD/MM/YYYY)
function formatTanggalIndo(dateStr) {
    if (!dateStr || dateStr === '-') return '-';
    
    // Jika format mengandung 'T' (misal: 2026-11-14T00:00:00.000Z)
    if (dateStr.includes('T')) {
        let rawDate = dateStr.split('T')[0];
        let parts = rawDate.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    
    // Jika format murni YYYY-MM-DD (misal: 2026-11-14)
    if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    
    // Jika format sudah DD/MM/YYYY (misal dari input manual sebelumnya)
    if (dateStr.includes('/')) {
       return dateStr;
    }

    return dateStr;
}

// 1. TARIK DATA DARI SPREADSHEET SAAT APLIKASI DIBUKA
function inisialisasiServer() {
    updateSapaanWaktu();
    const btnLogin = document.querySelector('button[onclick="checkLogin()"]');
    if(btnLogin) { btnLogin.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i> Menghubungkan ke Database...'; btnLogin.disabled = true; }
    
    fetch(CONFIG.APPS_SCRIPT_URL)
        .then(res => res.json())
        .then(data => {
            if (data.status !== 'error') {
                window.DATABASE_AKUN = data.akun || [];
                if(data.pagu) {
                    window.CONFIG = window.CONFIG || {};
                    window.CONFIG.PAGU_TAHUNAN = data.pagu.tahunan || 0;
                    window.CONFIG.PAGU_TRIWULAN = data.pagu.triwulan || 0;
                }
                if(data.spj) spjData = data.spj.reverse(); 
                if(data.referensi) referensiData = data.referensi;
                
                if(btnLogin) { btnLogin.innerHTML = 'Masuk Ke Sistem <i class="fa-solid fa-arrow-right-long"></i>'; btnLogin.disabled = false; }
            } else { alert("Error dari Server: " + data.message); }
        })
        .catch(e => {
            if(btnLogin) { btnLogin.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Gagal Koneksi ke Database. Refresh (F5)'; }
        });
}
inisialisasiServer();

function checkLogin() {
    try {
        if (!window.DATABASE_AKUN || window.DATABASE_AKUN.length === 0) { alert("Data akun masih kosong atau sedang dimuat dari server."); return; }
        
        const uname = document.getElementById('username-input').value.trim().toLowerCase();
        const pass = document.getElementById('password-input').value;
        const userFound = window.DATABASE_AKUN.find(u => u.username === uname && u.password === pass);
        
        if (userFound) { 
            sesiAktif = { role: userFound.role, username: userFound.username, namaLengkap: userFound.namaLengkap };
            masukSistem(); 
        } else { 
            document.getElementById('pin-error').innerText = "Username atau Password salah!";
            document.getElementById('pin-error').classList.remove('hidden'); 
        }
    } catch (error) { alert("Error Login: " + error.message); }
}

function togglePassword() {
    const passwordInput = document.getElementById('password-input'); const eyeIcon = document.getElementById('eye-icon');
    if (!passwordInput || !eyeIcon) return;
    if (passwordInput.type === 'password') { passwordInput.type = 'text'; eyeIcon.classList.replace('fa-eye', 'fa-eye-slash'); } 
    else { passwordInput.type = 'password'; eyeIcon.classList.replace('fa-eye-slash', 'fa-eye'); }
}

function toggleProfileMenu() {
    const dd = document.getElementById('profileDropdown');
    if(dd.classList.contains('hidden')) { dd.classList.remove('hidden'); } else { dd.classList.add('hidden'); }
}

document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('profileDropdown'); if (!dropdown) return;
    const profileBtn = dropdown.previousElementSibling;
    if (!dropdown.contains(event.target) && !profileBtn.contains(event.target)) { dropdown.classList.add('hidden'); }
});

function masukSistem() {
    // TAMBAHAN: Simpan Sesi di Browser
    sessionStorage.setItem('sesiAktif_role', sesiAktif.role);
    sessionStorage.setItem('sesiAktif_username', sesiAktif.username);
    sessionStorage.setItem('sesiAktif_namaLengkap', sesiAktif.namaLengkap);

    document.getElementById('login-screen').style.display = 'none'; 
    document.getElementById('main-app').style.display = 'flex';
    updateSapaanWaktu();
    
    document.getElementById('role-badge').innerText = sesiAktif.role; 
    document.getElementById('user-display').innerText = sesiAktif.namaLengkap;
    const jabatanHeader = document.getElementById('jabatan-header-text'); if(jabatanHeader) jabatanHeader.innerText = sesiAktif.role; 
    const ddNama = document.getElementById('dd-nama'); if(ddNama) ddNama.innerText = sesiAktif.namaLengkap;
    const ddRole = document.getElementById('dd-role'); if(ddRole) ddRole.innerText = sesiAktif.role;

    const sidebarSuperAdmin = document.getElementById('sidebarSuperAdmin');
    if (sesiAktif.role === 'SUPER_ADMIN') {
        if(sidebarSuperAdmin) { sidebarSuperAdmin.classList.remove('hidden'); sidebarSuperAdmin.classList.add('flex'); }
        document.querySelectorAll('.btn-edit-pagu').forEach(btn => btn.style.display = 'block');
    } else {
        if(sidebarSuperAdmin) { sidebarSuperAdmin.classList.add('hidden'); sidebarSuperAdmin.classList.remove('flex'); }
    }
    
    isiDropdownPptkUtama(); renderTabelSpj(); hitungAnggaran(); isiDropdownProgram();
}

// TAMBAHAN: Eksekusi Otomatis Cek Sesi Saat Halaman Di-Refresh
document.addEventListener('DOMContentLoaded', () => {
    const savedRole = sessionStorage.getItem('sesiAktif_role');
    const savedName = sessionStorage.getItem('sesiAktif_namaLengkap');
    
    if (savedRole && savedName) {
        // 1. TAMPILKAN LAYAR LOADING & SEMBUNYIKAN LOGIN SCREEN
        const loader = document.getElementById('global-loader');
        if (loader) { loader.classList.remove('hidden'); loader.classList.add('flex'); }
        document.getElementById('login-screen').style.display = 'none';

        sesiAktif = { 
            role: savedRole, 
            username: sessionStorage.getItem('sesiAktif_username'), 
            namaLengkap: savedName 
        };
        
        // 2. Menunggu data ditarik dari Google Sheets, baru masuk ke sistem
        tarikDataDariServer().then(() => {
            masukSistem();
            
            // 3. TUTUP LAYAR LOADING SETELAH SELESAI
            if (loader) { loader.classList.remove('flex'); loader.classList.add('hidden'); }
        });
    }
});

function isiDropdownPptkUtama() {
    const selectPptk = document.getElementById('inputPptk');
    if(selectPptk && window.DATABASE_AKUN) {
        selectPptk.innerHTML = '<option value="" disabled selected>-- Pilih Nama PPTK --</option>';
        window.DATABASE_AKUN.forEach(user => { if(user.role === 'PPTK') { selectPptk.innerHTML += `<option value="${user.namaLengkap}">${user.namaLengkap}</option>`; } });
    }
}

// Menggunakan Promise agar bisa di-await
function tarikDataDariServer() {
    document.getElementById('refresh-icon').classList.add('animate-spin');
    return fetch(CONFIG.APPS_SCRIPT_URL)
        .then(res => res.json())
        .then(data => {
            if (data.status === 'error') { alert("Gagal mengambil data dari Google Sheets."); return; }
            if(data.akun) window.DATABASE_AKUN = data.akun;
            if(data.pagu) { window.CONFIG.PAGU_TAHUNAN = data.pagu.tahunan; window.CONFIG.PAGU_TRIWULAN = data.pagu.triwulan; }
            if(data.spj) spjData = data.spj.reverse(); 
            if(data.referensi) referensiData = data.referensi;
            renderTabelSpj(); hitungAnggaran(); isiDropdownProgram();
            const tbAkun = document.getElementById('tabelAkunBody'); if(tbAkun && tbAkun.innerHTML !== '') renderTabelAkunAdmin();
        })
        .catch(e => console.error(e))
        .finally(() => { document.getElementById('refresh-icon').classList.remove('animate-spin'); });
}

function formatRupiah(amount) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount); }

function hitungAnggaran() {
    let totalPencairan = 0;
    spjData.forEach(item => { if(item.status === 'SUDAH DIPINDAHBUKUKAN') totalPencairan += Number(item.nominal) || 0; });
    document.getElementById('sisaTahunanVal').innerText = formatRupiah((CONFIG.PAGU_TAHUNAN || 0) - totalPencairan);
    document.getElementById('sisaTriwulanVal').innerText = formatRupiah((CONFIG.PAGU_TRIWULAN || 0) - totalPencairan);
    document.getElementById('totalCairVal').innerText = formatRupiah(totalPencairan);
}

function bukaModalEditPagu(jenis) {
    paguEditType = jenis; document.getElementById('titleEditPagu').innerText = `Edit Pagu ${jenis === 'TAHUNAN' ? 'Tahunan' : 'Triwulan'}`;
    document.getElementById('inputEditPagu').value = jenis === 'TAHUNAN' ? CONFIG.PAGU_TAHUNAN : CONFIG.PAGU_TRIWULAN;
    openModal('modalEditPagu');
}

function simpanPaguBaru() {
    const val = Number(document.getElementById('inputEditPagu').value);
    if(val < 0) { alert('Nominal tidak boleh minus!'); return; }
    if (paguEditType === 'TAHUNAN') CONFIG.PAGU_TAHUNAN = val; else CONFIG.PAGU_TRIWULAN = val;
    fetch(CONFIG.APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'sync_pagu', paguTahunan: CONFIG.PAGU_TAHUNAN, paguTriwulan: CONFIG.PAGU_TRIWULAN }) }).catch(e => console.error(e));
    hitungAnggaran(); closeModal('modalEditPagu'); showToast('Pagu tersinkronisasi ke server.');
}

function bukaFormSpjBaru() { isEditMode = false; editIdTarget = null; openModal('modalNewSpj'); }

function isiDropdownProgram() {
    const progSelect = document.getElementById('inputProgram'); if(!progSelect) return;
    progSelect.innerHTML = '<option value="" disabled selected>-- Pilih Program --</option>';
    for (let prog in referensiData) progSelect.innerHTML += `<option value="${prog}">${prog}</option>`;
}
function updateKegiatanDropdown() {
    const prog = document.getElementById('inputProgram').value; const kegSelect = document.getElementById('inputKegiatan'); const subSelect = document.getElementById('inputSubkegiatan');
    kegSelect.innerHTML = '<option value="" disabled selected>-- Pilih Kegiatan --</option>'; subSelect.innerHTML = '<option value="" disabled selected>-- Pilih Subkegiatan --</option>';
    if(prog && referensiData[prog]) for (let keg in referensiData[prog]) kegSelect.innerHTML += `<option value="${keg}">${keg}</option>`;
}
function updateSubkegiatanDropdown() {
    const prog = document.getElementById('inputProgram').value; const keg = document.getElementById('inputKegiatan').value; const subSelect = document.getElementById('inputSubkegiatan');
    subSelect.innerHTML = '<option value="" disabled selected>-- Pilih Subkegiatan --</option>';
    if(prog && keg && referensiData[prog][keg]) referensiData[prog][keg].forEach(sub => subSelect.innerHTML += `<option value="${sub}">${sub}</option>`);
}

function setJenisTampilan(jenis) {
    filterJenis = jenis; currentPage = 1;
    document.querySelectorAll('.menu-item').forEach(el => {
        el.classList.remove('bg-emerald-50', 'text-emerald-700', 'border-emerald-100', 'active-menu', 'font-bold');
        el.classList.add('text-slate-600', 'hover:bg-slate-50', 'hover:text-emerald-600', 'font-medium', 'border-transparent');
        const icon = el.querySelector('.menu-icon'); if(icon) icon.classList.replace('text-emerald-500', 'text-slate-400');
        const dot = el.querySelector('.indicator-dot'); if(dot) dot.remove();
    });
    const activeEl = document.getElementById('menu-' + jenis.toLowerCase());
    if (activeEl) {
        activeEl.classList.remove('text-slate-600', 'hover:bg-slate-50', 'hover:text-emerald-600', 'font-medium', 'border-transparent');
        activeEl.classList.add('bg-emerald-50', 'text-emerald-700', 'border-emerald-100', 'active-menu', 'font-bold');
        const icon = activeEl.querySelector('.menu-icon'); if(icon) icon.classList.replace('text-slate-400', 'text-emerald-500');
        if (!activeEl.querySelector('.indicator-dot')) { const dot = document.createElement('div'); dot.className = 'w-1.5 h-1.5 bg-emerald-500 rounded-full indicator-dot'; activeEl.appendChild(dot); }
    }
    
    const title = document.getElementById('page-title'); 
    const breadcrumb = document.getElementById('breadcrumb-text'); 
    const tbTitle = document.getElementById('tabel-judul-jenis');
    
    if (jenis === 'ALL') { 
        if(title) title.innerText = 'Dashboard Utama'; 
        if(breadcrumb) breadcrumb.innerText = 'Dashboard Semua'; 
        if(tbTitle) tbTitle.innerText = 'GU & LS'; 
    } else if (jenis === 'GU') { 
        if(title) title.innerText = 'Data SPJ Ganti Uang (GU)'; 
        if(breadcrumb) breadcrumb.innerText = 'Data SPJ GU'; 
        if(tbTitle) tbTitle.innerText = 'Ganti Uang (GU)'; 
    } else if (jenis === 'LS') { 
        if(title) title.innerText = 'Data SPJ Langsung (LS)'; 
        if(breadcrumb) breadcrumb.innerText = 'Data SPJ LS'; 
        if(tbTitle) tbTitle.innerText = 'Langsung (LS)'; 
    }
    
    const thJenis = document.getElementById('th-jenis'); 
    if (jenis === 'ALL') { if(thJenis) thJenis.style.display = 'table-cell'; } 
    else { if(thJenis) thJenis.style.display = 'none'; }
    
    renderTabelSpj();
}

function ubahLabelNpdKontrak() {
    const jenis = document.getElementById('inputJenisSurat').value; 
    const labelNpd = document.getElementById('label-npd-kontrak'); 
    const inputNpd = document.getElementById('inputNpd');
    
    const labelUraian = document.getElementById('label-uraian');
    const boxCv = document.getElementById('box-cv');
    const boxTahap = document.getElementById('box-tahap');
    
    if (jenis === 'LS') { 
        if(labelNpd) labelNpd.innerText = 'Nomor Kontrak / SPK'; 
        if(inputNpd) inputNpd.placeholder = 'Cth: 027/01/SPK/2026'; 
        if(labelUraian) labelUraian.innerHTML = 'Nama Pekerjaan <span class="text-red-500">*</span>';
        if(boxCv) boxCv.classList.remove('hidden');
        if(boxTahap) boxTahap.classList.remove('hidden');
    } else { 
        if(labelNpd) labelNpd.innerText = 'Nomor NPD'; 
        if(inputNpd) inputNpd.placeholder = 'Cth: 001/NPD/2026'; 
        if(labelUraian) labelUraian.innerHTML = 'Uraian / Deskripsi SPJ <span class="text-red-500">*</span>';
        if(boxCv) boxCv.classList.add('hidden');
        if(boxTahap) boxTahap.classList.add('hidden');
    }
}

function kirimPengajuanSpjBaru(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSubmitNew'); btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i> Menyimpan...'; btn.disabled = true;
    
    const rawDate = document.getElementById('inputTanggal').value; 
    let generatedId = "";
    if (!isEditMode) {
        const now = new Date();
        generatedId = `SPJ-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`; 
    }
    const idSistem = isEditMode ? editIdTarget : generatedId; 
    const actionType = isEditMode ? 'update_data_teks' : 'create';

    const inputCv = document.getElementById('inputCv');
    const inputTahap = document.getElementById('inputTahap');

    const payload = {
        action: actionType, id: idSistem, createdAt: rawDate, username: sesiAktif.namaLengkap,
        jenisSurat: document.getElementById('inputJenisSurat').value, pptk: document.getElementById('inputPptk').value, emailPptk: document.getElementById('inputEmail').value, 
        unitKerja: document.getElementById('inputUnitKerja').value, npd: document.getElementById('inputNpd').value, 
        program: document.getElementById('inputProgram').value, kegiatan: document.getElementById('inputKegiatan').value, 
        subKegiatan: document.getElementById('inputSubkegiatan').value, nominal: document.getElementById('inputNominal').value, 
        uraian: document.getElementById('inputUraian').value, wa: document.getElementById('inputWa').value,
        namaCv: inputCv ? inputCv.value : "",
        tahap: inputTahap ? inputTahap.value : "",
        status: 'BELUM_DIPROSES'
    };

    fetch(CONFIG.APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) })
        .then(res => res.json())
        .then(res => {
            if(res.status === 'success') {
                document.getElementById('formNewSpj').classList.add('hidden'); 
                
                // === REFRESH TABEL OTOMATIS DI SINI ===
                tarikDataDariServer(); 

                if (isEditMode) {
                    const divSukses = document.createElement('div'); divSukses.id = "pesanSuksesDiv"; divSukses.className = "text-center py-6 space-y-4";
                    divSukses.innerHTML = `<div class="text-5xl text-emerald-500 mb-2"><i class="fa-solid fa-circle-check"></i></div><h3 class="text-lg font-bold text-slate-800">Perbaikan Data Berhasil!</h3><button onclick="closeModal('modalNewSpj');" class="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md">Tutup</button>`;
                    document.getElementById('formNewSpj').parentElement.appendChild(divSukses);
                } else {
                    
                    // === PERSIAPAN LINK FORM OTOMATIS (GU & LS) ===
                    const formUrlGU = `https://docs.google.com/forms/d/e/1FAIpQLSfCvsVCiHDjMtDos9giKhhljCFlfXuWNbC5wgP_IXsmBGyqPw/viewform?usp=pp_url&entry.1525941067=${idSistem}`;
                    const formUrlLS = `https://docs.google.com/forms/d/e/1FAIpQLSen-_GnKkn-ye7qZKdmV8wlGf7PnXnZ7yZHhDGo8aseu0RW_g/viewform?usp=pp_url&entry.1525941067=${idSistem}`;

                    const divSukses = document.createElement('div'); divSukses.id = "pesanSuksesDiv"; divSukses.className = "text-center py-4 space-y-4";
                    
                    if (payload.jenisSurat === 'LS') {
                        const jumlahLSSaatIni = spjData.filter(item => String(item.jenisSurat) === 'LS').length;
                        const noUrut = 'LS-' + String(jumlahLSSaatIni + 1).padStart(4, '0');
                        const safeNpd = payload.npd.replace(/'/g, "\\'").replace(/"/g, "&quot;");
                        
                        divSukses.innerHTML = `
                            <div class="text-4xl text-purple-500 mb-2"><i class="fa-solid fa-file-invoice"></i></div><h3 class="text-lg font-bold text-slate-800">Pengajuan LS Berhasil Disimpan!</h3>
                            <div class="bg-purple-50 border border-purple-200 p-4 rounded-lg my-4 text-center mx-auto max-w-sm"><p class="text-xs text-purple-600 font-bold mb-1">NOMOR URUT / ANTREAN LS ANDA</p><h2 class="text-3xl font-black text-purple-800 tracking-widest">${noUrut}</h2></div>
                            <p class="text-sm text-slate-600 mb-4 font-medium">Harap Lanjut Klik Tombol Upload Berkas: Kwitansi & Berkas Pencairan.</p>
                            <a href="${formUrlLS}" target="_blank" onclick="closeModal('modalNewSpj');" class="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md mb-3"><i class="fa-solid fa-cloud-arrow-up me-2"></i> Lanjut Upload Berkas LS</a><br>
                            <button onclick="cetakNomorUrut('${noUrut}', '${safeNpd}', '${payload.createdAt}')" class="text-xs text-slate-500 hover:text-slate-800 underline font-bold transition-colors"><i class="fa-solid fa-print"></i> Unduh / Cetak Bukti Antrean LS</button>
                        `;
                    } else {
                        divSukses.innerHTML = `
                            <div class="text-5xl text-emerald-500 mb-2"><i class="fa-solid fa-circle-check"></i></div><h3 class="text-lg font-bold text-slate-800">Data Pengajuan Berhasil Disimpan!</h3>
                            <p class="text-sm text-slate-600 mb-4 bg-amber-50 border border-amber-200 p-3 rounded text-left"><strong>PENTING:</strong> Pengajuan belum selesai. Lanjut klik tombol di bawah untuk Upload Berkas Keuangan & SPJ GU.</p>
                            <a href="${formUrlGU}" target="_blank" onclick="closeModal('modalNewSpj');" class="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md"><i class="fa-solid fa-cloud-arrow-up me-2"></i> Lanjut Upload Berkas GU</a>`;
                    }
                    document.getElementById('formNewSpj').parentElement.appendChild(divSukses);
                }
            } else { alert("GAGAL MENYIMPAN!\n" + res.message); }
        })
        .catch(err => alert("KONEKSI TERPUTUS!\nError: " + err.message))
        .finally(() => { 
            // Teks tombol dikembalikan ke tulisan "Lanjut ke Form Upload" agar sesuai dengan UI
            btn.innerHTML = 'Lanjut ke Form Upload <i class="fa-solid fa-arrow-right"></i>'; 
            btn.disabled = false; 
        });
}

function cetakNomorUrut(noUrut, npd, tglUpload) {
    const printWindow = window.open('', '_blank', 'width=550,height=750');
    const itemCardHtml = `
        <div class="antrean-card">
            <div class="header-row">
                <span class="title">TANDA TERIMA ANTREAN LS</span>
                <span class="sub">BUKTI ADMINISTRASI</span>
            </div>
            <div class="section-title">NOMOR ANTREAN</div>
            <div class="number-box">${noUrut}</div>
            
            <div class="content-wrapper">
                <div class="info-side">
                    <div class="info-group">
                        <div class="section-title">NOMOR KONTRAK</div>
                        <div class="info-val">${npd}</div>
                    </div>
                    <div class="info-group">
                        <div class="section-title">TANGGAL UPLOAD</div>
                        <div class="info-val">${tglUpload}</div>
                    </div>
                </div>
                
                <div class="sign-side">
                    <table class="para-table">
                        <thead>
                            <tr><th colspan="2">DISETUJUI</th></tr>
                            <tr><th width="40%">TANGGAL</th><th width="60%">PARAF</th></tr>
                        </thead>
                        <tbody>
                            <tr><td height="55"></td><td></td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    printWindow.document.write(`
        <html><head><title>Bukti Antrean LS</title>
        <style>
            @media print {
                @page { margin: 15mm; } /* Hapus 'size' agar opsi Layout/Tata Letak muncul */
                body { -webkit-print-color-adjust: exact; }
                .antrean-card { page-break-inside: avoid; }
            }
            body { font-family: 'Segoe UI', Arial, sans-serif; color: #000; padding: 10px; margin: 0; background: #fff; }
            .antrean-card { border: 2px solid #000; padding: 18px; margin-bottom: 20px; background: #fff; }
            .header-row { display: flex; justify-content: space-between; align-items: baseline; border-b: 2px solid #000; padding-bottom: 6px; margin-bottom: 12px; }
            .title { font-size: 15px; font-weight: 900; letter-spacing: 0.5px; }
            .sub { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #333; }
            .section-title { font-size: 10px; font-weight: 800; text-transform: uppercase; margin-bottom: 3px; color: #222; }
            .number-box { font-size: 42px; font-weight: 900; text-align: center; border: 2px solid #000; padding: 8px; margin-bottom: 14px; letter-spacing: 2px; }
            
            .content-wrapper { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 15px; }
            .info-side { flex: 1; padding-right: 20px; }
            .info-group { margin-bottom: 12px; }
            .info-val { font-size: 13px; font-weight: bold; word-break: break-word; }
            
            .sign-side { width: 220px; }
            .para-table { width: 100%; border-collapse: collapse; }
            .para-table th, .para-table td { border: 1px solid #000; padding: 6px; text-align: center; }
            .para-table th { font-size: 11px; font-weight: 800; background: #fff; }
            
            .cut-line { text-align: center; border-bottom: 2px dashed #000; line-height: 0.1em; margin: 30px 0 35px 0; font-size: 11px; font-weight: bold; text-transform: uppercase; }
            .cut-line span { background: #fff; padding: 0 15px; }
        </style></head><body>
            ${itemCardHtml}
            <div class="cut-line"><span>✂ POTONG DI SINI ✂</span></div>
            ${itemCardHtml}
            <script>setTimeout(function(){ window.print(); }, 400);<\/script>
        </body></html>
    `);
    printWindow.document.close();
}

function gantiPageSize() { rowsPerPage = parseInt(document.getElementById('selectPageSize').value); currentPage = 1; renderTabelSpj(); }
function gantiHalaman(arah) { const tData = spjData.filter(i => filterJenis === 'ALL' || String(i.jenisSurat || 'GU') === filterJenis); const totalPages = Math.ceil(tData.length / rowsPerPage); currentPage += arah; if (currentPage < 1) currentPage = 1; if (currentPage > totalPages) currentPage = totalPages; renderTabelSpj(); }

function renderTabelSpj() {
    const tbody = document.getElementById('spjTableBody'); tbody.innerHTML = '';
    let filteredData = filterJenis !== 'ALL' ? spjData.filter(item => String(item.jenisSurat || 'GU') === filterJenis) : spjData;
    const totalData = filteredData.length; const totalPages = Math.ceil(totalData / rowsPerPage) || 1;
    const startIndex = (currentPage - 1) * rowsPerPage; const endIndex = Math.min(startIndex + rowsPerPage, totalData);
    const infoEl = document.getElementById('infoHalaman'); const btnPrev = document.getElementById('btnPrevPage'); const btnNext = document.getElementById('btnNextPage');
    if (infoEl) infoEl.innerText = `Hal ${currentPage} dari ${totalPages}`;
    if (btnPrev) btnPrev.disabled = currentPage === 1; if (btnNext) btnNext.disabled = currentPage === totalPages || totalPages === 0;
    const dataHalamanIni = filteredData.slice(startIndex, endIndex);

    // UBAH COLSPAN (9 jadi 11, 8 jadi 10) karena penambahan kolom
    if (dataHalamanIni.length === 0) { tbody.innerHTML = `<tr><td colspan="${filterJenis === 'ALL' ? '11' : '10'}" class="text-center py-10 text-slate-500 font-medium">Belum ada data SPJ untuk ditampilkan.</td></tr>`; return; }

    dataHalamanIni.forEach(item => {
        let badge = `<span class="px-2.5 py-1 rounded-full border border-slate-200 font-bold text-slate-600 bg-slate-100 text-[10px] tracking-wide">MENUNGGU</span>`;
        if(item.status === 'DISETUJUI') badge = `<span class="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[10px] tracking-wide">DISETUJUI</span>`;
        if(item.status === 'REVISI') badge = `<span class="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200 text-[10px] tracking-wide">REVISI</span>`;
        if(item.status === 'DITOLAK') badge = `<span class="px-2.5 py-1 rounded-full bg-red-50 text-red-700 font-bold border border-red-200 text-[10px] tracking-wide">DITOLAK</span>`;
        if(item.status === 'SUDAH DIPINDAHBUKUKAN') badge = `<span class="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200 text-[10px] tracking-wide">SELESAI PB</span>`;
        
        let jenisSurat = String(item.jenisSurat || 'GU');
        let jenisBadge = jenisSurat === 'LS' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200';
        let actionBtnText = sesiAktif.role === 'VERIFIKATOR' || sesiAktif.role === 'SUPER_ADMIN' ? 'Verifikasi' : 'Detail'; 
        let actionBtnColor = sesiAktif.role === 'VERIFIKATOR' || sesiAktif.role === 'SUPER_ADMIN' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-800 hover:bg-slate-900';
        let tdJenisHtml = filterJenis === 'ALL' ? `<td class="py-4 px-4 text-xs align-top text-center whitespace-nowrap"><span class="px-2 py-1 rounded-md border font-bold text-[10px] ${jenisBadge}">${jenisSurat}</span></td>` : ``;

        // VARIABEL BARU UNTUK KOLOM TERPISAH
        let cvText = jenisSurat === 'LS' && item.namaCv ? item.namaCv : '-';
        let tahapText = jenisSurat === 'LS' && item.tahap ? item.tahap : '-';
        let uraianPekerjaan = String(item.uraian || '-');

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50/50 border-b border-slate-100 transition-colors">
                <td class="py-4 px-4 text-xs align-top whitespace-nowrap text-slate-500 font-medium">${formatTanggalIndo(item.createdAt)}</td>
                <td class="py-4 px-4 text-xs align-top font-bold text-slate-800 max-w-[150px] whitespace-normal break-words">${String(item.npd || '-')}</td>
                ${tdJenisHtml}
                <td class="py-4 px-4 text-xs align-top whitespace-nowrap">${String(item.pptk || '-')}<br><span class="text-[10px] text-slate-500">${String(item.unitKerja || '-')}</span></td>
                <td class="py-4 px-4 text-xs align-top leading-relaxed min-w-[200px] whitespace-normal break-words">
                    <span class="font-bold text-slate-800">${String(item.program || '-')}</span><br>
                    <span class="text-slate-500">${String(item.kegiatan || '-')}</span><br>
                    <span class="text-[10px] text-slate-400">${String(item.subKegiatan || '-')}</span>
                </td>
                
                <!-- KOLOM BARU YANG DIPISAH -->
                <td class="py-4 px-4 text-xs align-top font-bold text-purple-700">${cvText}</td>
                <td class="py-4 px-4 text-xs align-top text-center">${tahapText}</td>
                <td class="py-4 px-4 text-xs align-top text-slate-600 max-w-[200px] whitespace-normal break-words">${uraianPekerjaan}</td>
                
                <td class="py-4 px-4 text-xs text-right font-bold align-top whitespace-nowrap text-slate-800">${formatRupiah(item.nominal)}</td>
                <td class="py-4 px-4 text-center align-top whitespace-nowrap">${badge}</td>
                <td class="py-4 px-4 text-center align-top whitespace-nowrap sticky right-0 bg-white/90 backdrop-blur-sm shadow-[-8px_0_15px_rgba(0,0,0,0.02)] z-10 border-l border-slate-100">
                    <button onclick="bukaModalVerifikasi('${String(item.id)}')" class="px-4 py-1.5 ${actionBtnColor} text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer">${actionBtnText}</button>
                </td>
            </tr>
        `;
    });
}

function openModal(id) { 
    if(id === 'modalNewSpj' && !isEditMode) { 
        document.getElementById('formNewSpj').reset(); ubahLabelNpdKontrak();
        const existingSukses = document.getElementById('pesanSuksesDiv'); if(existingSukses) existingSukses.remove();
        document.getElementById('formNewSpj').classList.remove('hidden'); document.getElementById('btnSubmitNew').innerText = "Lanjut ke Form Upload"; 
    }
    document.getElementById(id).classList.remove('hidden'); 
}

function switchTabAdmin(tabName) {
    document.querySelectorAll('.admin-tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.admin-tab-btn').forEach(el => { el.classList.remove('bg-blue-600/20', 'text-blue-400', 'border-blue-500/30'); el.classList.add('hover:bg-slate-700/50', 'hover:text-white'); });
    const activeTab = document.getElementById(`tab-content-${tabName}`); const activeBtn = document.getElementById(`tab-btn-${tabName}`);
    if(activeTab) { activeTab.classList.remove('hidden'); activeTab.classList.add('flex'); }
    if(activeBtn) { activeBtn.classList.add('bg-blue-600/20', 'text-blue-400', 'border-blue-500/30'); activeBtn.classList.remove('hover:bg-slate-700/50', 'hover:text-white'); }
}

function renderTabelAkunAdmin() {
    const tbody = document.getElementById('tabelAkunBody'); const tbPptk = document.getElementById('tabelPptkBody');
    if (!tbody || !tbPptk) return; tbody.innerHTML = ''; tbPptk.innerHTML = '';
    window.DATABASE_AKUN.forEach((akun, index) => {
        if(akun.role === 'PPTK') {
            tbPptk.innerHTML += `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="p-3 px-4 border-b border-slate-200 font-bold text-slate-800 text-xs">${akun.namaLengkap}</td>
                <td class="p-3 px-4 border-b border-slate-200 text-slate-500 font-mono text-[11px]">${akun.nip || '-'}</td>
                <td class="p-3 px-4 border-b border-slate-200 text-center whitespace-nowrap">
                    <button onclick="editDataPptk(${index})" class="px-2 py-1 bg-amber-50 text-amber-600 border border-amber-200 rounded text-[10px] font-bold hover:bg-amber-100"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="hapusDataAkun(${index})" class="px-2 py-1 bg-red-50 text-red-600 border border-red-200 rounded text-[10px] font-bold hover:bg-red-100 ml-1"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>`;
        }
        let roleBadge = `<span class="px-2.5 py-1 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-md border border-slate-200">${akun.role}</span>`;
        if (akun.role === 'SUPER_ADMIN') roleBadge = `<span class="px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-md border border-amber-200">SUPER_ADMIN</span>`;
        if (akun.role === 'PPTK') roleBadge = `<span class="px-2.5 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-md border border-blue-200">PPTK</span>`;
        if (akun.role === 'VERIFIKATOR') roleBadge = `<span class="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md border border-emerald-200">VERIFIKATOR</span>`;
        let identitasLogin = akun.username ? `<span class="text-blue-600 font-bold">${akun.username}</span> <br><span class="text-[9px] text-slate-400">Pass: ${akun.password}</span>` : `<span class="text-red-500 italic text-[10px]">Belum Punya Akun</span>`;
        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="p-3 px-4 border-b border-slate-200 font-bold text-slate-800 text-xs">${akun.namaLengkap}</td>
                <td class="p-3 px-4 border-b border-slate-200 text-slate-500 font-mono text-[11px]">${identitasLogin}</td>
                <td class="p-3 px-4 border-b border-slate-200 text-xs">${roleBadge}</td>
                <td class="p-3 px-4 border-b border-slate-200 text-center whitespace-nowrap">
                    <button onclick="editDataAkun(${index})" class="px-2 py-1 bg-amber-50 text-amber-600 border border-amber-200 rounded text-[10px] font-bold hover:bg-amber-100"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="hapusDataAkun(${index})" class="px-2 py-1 bg-red-50 text-red-600 border border-red-200 rounded text-[10px] font-bold hover:bg-red-100 ml-1"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>`;
    });
    isiDropdownPptkUtama(); 
}

function saveDatabaseToServer() {
    fetch(CONFIG.APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'sync_akun', listAkun: window.DATABASE_AKUN }) })
    .then(res => res.json()).then(res => { if(res.status !== 'success') alert('Gagal sinkronisasi data akun!'); }).catch(e => console.log(e));
}

function simpanDataPptk() {
    const nama = document.getElementById('pptkNama').value; const nip = document.getElementById('pptkNip').value; 
    if(!nama) { alert('Nama Lengkap wajib diisi!'); return; }
    if (editIndexPptk > -1) { window.DATABASE_AKUN[editIndexPptk].namaLengkap = nama; window.DATABASE_AKUN[editIndexPptk].nip = nip; } 
    else { window.DATABASE_AKUN.push({ username: "", password: "", role: "PPTK", namaLengkap: nama, nip: nip }); }
    saveDatabaseToServer(); resetFormPptk(); renderTabelAkunAdmin(); showToast('Data PPTK Tersimpan ke Database Server.');
}

function editDataPptk(index) {
    editIndexPptk = index; const ak = window.DATABASE_AKUN[index];
    document.getElementById('titleFormPptk').innerHTML = `<i class="fa-solid fa-pen text-emerald-600"></i> Edit Data PPTK`;
    document.getElementById('pptkNama').value = ak.namaLengkap || ""; document.getElementById('pptkNip').value = ak.nip || ""; 
}
function resetFormPptk() {
    editIndexPptk = -1; document.getElementById('titleFormPptk').innerHTML = `<i class="fa-solid fa-plus-circle text-emerald-600"></i> Tambah / Edit PPTK`;
    document.getElementById('pptkNama').value = ""; document.getElementById('pptkNip').value = "";
}

function simpanDataAkun() {
    const nama = document.getElementById('akunNama').value; const user = document.getElementById('akunUsername').value;
    const pass = document.getElementById('akunPassword').value; const role = document.getElementById('akunRole').value;
    if(!nama || !user || !pass) { alert('Harap isi semua kolom!'); return; }
    if (editIndexAkun > -1) { window.DATABASE_AKUN[editIndexAkun].namaLengkap = nama; window.DATABASE_AKUN[editIndexAkun].username = user; window.DATABASE_AKUN[editIndexAkun].password = pass; window.DATABASE_AKUN[editIndexAkun].role = role; } 
    else { window.DATABASE_AKUN.push({ username: user, password: pass, role: role, namaLengkap: nama }); }
    saveDatabaseToServer(); resetFormAkun(); renderTabelAkunAdmin(); showToast('Akun Tersimpan ke Database Server.');
}

function editDataAkun(index) {
    editIndexAkun = index; const ak = window.DATABASE_AKUN[index];
    document.getElementById('titleFormAkun').innerHTML = `<i class="fa-solid fa-pen text-blue-600"></i> Buat / Edit Detail Akun`;
    document.getElementById('akunNama').value = ak.namaLengkap || ""; document.getElementById('akunUsername').value = ak.username || "";
    document.getElementById('akunPassword').value = ak.password || ""; document.getElementById('akunRole').value = ak.role || "PPTK";
}

function resetFormAkun() {
    editIndexAkun = -1; document.getElementById('titleFormAkun').innerHTML = `<i class="fa-solid fa-user-plus text-blue-600"></i> Buat / Edit Detail Akun`;
    document.getElementById('akunNama').value = ""; document.getElementById('akunUsername').value = "";
    document.getElementById('akunPassword').value = ""; document.getElementById('akunRole').value = "VERIFIKATOR";
}

function hapusDataAkun(index) {
    if(confirm('Anda yakin ingin menghapus data ini?')) { window.DATABASE_AKUN.splice(index, 1); saveDatabaseToServer(); renderTabelAkunAdmin(); showToast('Berhasil dihapus dari server.'); }
}

function bukaModalSuperAdmin() { const profileDd = document.getElementById('profileDropdown'); if(profileDd) profileDd.classList.add('hidden'); renderTabelAkunAdmin(); switchTabAdmin('pptk'); openModal('modalSuperAdmin'); }

function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
function showToast(msg) { 
    const toast = document.getElementById('toast'); 
    document.getElementById('toastMessage').innerText = msg; 
    toast.classList.remove('-translate-y-20', 'opacity-0'); 
    setTimeout(() => toast.classList.add('-translate-y-20', 'opacity-0'), 3500); 
}

function jadikanLink(textUrl, idItem, formType) {
    if (!textUrl || textUrl === "-") {
        let formUrl = "";
        if (formType === 'GU') formUrl = `https://docs.google.com/forms/d/e/1FAIpQLSfCvsVCiHDjMtDos9giKhhljCFlfXuWNbC5wgP_IXsmBGyqPw/viewform?usp=pp_url&entry.1525941067=${idItem}`;
        else if (formType === 'LS') formUrl = `https://docs.google.com/forms/d/e/1FAIpQLSen-_GnKkn-ye7qZKdmV8wlGf7PnXnZ7yZHhDGo8aseu0RW_g/viewform?usp=pp_url&entry.1525941067=${idItem}`;
        else if (formType === 'REVISI') formUrl = `https://docs.google.com/forms/d/e/1FAIpQLScJt4ZSHFLsPdP8FO06i3LXuZVe3xw8q_m9T5wquH6dUGynDQ/viewform?usp=pp_url&entry.1525941067=${idItem}`;

        return `<span class="text-slate-400 italic block mb-2">Belum dilampirkan</span>
                <a href="${formUrl}" target="_blank" class="px-2 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-[10px] font-bold inline-block border border-blue-200"><i class="fa-solid fa-cloud-arrow-up me-1"></i> Upload Berkas</a>`;
    }
    const urlRegex = /(https?:\/\/[^\s]+)/g; return textUrl.replace(urlRegex, '<a href="$1" target="_blank" class="text-blue-600 underline font-bold bg-blue-50 px-2 py-1 rounded inline-block mt-1"><i class="fa-solid fa-download me-1"></i> Buka Berkas</a>');
}

function bukaModalVerifikasi(id) {
    activeSelectedId = id; const item = spjData.find(i => String(i.id) === String(id)); if(!item) return;

    let textUraian = '';
    if (String(item.jenisSurat) === 'LS') {
        textUraian = `<div class="pb-2 mb-2 border-b border-slate-200">
                        <span class="block text-[10px] font-bold text-purple-700 uppercase mb-0.5">Penyedia / CV</span>
                        <span class="text-sm font-bold text-slate-800">${item.namaCv || '-'}</span>
                      </div>
                      <div class="pb-2 mb-2 border-b border-slate-200">
                        <span class="block text-[10px] font-bold text-purple-700 uppercase mb-0.5">Tahap</span>
                        <span class="text-sm text-slate-700">${item.tahap || '-'}</span>
                      </div>
                      <div class="pt-1">
                        <span class="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Nama Pekerjaan</span>
                        <div class="text-sm font-medium text-slate-700 leading-relaxed">${String(item.uraian || '-')}</div>
                      </div>`;
    } else {
        textUraian = `<div>
                        <span class="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Uraian SPJ</span>
                        <div class="text-sm font-medium text-slate-700 leading-relaxed">${String(item.uraian || '-')}</div>
                      </div>`;
    }
    document.getElementById('detailUraian').innerHTML = textUraian;
    document.getElementById('detailPptkNama').innerText = String(item.pptk || "-");
    document.getElementById('detailUnitKerja').innerText = String(item.unitKerja || "-");
    
    let elEmail = document.getElementById('detailEmailPptk');
    if (elEmail) elEmail.innerText = String(item.emailPptk || "-");
    
    document.getElementById('detailNominal').innerText = formatRupiah(item.nominal || 0);

    let btnCetakEksis = document.getElementById('btnPrintAntrean');
    if(btnCetakEksis) btnCetakEksis.remove();

    if (String(item.jenisSurat) === 'LS') {
        const allLS = [...spjData].reverse().filter(i => String(i.jenisSurat) === 'LS');
        const idx = allLS.findIndex(i => String(i.id) === String(item.id)) + 1;
        const noUrut = 'LS-' + String(idx).padStart(4, '0');
        
        const safeNpd = String(item.npd || '-').replace(/'/g, "\\'").replace(/"/g, "&quot;");
        const tgl = String(item.createdAt || '-').split('T')[0];
        
        const btnHtml = `<button id="btnPrintAntrean" onclick="cetakNomorUrut('${noUrut}', '${safeNpd}', '${tgl}')" class="mt-3 px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded text-[11px] font-bold shadow-sm flex items-center gap-2 transition-colors w-full justify-center"><i class="fa-solid fa-print"></i> Cetak Ulang Antrean (${noUrut})</button>`;
        
        document.getElementById('detailNominal').insertAdjacentHTML('afterend', btnHtml);
    }
    
    const boxBerkas = document.getElementById('berkas-area-gu');
    if (String(item.jenisSurat) === 'LS') {
        boxBerkas.innerHTML = `<div class="text-sm"><span class="font-bold text-slate-700 block mb-1">1. Kwitansi Kontrak / SPK</span><div id="linkDokKeuangan"></div></div><div class="text-sm mt-3"><span class="font-bold text-slate-700 block mb-1">2. Berkas Pencairan LS</span><div id="linkDokSpj"></div></div>`;
    } else {
        boxBerkas.innerHTML = `<div class="text-sm"><span class="font-bold text-slate-700 block mb-1">1. Dok. Keuangan (SPP/SPM/Pajak)</span><div id="linkDokKeuangan"></div></div><div class="text-sm mt-3"><span class="font-bold text-slate-700 block mb-1">2. SPJ Fungsional (Kwitansi/Nota/Absen)</span><div id="linkDokSpj"></div></div>`;
    }
    document.getElementById('linkDokKeuangan').innerHTML = jadikanLink(item.linkKeuangan, item.id, item.jenisSurat); 
    document.getElementById('linkDokSpj').innerHTML = jadikanLink(item.linkSpj, item.id, item.jenisSurat); 
    document.getElementById('linkDokRevisi').innerHTML = jadikanLink(item.linkRevisi, item.id, 'REVISI');

    const buktiPbBox = document.getElementById('detailBuktiPbBox');
    if (item.status === 'SUDAH DIPINDAHBUKUKAN' && item.buktiPb) {
        document.getElementById('detailBuktiPbTeks').innerText = `No PB: ${item.noPb} (${item.tglPb})`;
        let buktiLink = String(item.buktiPb || '');
        if(buktiLink.startsWith('http')) { document.getElementById('detailBuktiPbLink').innerHTML = `<a href="${buktiLink}" target="_blank" class="text-blue-600 underline font-bold">Buka Lampiran Bukti PB</a>`; } 
        else { document.getElementById('detailBuktiPbLink').innerHTML = `<span class="text-slate-700 font-bold">Kata Kunci Arsip: ${buktiLink}</span>`; }
        buktiPbBox.classList.remove('hidden');
    } else { buktiPbBox.classList.add('hidden'); }

    // RENDER WARNA SPESIFIK UNTUK RIWAYAT (Garis netral abu-abu, status membesar + icon)
    let logHtml = '<div class="relative border-l-2 border-slate-200 ml-3 mt-4 pb-2">'; 
    const safeRiwayat = String(item.riwayatLog || '');
    if (safeRiwayat.trim() !== "") { 
        let logEntries = [];
        safeRiwayat.split('\n').forEach(line => { 
            let trimmed = line.trim(); 
            if (!trimmed) return; 
            if (/^\[\d{2}\/\d{2}\/\d{4}/.test(trimmed)) { logEntries.push(trimmed); } 
            else { if (logEntries.length > 0) { logEntries[logEntries.length - 1] += '<br>' + trimmed; } else { logEntries.push(trimmed); } } 
        });
        
        logEntries.forEach((line) => { 
            let dotColor = 'bg-slate-400 ring-slate-100'; 
            let innerHtml = line; 
            let match = line.match(/^(\[[^\]]+\])\s*(.*)$/);
            
            if (match) {
                let tanggal = match[1]; let isiHtml = match[2];
                let isCatatan = isiHtml.includes('- Catatan:');
                let isPb = isiHtml.includes('PINDAHBUKU SELESAI') || isiHtml.includes('DIPINDAHBUKUKAN');
                
                // Styling dasar untuk badge agar lebih besar (text-xs, padding ekstra) dan pakai inline-flex untuk icon
                let badgeClass = "text-white px-3 py-1.5 rounded-md shadow-sm font-bold uppercase inline-flex items-center gap-1.5 text-xs mb-1";
                
                if (isCatatan) {
                    let parts = isiHtml.split('- Catatan:'); 
                    let statusTeks = parts[0].trim();
                    let isiCatatan = parts[1].trim();
                    
                    if (statusTeks.includes('REVISI')) {
                        dotColor = 'bg-orange-500 ring-orange-200';
                        isiHtml = `
                            <div><span class="bg-orange-500 ${badgeClass}"><i class="fa-solid fa-rotate-left"></i> ${statusTeks}</span></div>
                            <div class="mt-1 p-2.5 bg-orange-50 border border-orange-200 rounded-lg text-orange-900 text-[11px] leading-relaxed shadow-sm">
                                <i class="fa-solid fa-circle-exclamation me-1 text-orange-600"></i> <b class="text-orange-900">Catatan Revisi:</b><br>${isiCatatan}
                            </div>`;
                    } else if (statusTeks.includes('DITOLAK')) {
                        dotColor = 'bg-red-600 ring-red-200';
                        isiHtml = `
                            <div><span class="bg-red-600 ${badgeClass}"><i class="fa-solid fa-circle-xmark"></i> ${statusTeks}</span></div>
                            <div class="mt-1 p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-900 text-[11px] leading-relaxed shadow-sm">
                                <i class="fa-solid fa-circle-xmark me-1 text-red-600"></i> <b class="text-red-900">Alasan Ditolak:</b><br>${isiCatatan}
                            </div>`;
                    }
                }
                else if (isPb) {
                    dotColor = 'bg-blue-600 ring-blue-200'; 
                    if (isiHtml.includes('- No PB:')) {
                        let pbParts = isiHtml.split('- No PB:');
                        let statusTeks = pbParts[0].trim();
                        let noPb = pbParts[1].trim();
                        isiHtml = `<div><span class="bg-blue-600 ${badgeClass}"><i class="fa-solid fa-money-bill-transfer"></i> ${statusTeks}</span></div>
                                   <div class="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-md shadow-sm mt-1">
                                       <span class="text-[10px] text-blue-700 font-bold uppercase">NO PB:</span> 
                                       <span class="text-sm font-black text-blue-900 tracking-widest">${noPb}</span>
                                   </div>`;
                    } else {
                        isiHtml = `<span class="bg-blue-600 ${badgeClass}"><i class="fa-solid fa-money-bill-transfer"></i> ${isiHtml}</span>`; 
                    }
                }
                else if (isiHtml.includes('REVISI')) { 
                    dotColor = 'bg-orange-500 ring-orange-200'; 
                    isiHtml = `<span class="bg-orange-500 ${badgeClass}"><i class="fa-solid fa-rotate-left"></i> ${isiHtml}</span>`; 
                }
                else if (isiHtml.includes('DITOLAK')) { 
                    dotColor = 'bg-red-600 ring-red-200'; 
                    isiHtml = `<span class="bg-red-600 ${badgeClass}"><i class="fa-solid fa-circle-xmark"></i> ${isiHtml}</span>`; 
                } 
                else if (isiHtml.includes('DISETUJUI')) { 
                    dotColor = 'bg-emerald-500 ring-emerald-200'; 
                    isiHtml = `<span class="bg-emerald-500 ${badgeClass}"><i class="fa-solid fa-circle-check"></i> ${isiHtml}</span>`; 
                }
                else if (isiHtml.includes('DIAJUKAN')) { 
                    dotColor = 'bg-slate-500 ring-slate-200'; 
                    isiHtml = `<span class="bg-slate-600 ${badgeClass}"><i class="fa-solid fa-file-arrow-up"></i> ${isiHtml}</span>`; 
                } 
                else { 
                    isiHtml = `<span class="text-slate-800 font-bold">${isiHtml}</span>`; 
                }
                
                // Ubah warna tanggal jadi netral (slate-500)
                innerHtml = `<span class="text-[10px] font-bold text-slate-500 block mb-1.5 tracking-wide">${tanggal}</span>${isiHtml}`;
            } else { 
                innerHtml = `<span class="text-slate-600 italic font-medium block mt-1 pl-2 border-l-2 border-slate-300">${line}</span>`; 
                dotColor = 'bg-transparent ring-transparent'; 
            }
            
            // Perbesar sedikit titik bundarannya (w-2.5 h-2.5)
            logHtml += `<div class="relative pl-7 mb-6">
                            <div class="absolute -left-[6px] top-1 w-2.5 h-2.5 ${dotColor} rounded-full ${dotColor !== 'bg-transparent ring-transparent' ? 'ring-4' : ''}"></div>
                            <div class="text-[11px] leading-relaxed">${innerHtml}</div>
                        </div>`; 
        }); 
    } else { 
        logHtml += `<div class="relative pl-7">
                        <div class="absolute -left-[6px] top-1 w-2.5 h-2.5 bg-slate-300 rounded-full ring-4 ring-white"></div>
                        <p class="text-[11px] text-slate-400 italic">Belum ada riwayat aktivitas.</p>
                    </div>`; 
    }
    logHtml += '</div>'; document.getElementById('detailRiwayatBox').innerHTML = logHtml;
    
    document.getElementById('revisiContainer').classList.add('hidden'); 
    document.getElementById('pindahbukuContainer').classList.add('hidden'); 
    document.getElementById('confirmActionContainer').classList.add('hidden'); 
    document.getElementById('panelPptkRevisi').classList.add('hidden');
    document.getElementById('catatanRevisiInput').value = ""; // Kosongkan text area

    if (sesiAktif.role === 'VERIFIKATOR' || sesiAktif.role === 'SUPER_ADMIN') {
        document.getElementById('panelAksiVerifikator').classList.remove('hidden'); 
        
        let cleanPhone = String(item.wa || '').replace(/[^0-9]/g, ''); if (cleanPhone.startsWith('0')) { cleanPhone = '62' + cleanPhone.slice(1); } else if (cleanPhone.startsWith('8')) { cleanPhone = '62' + cleanPhone; }        
        let waText = `Yth. PPTK,\nUpdate SPJ (NPD: ${item.npd}):\n*Status: ${item.status}*\n`; if(item.status === 'REVISI' || item.status === 'DITOLAK') waText += `Catatan:\n${String(item.catatanRevisi).replace(/<br>/g, '\n')}\n`;
        
        const btnSendWa = document.getElementById('btnSendWa');
        if (btnSendWa) btnSendWa.href = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(waText)}`;
        
    } else {
        document.getElementById('panelAksiVerifikator').classList.add('hidden'); 
        
        if(item.status === 'REVISI' || item.status === 'BELUM_DIPROSES') {
            document.getElementById('panelPptkRevisi').classList.remove('hidden');
            
            if(item.status === 'BELUM_DIPROSES') {
                document.getElementById('teksRevisiPptk').innerText = "Anda masih dapat mengubah data teks atau mengunggah ulang berkas.";
            }
            if(item.status === 'REVISI') {
                document.getElementById('teksRevisiPptk').innerHTML = "Catatan Verifikator: <br>" + String(item.catatanRevisi || "-");
            }
            
            // === UPDATE TOMBOL UPLOAD REVISI ===
            document.getElementById('btnUploadRevisi').href = `https://docs.google.com/forms/d/e/1FAIpQLScJt4ZSHFLsPdP8FO06i3LXuZVe3xw8q_m9T5wquH6dUGynDQ/viewform?usp=pp_url&entry.1525941067=${item.id}`;
            
            let existingEditBtnPptk = document.getElementById('btnEditDataPptk');
            if(existingEditBtnPptk) existingEditBtnPptk.remove();
            
            const editBtnPptkHtml = `<button id="btnEditDataPptk" onclick="bukaFormEdit()" class="w-full mt-2 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded font-bold text-xs shadow-sm transition-colors flex items-center justify-center gap-1.5"><i class="fa-solid fa-pen-to-square"></i> EDIT DATA TEKS</button>`;
            document.getElementById('panelPptkRevisi').insertAdjacentHTML('beforeend', editBtnPptkHtml);
        }
    }
    openModal('modalVerify');
}

function bukaFormEdit() {
    const item = spjData.find(i => String(i.id) === String(activeSelectedId)); if(!item) return;
    isEditMode = true; editIdTarget = item.id;
    const existingSukses = document.getElementById('pesanSuksesDiv'); if(existingSukses) existingSukses.remove();
    document.getElementById('formNewSpj').classList.remove('hidden');
    
    try { 
        let rawTglStr = String(item.createdAt || '');
        if (rawTglStr.includes('T')) {
            const parts = rawTglStr.split('T');
            let [y, m, dNum] = parts[0].split('-').map(Number);
            let jamUTC = parseInt(parts[1].substring(0, 2), 10);
            
            let realDate = new Date(y, m - 1, dNum);
            if (jamUTC >= 12) realDate.setDate(realDate.getDate() + 1); // Koreksi paksa 1 hari
            
            const fDay = String(realDate.getDate()).padStart(2, '0');
            const fMonth = String(realDate.getMonth() + 1).padStart(2, '0');
            const fYear = realDate.getFullYear();
            
            document.getElementById('inputTanggal').value = `${fYear}-${fMonth}-${fDay}`;
        } else if (rawTglStr.includes('/')) { 
            let parts = rawTglStr.split('/'); 
            document.getElementById('inputTanggal').value = `${parts[2]}-${parts[1]}-${parts[0]}`; 
        } else { 
            document.getElementById('inputTanggal').value = rawTglStr; 
        }
    } catch(e){}

    document.getElementById('inputJenisSurat').value = item.jenisSurat || 'GU'; ubahLabelNpdKontrak();
    document.getElementById('inputNpd').value = item.npd; document.getElementById('inputPptk').value = item.pptk;
    document.getElementById('inputUnitKerja').value = item.unitKerja; document.getElementById('inputEmail').value = item.emailPptk; document.getElementById('inputWa').value = item.wa;
    document.getElementById('inputProgram').value = item.program; updateKegiatanDropdown(); document.getElementById('inputKegiatan').value = item.kegiatan; updateSubkegiatanDropdown(); document.getElementById('inputSubkegiatan').value = item.subKegiatan;
    document.getElementById('inputNominal').value = item.nominal; document.getElementById('inputUraian').value = item.uraian;
    
    if (item.jenisSurat === 'LS') {
        const inputCv = document.getElementById('inputCv'); const inputTahap = document.getElementById('inputTahap');
        if(inputCv) inputCv.value = item.namaCv || ""; if(inputTahap) inputTahap.value = item.tahap || "UM";
    }
    
    document.getElementById('btnSubmitNew').innerText = "Simpan Perubahan (Edit)";
    closeModal('modalVerify'); openModal('modalNewSpj');
}

function actionSetujui() { pendingStatusChange = 'DISETUJUI'; prosesUpdateStatusAksi(); }
function toggleActionForm(type) {
    pendingStatusChange = type;
    document.getElementById('revisiContainer').classList.add('hidden'); document.getElementById('pindahbukuContainer').classList.add('hidden'); document.getElementById('confirmActionContainer').classList.remove('hidden');
    if(type === 'REVISI' || type === 'DITOLAK') document.getElementById('revisiContainer').classList.remove('hidden');
    if(type === 'SUDAH DIPINDAHBUKUKAN') document.getElementById('pindahbukuContainer').classList.remove('hidden');
    
    const modalContent = document.getElementById('modalVerify');
    modalContent.scrollTo({ top: modalContent.scrollHeight, behavior: 'smooth' });
}

function prosesUpdateStatusAksi() {
    let payload = { action: 'update_status', id: activeSelectedId, status: pendingStatusChange, username: sesiAktif.namaLengkap, noPb: '', tglPb: '', catatanRevisi: '', buktiPb: '' };
    if (pendingStatusChange === 'REVISI' || pendingStatusChange === 'DITOLAK') { payload.catatanRevisi = document.getElementById('catatanRevisiInput').value; if(!payload.catatanRevisi) { alert('Catatan wajib diisi!'); return; } } 
    else if (pendingStatusChange === 'SUDAH DIPINDAHBUKUKAN') { payload.noPb = document.getElementById('noPbInput').value; payload.tglPb = document.getElementById('tglPbInput').value; payload.buktiPb = document.getElementById('buktiPbInput').value; if(!payload.noPb || !payload.tglPb) { alert('No PB & Tgl wajib diisi!'); return; } }
    
    const btn = document.getElementById('btnConfirmAction'); 
    if (btn) { btn.innerText = 'MEMPROSES...'; btn.disabled = true; }
    
    fetch(CONFIG.APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) })
    .then(res => res.json())
    .then(res => {
        if(res.status === 'success') { 
            showToast(`Sukses memperbarui status.`); 
            document.getElementById('confirmActionContainer').classList.add('hidden'); 
            tarikDataDariServer().then(() => { bukaModalVerifikasi(activeSelectedId); });
        } 
        else { alert("GAGAL UPDATE:\n" + res.message); }
    })
    .catch(err => { alert("KONEKSI TERPUTUS:\n" + err.message); })
    .finally(() => { if (btn) { btn.innerText = 'Simpan Keputusan'; btn.disabled = false; } });
}

function kirimEmailManual() {
    if(!activeSelectedId) return;
    
    const btn = document.getElementById('btnSendEmailManual');
    if(btn) { btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengirim...'; btn.disabled = true; }

    fetch(CONFIG.APPS_SCRIPT_URL, { 
        method: 'POST', 
        body: JSON.stringify({ action: 'resend_email', id: activeSelectedId }) 
    })
    .then(res => res.json())
    .then(res => {
        if(res.status === 'success') { showToast("Email Notifikasi Berhasil Terkirim!"); }
        else { alert("Gagal kirim email: " + (res.message || "Email PPTK tidak valid")); }
    })
    .catch(err => alert("Koneksi gagal saat mengirim email."))
    .finally(() => { 
        if(btn) { btn.innerHTML = '<i class="fa-solid fa-envelope"></i> KIRIM NOTIFIKASI EMAIL KE PPTK'; btn.disabled = false; } 
    });
}

// FUNGSI UNTUK LOGOUT / KELUAR SISTEM
function keluarSistem() {
    sessionStorage.clear(); // Hapus sesi penyimpanan browser
    sesiAktif = { role: "", username: "", namaLengkap: "" }; // Reset user
    
    // Sembunyikan dashboard, tampilkan halaman login
    document.getElementById('main-app').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
    
    // Tutup dropdown profil jika masih terbuka
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) dropdown.classList.add('hidden');
    
    // Opsional: kosongkan input password
    document.getElementById('password-input').value = "";
}
