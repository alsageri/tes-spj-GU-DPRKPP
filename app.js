// ========================================================
// FILE: app.js (Sistem Logika Utama Terintegrasi)
// ========================================================

let spjData = []; let referensiData = {}; 
let activeSelectedId = null; let pendingStatusChange = null;
let sesiAktif = { role: "", username: "", namaLengkap: "" };
let isEditMode = false; let editIdTarget = null;
let currentPage = 1; let rowsPerPage = 10;
let filterJenis = 'ALL'; 

let editIndexAkun = -1; let editIndexPptk = -1;
let paguEditType = null; 

// 1. MEKANISME AUTO-SAVE LOCALSTORAGE (DIPERBAIKI)
function initLocalData() {
    try {
        // Tarik Database Akun dari Browser
        const savedAkun = localStorage.getItem("LOCAL_DATABASE_AKUN");
        if (savedAkun && typeof DATABASE_AKUN !== 'undefined') {
            const parsed = JSON.parse(savedAkun);
            // Mutasi array agar tidak bentrok (Password/Akun akan tersimpan permanen)
            DATABASE_AKUN.length = 0; 
            parsed.forEach(item => DATABASE_AKUN.push(item));
        } 
        
        // Tarik Pagu Tahunan
        const savedPaguTahun = localStorage.getItem("LOCAL_PAGU_TAHUNAN");
        if (savedPaguTahun && typeof CONFIG !== 'undefined') {
            CONFIG.PAGU_TAHUNAN = Number(savedPaguTahun);
        }
        
        // Tarik Pagu Triwulan
        const savedPaguTriwulan = localStorage.getItem("LOCAL_PAGU_TRIWULAN");
        if (savedPaguTriwulan && typeof CONFIG !== 'undefined') {
            CONFIG.PAGU_TRIWULAN = Number(savedPaguTriwulan);
        }
    } catch(e) { console.error("Error load local data", e); }
}
// Jalankan otomatis
setTimeout(initLocalData, 100);

function checkLogin() {
    try {
        if (typeof DATABASE_AKUN === 'undefined') { alert("Sistem belum siap. Harap tekan Ctrl + F5."); return; }
        
        const uname = document.getElementById('username-input').value.trim().toLowerCase();
        const pass = document.getElementById('password-input').value;
        const userFound = DATABASE_AKUN.find(u => u.username === uname && u.password === pass);
        
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
    document.getElementById('login-screen').style.display = 'none'; 
    document.getElementById('main-app').style.display = 'flex';
    
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
    
    isiDropdownPptkUtama(); tarikDataDariServer();
}

function isiDropdownPptkUtama() {
    const selectPptk = document.getElementById('inputPptk');
    if(selectPptk && typeof DATABASE_AKUN !== 'undefined') {
        selectPptk.innerHTML = '<option value="">-- Pilih Nama PPTK --</option>';
        DATABASE_AKUN.forEach(user => { if(user.role === 'PPTK') { selectPptk.innerHTML += `<option value="${user.namaLengkap}">${user.namaLengkap}</option>`; } });
    }
}

function tarikDataDariServer() {
    document.getElementById('refresh-icon').classList.add('animate-spin');
    fetch(CONFIG.APPS_SCRIPT_URL)
        .then(res => res.json())
        .then(data => {
            if (data.status === 'error') { alert("Sistem Google Menolak: " + data.message); return; }
            if(data.spj) spjData = data.spj.reverse(); 
            if(data.referensi) referensiData = data.referensi;
            renderTabelSpj(); hitungAnggaran(); isiDropdownProgram();
        })
        .catch(e => { alert("Gagal memuat data! Detail Error: " + e.message); })
        .finally(() => { document.getElementById('refresh-icon').classList.remove('animate-spin'); });
}

// FORMAT RUPIAH & HITUNG PAGU
function formatRupiah(amount) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount); }

function hitungAnggaran() {
    let totalPencairan = 0;
    spjData.forEach(item => { if(item.status === 'SUDAH DIPINDAHBUKUKAN') totalPencairan += Number(item.nominal) || 0; });
    document.getElementById('sisaTahunanVal').innerText = formatRupiah(CONFIG.PAGU_TAHUNAN - totalPencairan);
    document.getElementById('sisaTriwulanVal').innerText = formatRupiah(CONFIG.PAGU_TRIWULAN - totalPencairan);
    document.getElementById('totalCairVal').innerText = formatRupiah(totalPencairan);
}

// LOGIKA EDIT PAGU (DASHBOARD)
function bukaModalEditPagu(jenis) {
    paguEditType = jenis;
    document.getElementById('titleEditPagu').innerText = `Edit Pagu ${jenis === 'TAHUNAN' ? 'Tahunan' : 'Triwulan'}`;
    const currentValue = jenis === 'TAHUNAN' ? CONFIG.PAGU_TAHUNAN : CONFIG.PAGU_TRIWULAN;
    document.getElementById('inputEditPagu').value = currentValue;
    openModal('modalEditPagu');
}
function simpanPaguBaru() {
    const val = Number(document.getElementById('inputEditPagu').value);
    if(val < 0) { alert('Nominal tidak boleh minus!'); return; }
    
    if (paguEditType === 'TAHUNAN') {
        CONFIG.PAGU_TAHUNAN = val;
        localStorage.setItem("LOCAL_PAGU_TAHUNAN", val);
    } else {
        CONFIG.PAGU_TRIWULAN = val;
        localStorage.setItem("LOCAL_PAGU_TRIWULAN", val);
    }
    
    hitungAnggaran(); closeModal('modalEditPagu'); showToast('Pagu berhasil diperbarui.');
}

// FUNGSI BUKA SPJ BARU (YANG SEBELUMNYA HILANG)
function bukaFormSpjBaru() {
    isEditMode = false;
    editIdTarget = null;
    openModal('modalNewSpj');
}

// DROPDOWN
function isiDropdownProgram() {
    const progSelect = document.getElementById('inputProgram'); if(!progSelect) return;
    progSelect.innerHTML = '<option value="">-- Pilih Program --</option>';
    for (let prog in referensiData) { progSelect.innerHTML += `<option value="${prog}">${prog}</option>`; }
}
function updateKegiatanDropdown() {
    const prog = document.getElementById('inputProgram').value; const kegSelect = document.getElementById('inputKegiatan'); const subSelect = document.getElementById('inputSubkegiatan');
    kegSelect.innerHTML = '<option value="">-- Pilih Kegiatan --</option>'; subSelect.innerHTML = '<option value="">-- Pilih Subkegiatan --</option>';
    if(prog && referensiData[prog]) { for (let keg in referensiData[prog]) { kegSelect.innerHTML += `<option value="${keg}">${keg}</option>`; } }
}
function updateSubkegiatanDropdown() {
    const prog = document.getElementById('inputProgram').value; const keg = document.getElementById('inputKegiatan').value; const subSelect = document.getElementById('inputSubkegiatan');
    subSelect.innerHTML = '<option value="">-- Pilih Subkegiatan --</option>';
    if(prog && keg && referensiData[prog][keg]) { referensiData[prog][keg].forEach(sub => { subSelect.innerHTML += `<option value="${sub}">${sub}</option>`; }); }
}


// FILTER MENU
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

    const title = document.getElementById('page-title'); const breadcrumb = document.getElementById('breadcrumb-text'); const tbTitle = document.getElementById('tabel-judul-jenis');
    if(jenis === 'ALL') { title.innerText = 'Dashboard Utama'; breadcrumb.innerText = 'Dashboard Semua'; tbTitle.innerText = 'GU & LS'; }
    else if(jenis === 'GU') { title.innerText = 'Data SPJ Ganti Uang (GU)'; breadcrumb.innerText = 'Data SPJ GU'; tbTitle.innerText = 'Ganti Uang (GU)'; }
    else if(jenis === 'LS') { title.innerText = 'Data SPJ Langsung (LS)'; breadcrumb.innerText = 'Data SPJ LS'; tbTitle.innerText = 'Langsung (LS)'; }

    const thJenis = document.getElementById('th-jenis');
    if (jenis === 'ALL') { if(thJenis) thJenis.style.display = 'table-cell'; } else { if(thJenis) thJenis.style.display = 'none'; }
    renderTabelSpj();
}

function ubahLabelNpdKontrak() {
    const jenis = document.getElementById('inputJenisSurat').value;
    const label = document.getElementById('label-npd-kontrak');
    const input = document.getElementById('inputNpd');
    
    if (jenis === 'LS') { label.innerText = 'Nomor Kontrak / SPK'; input.placeholder = 'Cth: 027/01/SPK/2026'; } 
    else { label.innerText = 'Nomor NPD'; input.placeholder = 'Cth: 001/NPD/2026'; }
}

function kirimPengajuanSpjBaru(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSubmitNew'); 
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i> Menyimpan...'; btn.disabled = true;
    const rawDate = document.getElementById('inputTanggal').value; const [y, m, d] = rawDate.split('-');
    
    let generatedId = "";
    if (!isEditMode) {
        const now = new Date();
        generatedId = `SPJ-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`; 
    }

    const idSistem = isEditMode ? editIdTarget : generatedId; 
    const actionType = isEditMode ? 'update_data_teks' : 'create';

    const payload = {
        action: actionType, id: idSistem, createdAt: `${d}/${m}/${y}`, username: sesiAktif.namaLengkap,
        jenisSurat: document.getElementById('inputJenisSurat').value,
        pptk: document.getElementById('inputPptk').value, emailPptk: document.getElementById('inputEmail').value, 
        unitKerja: document.getElementById('inputUnitKerja').value, npd: document.getElementById('inputNpd').value, 
        program: document.getElementById('inputProgram').value, kegiatan: document.getElementById('inputKegiatan').value, 
        subKegiatan: document.getElementById('inputSubkegiatan').value, nominal: document.getElementById('inputNominal').value, 
        uraian: document.getElementById('inputUraian').value, wa: document.getElementById('inputWa').value, 
        status: 'BELUM_DIPROSES'
    };

    fetch(CONFIG.APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) })
        .then(res => res.json())
        .then(res => {
            if(res.status === 'success') {
                document.getElementById('formNewSpj').classList.add('hidden'); 
                
                if (isEditMode) {
                    const divSukses = document.createElement('div'); divSukses.id = "pesanSuksesDiv"; divSukses.className = "text-center py-6 space-y-4";
                    divSukses.innerHTML = `<div class="text-5xl text-emerald-500 mb-2"><i class="fa-solid fa-circle-check"></i></div><h3 class="text-lg font-bold text-slate-800">Perbaikan Data Berhasil!</h3><button onclick="closeModal('modalNewSpj'); tarikDataDariServer();" class="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md">Tutup & Refresh</button>`;
                    document.getElementById('formNewSpj').parentElement.appendChild(divSukses);
                } else {
                    const formPrefilledUrl = `https://docs.google.com/forms/d/e/1FAIpQLSfCvsVCiHDjMtDos9giKhhljCFlfXuWNbC5wgP_IXsmBGyqPw/viewform?usp=pp_url&entry.1525941067=${idSistem}`; 
                    const divSukses = document.createElement('div'); divSukses.id = "pesanSuksesDiv"; divSukses.className = "text-center py-4 space-y-4";
                    
                    if (payload.jenisSurat === 'LS') {
                        const timeCode = idSistem.split('-')[1]; const noUrut = 'LS-' + timeCode.substring(timeCode.length - 4);
                        divSukses.innerHTML = `
                            <div class="text-4xl text-purple-500 mb-2"><i class="fa-solid fa-file-invoice"></i></div><h3 class="text-lg font-bold text-slate-800">Pengajuan LS Berhasil Disimpan!</h3>
                            <div class="bg-purple-50 border border-purple-200 p-4 rounded-lg my-4 text-center mx-auto max-w-sm"><p class="text-xs text-purple-600 font-bold mb-1">NOMOR URUT / ANTREAN LS ANDA</p><h2 class="text-3xl font-black text-purple-800 tracking-widest">${noUrut}</h2></div>
                            <p class="text-sm text-slate-600 mb-4 font-medium">Harap Lanjut Klik Tombol Upload Berkas: Kwitansi & Berkas Pencairan.</p>
                            <a href="${formPrefilledUrl}" target="_blank" onclick="closeModal('modalNewSpj'); tarikDataDariServer();" class="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md mb-3"><i class="fa-solid fa-cloud-arrow-up me-2"></i> Lanjut Upload Berkas</a><br>
                            <button onclick="cetakNomorUrut('${noUrut}', '${payload.npd}', '${payload.nominal}', '${payload.pptk}')" class="text-xs text-slate-500 hover:text-slate-800 underline font-bold transition-colors"><i class="fa-solid fa-print"></i> Unduh / Cetak Bukti Antrean LS</button>
                        `;
                    } else {
                        divSukses.innerHTML = `
                            <div class="text-5xl text-emerald-500 mb-2"><i class="fa-solid fa-circle-check"></i></div><h3 class="text-lg font-bold text-slate-800">Data Pengajuan Berhasil Disimpan!</h3>
                            <p class="text-sm text-slate-600 mb-4 bg-amber-50 border border-amber-200 p-3 rounded text-left"><strong>PENTING:</strong> Pengajuan belum selesai. Lanjut klik tombol di bawah untuk Upload Berkas Keuangan & SPJ GU.</p>
                            <a href="${formPrefilledUrl}" target="_blank" onclick="closeModal('modalNewSpj'); tarikDataDariServer();" class="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md"><i class="fa-solid fa-cloud-arrow-up me-2"></i> Lanjut Upload Berkas</a>`;
                    }
                    document.getElementById('formNewSpj').parentElement.appendChild(divSukses);
                }
            } else { alert("GAGAL MENYIMPAN!\n" + res.message); }
        })
        .catch(err => alert("KONEKSI TERPUTUS!\nError: " + err.message))
        .finally(() => { btn.innerHTML = 'Kirim Pengajuan'; btn.disabled = false; });
}

// LOGIKA CETAK LS
function cetakNomorUrut(noUrut, npd, nominal, pptk) {
    const printWindow = window.open('', '_blank', 'width=450,height=500');
    printWindow.document.write(`<html><head><title>Bukti Antrean LS</title><style>body{font-family:sans-serif; text-align:center; padding:20px; color:#333;} hr{border:1px dashed #ccc; margin:20px 0;} p{margin:5px 0;} h1{font-size:50px; margin:20px 0; border:2px dashed #000; padding:15px;}</style></head><body><h2 style="margin-bottom:5px;">TANDA TERIMA<br>PENGAJUAN SPJ LS</h2><p style="font-size:12px; color:#666;">Dinas Perumahan Rakyat, Kawasan Permukiman dan Pertanahan</p><hr><p style="font-size:12px;">Nama PPTK:</p><p><b>${pptk}</b></p><br><p style="font-size:12px;">Nomor Kontrak / SPK:</p><p><b>${npd}</b></p><br><p style="font-size:12px;">Nominal:</p><p><b>Rp ${formatRupiah(nominal).replace('Rp', '')}</b></p><h1>${noUrut}</h1><hr><p style="font-size:12px; line-height:1.5;">Simpan nomor antrean ini atau cetak sebagai bukti penginputan pada sistem ERP SPJ.</p><script>window.print();<\/script></body></html>`);
    printWindow.document.close();
}


function gantiPageSize() { rowsPerPage = parseInt(document.getElementById('selectPageSize').value); currentPage = 1; renderTabelSpj(); }
function gantiHalaman(arah) { const tData = spjData.filter(i => filterJenis === 'ALL' || String(i.jenisSurat || 'GU') === filterJenis); const totalPages = Math.ceil(tData.length / rowsPerPage); currentPage += arah; if (currentPage < 1) currentPage = 1; if (currentPage > totalPages) currentPage = totalPages; renderTabelSpj(); }

function renderTabelSpj() {
    const tbody = document.getElementById('spjTableBody'); tbody.innerHTML = '';
    
    let filteredData = spjData;
    if (filterJenis !== 'ALL') { filteredData = spjData.filter(item => String(item.jenisSurat || 'GU') === filterJenis); }
    
    const totalData = filteredData.length; const totalPages = Math.ceil(totalData / rowsPerPage) || 1;
    const startIndex = (currentPage - 1) * rowsPerPage; const endIndex = Math.min(startIndex + rowsPerPage, totalData);
    
    const infoEl = document.getElementById('infoHalaman'); const btnPrev = document.getElementById('btnPrevPage'); const btnNext = document.getElementById('btnNextPage');
    if (infoEl) infoEl.innerText = `Hal ${currentPage} dari ${totalPages}`;
    if (btnPrev) btnPrev.disabled = currentPage === 1; if (btnNext) btnNext.disabled = currentPage === totalPages || totalPages === 0;

    const dataHalamanIni = filteredData.slice(startIndex, endIndex);

    if (dataHalamanIni.length === 0) { tbody.innerHTML = `<tr><td colspan="${filterJenis === 'ALL' ? '9' : '8'}" class="text-center py-10 text-slate-500 font-medium">Belum ada data SPJ untuk ditampilkan.</td></tr>`; return; }

    dataHalamanIni.forEach(item => {
        let badge = `<span class="px-2.5 py-1 rounded-full border border-slate-200 font-bold text-slate-600 bg-slate-100 text-[10px] tracking-wide">MENUNGGU</span>`;
        if(item.status === 'DISETUJUI') badge = `<span class="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[10px] tracking-wide">DISETUJUI</span>`;
        if(item.status === 'REVISI') badge = `<span class="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200 text-[10px] tracking-wide">REVISI</span>`;
        if(item.status === 'DITOLAK') badge = `<span class="px-2.5 py-1 rounded-full bg-red-50 text-red-700 font-bold border border-red-200 text-[10px] tracking-wide">DITOLAK</span>`;
        if(item.status === 'SUDAH DIPINDAHBUKUKAN') badge = `<span class="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200 text-[10px] tracking-wide">SELESAI PB</span>`;
        
        let jenisSurat = String(item.jenisSurat || 'GU');
        let jenisBadge = jenisSurat === 'LS' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200';
        let actionBtnText = sesiAktif.role === 'VERIFIKATOR' ? 'Verifikasi' : 'Detail'; 
        let actionBtnColor = sesiAktif.role === 'VERIFIKATOR' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-800 hover:bg-slate-900';
        let tdJenisHtml = filterJenis === 'ALL' ? `<td class="py-4 px-4 text-xs align-top text-center whitespace-nowrap"><span class="px-2 py-1 rounded-md border font-bold text-[10px] ${jenisBadge}">${jenisSurat}</span></td>` : ``;

        // BUG TOMBOL DETAIL TERATASI: Dihilangkan class 'relative z-10' dari <tr> yang menghalangi klik
        tbody.innerHTML += `
            <tr class="hover:bg-slate-50/50 border-b border-slate-100 transition-colors">
                <td class="py-4 px-4 text-xs align-top whitespace-nowrap text-slate-500">${String(item.createdAt || '-').split('T')[0]}</td>
                <td class="py-4 px-4 text-xs align-top font-bold text-slate-800 max-w-[150px] whitespace-normal break-words">${String(item.npd || '-')}</td>
                ${tdJenisHtml}
                <td class="py-4 px-4 text-xs align-top whitespace-nowrap">${String(item.pptk || '-')}<br><span class="text-[10px] text-slate-500">${String(item.unitKerja || '-')}</span></td>
                <td class="py-4 px-4 text-xs align-top leading-relaxed min-w-[250px] whitespace-normal break-words"><span class="font-bold text-slate-800">${String(item.program || '-')}</span><br><span class="text-slate-500">${String(item.kegiatan || '-')}</span><br><span class="text-[10px] text-slate-400">${String(item.subKegiatan || '-')}</span></td>
                <td class="py-4 px-4 text-xs align-top text-slate-600 max-w-[200px] whitespace-normal break-words" title="${String(item.uraian || '-')}">${String(item.uraian || '-')}</td>
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


// ==========================================
// LOGIKA CRUD MASTER DATA & AUTO-SAVE
// ==========================================
function saveDatabaseToLocal() {
    localStorage.setItem("LOCAL_DATABASE_AKUN", JSON.stringify(DATABASE_AKUN));
}

function switchTabAdmin(tabName) {
    document.querySelectorAll('.admin-tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.admin-tab-btn').forEach(el => {
        el.classList.remove('bg-blue-600/20', 'text-blue-400', 'border-blue-500/30');
        el.classList.add('hover:bg-slate-700/50', 'hover:text-white');
    });
    const activeTab = document.getElementById(`tab-content-${tabName}`); const activeBtn = document.getElementById(`tab-btn-${tabName}`);
    if(activeTab) { activeTab.classList.remove('hidden'); activeTab.classList.add('flex'); }
    if(activeBtn) { activeBtn.classList.add('bg-blue-600/20', 'text-blue-400', 'border-blue-500/30'); activeBtn.classList.remove('hover:bg-slate-700/50', 'hover:text-white'); }
}

function renderTabelAkunAdmin() {
    const tbody = document.getElementById('tabelAkunBody'); const tbPptk = document.getElementById('tabelPptkBody');
    if (!tbody || !tbPptk) return; tbody.innerHTML = ''; tbPptk.innerHTML = '';

    DATABASE_AKUN.forEach((akun, index) => {
        // TABEL PPTK (Hanya PPTK)
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
        
        // TABEL AKUN LOGIN (Semua Akun)
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
    isiDropdownPptkUtama(); // Update Dropdown Buat SPJ
}

// FUNGSI PPTK (Nama & NIP)
function simpanDataPptk() {
    const nama = document.getElementById('pptkNama').value; const nip = document.getElementById('pptkNip').value; 
    if(!nama) { alert('Nama Lengkap wajib diisi!'); return; }
    
    if (editIndexPptk > -1) {
        DATABASE_AKUN[editIndexPptk].namaLengkap = nama; DATABASE_AKUN[editIndexPptk].nip = nip;
    } else {
        // Buat data baru yang bertindak sebagai PPTK tapi belum punya username (kosong)
        DATABASE_AKUN.push({ username: "", password: "", role: "PPTK", namaLengkap: nama, nip: nip });
    }
    
    saveDatabaseToLocal(); // Simpan Otomatis
    resetFormPptk(); renderTabelAkunAdmin(); showToast('Data PPTK Tersimpan & bisa langsung dipakai.');
}

function editDataPptk(index) {
    editIndexPptk = index; const ak = DATABASE_AKUN[index];
    document.getElementById('titleFormPptk').innerHTML = `<i class="fa-solid fa-pen text-emerald-600"></i> Edit Data PPTK`;
    document.getElementById('pptkNama').value = ak.namaLengkap || ""; document.getElementById('pptkNip').value = ak.nip || ""; 
}
function resetFormPptk() {
    editIndexPptk = -1; document.getElementById('titleFormPptk').innerHTML = `<i class="fa-solid fa-plus-circle text-emerald-600"></i> Tambah / Edit PPTK`;
    document.getElementById('pptkNama').value = ""; document.getElementById('pptkNip').value = "";
}

// FUNGSI AKUN (Username, Pass, Role)
function simpanDataAkun() {
    const nama = document.getElementById('akunNama').value; const user = document.getElementById('akunUsername').value;
    const pass = document.getElementById('akunPassword').value; const role = document.getElementById('akunRole').value;
    if(!nama || !user || !pass) { alert('Harap isi semua kolom nama, username, dan password!'); return; }
    
    if (editIndexAkun > -1) {
        DATABASE_AKUN[editIndexAkun].namaLengkap = nama; DATABASE_AKUN[editIndexAkun].username = user;
        DATABASE_AKUN[editIndexAkun].password = pass; DATABASE_AKUN[editIndexAkun].role = role;
    } else { DATABASE_AKUN.push({ username: user, password: pass, role: role, namaLengkap: nama }); }
    
    saveDatabaseToLocal(); // Simpan Otomatis
    resetFormAkun(); renderTabelAkunAdmin(); showToast('Akun Tersimpan & bisa langsung digunakan login.');
}

function editDataAkun(index) {
    editIndexAkun = index; const ak = DATABASE_AKUN[index];
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
    if(confirm('Anda yakin ingin menghapus data ini?')) { 
        DATABASE_AKUN.splice(index, 1); 
        saveDatabaseToLocal(); // Simpan otomatis penghapusan
        renderTabelAkunAdmin(); showToast('Berhasil dihapus permanen.'); 
    }
}


function bukaModalSuperAdmin() {
    const profileDd = document.getElementById('profileDropdown'); if(profileDd) profileDd.classList.add('hidden'); 
    renderTabelAkunAdmin(); switchTabAdmin('pptk'); openModal('modalSuperAdmin');
}

// ==========================================
// FUNGSI UMUM LAINNYA
// ==========================================
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
function showToast(msg) { const toast = document.getElementById('toast'); document.getElementById('toastMessage').innerText = msg; toast.classList.remove('translate-y-20', 'opacity-0'); setTimeout(() => toast.classList.add('translate-y-20', 'opacity-0'), 3500); }

function jadikanLink(textUrl, idItem) {
    if (!textUrl || textUrl === "-") {
        return `<span class="text-slate-400 italic block mb-2">Belum dilampirkan</span>
                <a href="https://docs.google.com/forms/d/e/1FAIpQLSfCvsVCiHDjMtDos9giKhhljCFlfXuWNbC5wgP_IXsmBGyqPw/viewform?usp=pp_url&entry.1525941067=${idItem}" target="_blank" class="px-2 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-[10px] font-bold inline-block border border-blue-200"><i class="fa-solid fa-cloud-arrow-up me-1"></i> Upload Berkas</a>`;
    }
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return textUrl.replace(urlRegex, '<a href="$1" target="_blank" class="text-blue-600 underline font-bold bg-blue-50 px-2 py-1 rounded inline-block mt-1"><i class="fa-solid fa-download me-1"></i> Buka Berkas</a>');
}

function bukaModalVerifikasi(id) {
    activeSelectedId = id; const item = spjData.find(i => String(i.id) === String(id)); if(!item) return;

    document.getElementById('detailUraian').innerText = String(item.uraian || '-');
    document.getElementById('detailPptkNama').innerText = String(item.pptk || "-");
    document.getElementById('detailUnitKerja').innerText = String(item.unitKerja || "-");
    document.getElementById('detailEmailPptk').innerText = String(item.emailPptk || "-");
    document.getElementById('detailNominal').innerText = formatRupiah(item.nominal || 0);
    
    const boxBerkas = document.getElementById('berkas-area-gu');
    if (String(item.jenisSurat) === 'LS') {
        boxBerkas.innerHTML = `<div class="text-sm"><span class="font-bold text-slate-700 block mb-1">1. Kwitansi Kontrak / SPK</span><div id="linkDokKeuangan"></div></div><div class="text-sm mt-3"><span class="font-bold text-slate-700 block mb-1">2. Berkas Pencairan LS</span><div id="linkDokSpj"></div></div>`;
    } else {
        boxBerkas.innerHTML = `<div class="text-sm"><span class="font-bold text-slate-700 block mb-1">1. Dok. Keuangan (SPP/SPM/Pajak)</span><div id="linkDokKeuangan"></div></div><div class="text-sm mt-3"><span class="font-bold text-slate-700 block mb-1">2. SPJ Fungsional (Kwitansi/Nota/Absen)</span><div id="linkDokSpj"></div></div>`;
    }
    document.getElementById('linkDokKeuangan').innerHTML = jadikanLink(item.linkKeuangan, item.id); document.getElementById('linkDokSpj').innerHTML = jadikanLink(item.linkSpj, item.id); document.getElementById('linkDokRevisi').innerHTML = jadikanLink(item.linkRevisi, item.id);

    const buktiPbBox = document.getElementById('detailBuktiPbBox');
    if (item.status === 'SUDAH DIPINDAHBUKUKAN' && item.buktiPb) {
        document.getElementById('detailBuktiPbTeks').innerText = `No PB: ${item.noPb} (${item.tglPb})`;
        let buktiLink = String(item.buktiPb || '');
        if(buktiLink.startsWith('http')) { document.getElementById('detailBuktiPbLink').innerHTML = `<a href="${buktiLink}" target="_blank" class="text-blue-600 underline font-bold">Buka Lampiran Bukti PB</a>`; } 
        else { document.getElementById('detailBuktiPbLink').innerHTML = `<span class="text-slate-700 font-bold">Kata Kunci Arsip: ${buktiLink}</span>`; }
        buktiPbBox.classList.remove('hidden');
    } else { buktiPbBox.classList.add('hidden'); }

    let logHtml = '<div class="relative border-l-2 border-slate-100 ml-2 mt-3 pb-2">'; 
    const safeRiwayat = String(item.riwayatLog || '');
    if (safeRiwayat.trim() !== "") { 
        let logEntries = [];
        safeRiwayat.split('\n').forEach(line => { let trimmed = line.trim(); if (!trimmed) return; if (/^\[\d{2}\/\d{2}\/\d{4}/.test(trimmed)) { logEntries.push(trimmed); } else { if (logEntries.length > 0) { logEntries[logEntries.length - 1] += '<br>' + trimmed; } else { logEntries.push(trimmed); } } });
        logEntries.forEach((line) => { 
            let dotColor = 'bg-slate-300 ring-slate-100'; let innerHtml = line; let match = line.match(/^(\[[^\]]+\])\s*(.*)$/);
            if (match) {
                let tanggal = match[1]; let isiHtml = match[2];
                if (isiHtml.includes('- Catatan:')) { let parts = isiHtml.split('- Catatan:'); let isiCatatan = parts[1].trim(); isiHtml = `<span class="text-slate-700 font-semibold">${parts[0].trim()}</span><div class="mt-1.5 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] leading-relaxed shadow-sm"><i class="fa-solid fa-circle-exclamation me-1 text-amber-600"></i> <b class="text-amber-900">Catatan:</b><br>${isiCatatan}</div>`; dotColor = 'bg-amber-500 ring-amber-100'; } 
                else if (isiHtml.includes('REVISI') || isiHtml.includes('DITOLAK')) { dotColor = 'bg-amber-500 ring-amber-100'; isiHtml = `<span class="text-amber-700 font-semibold">${isiHtml}</span>`; } 
                else if (isiHtml.includes('DISETUJUI') || isiHtml.includes('SELESAI')) { dotColor = 'bg-emerald-500 ring-emerald-100'; isiHtml = `<span class="text-emerald-700 font-semibold">${isiHtml}</span>`; } else { isiHtml = `<span class="text-slate-600">${isiHtml}</span>`; }
                innerHtml = `<span class="text-[10px] font-bold text-slate-400 block mb-0.5">${tanggal}</span>${isiHtml}`;
            } else { innerHtml = `<span class="text-slate-500 italic block mt-1 pl-2 border-l-2 border-slate-300">${line}</span>`; dotColor = 'bg-transparent ring-transparent'; }
            logHtml += `<div class="relative pl-5 mb-4"><div class="absolute -left-[5px] top-1.5 w-2 h-2 ${dotColor} rounded-full ${dotColor !== 'bg-transparent ring-transparent' ? 'ring-4' : ''}"></div><div class="text-[11px] leading-relaxed">${innerHtml}</div></div>`; 
        }); 
    } else { logHtml += `<div class="relative pl-5"><div class="absolute -left-[5px] top-1.5 w-2 h-2 bg-slate-200 rounded-full ring-4 ring-white"></div><p class="text-[11px] text-slate-400 italic">Belum ada riwayat aktivitas.</p></div>`; }
    logHtml += '</div>'; document.getElementById('detailRiwayatBox').innerHTML = logHtml;
    
    document.getElementById('revisiContainer').classList.add('hidden'); document.getElementById('pindahbukuContainer').classList.add('hidden'); document.getElementById('confirmActionContainer').classList.add('hidden'); document.getElementById('panelPptkRevisi').classList.add('hidden');

    if (sesiAktif.role === 'VERIFIKATOR' || sesiAktif.role === 'SUPER_ADMIN') {
        document.getElementById('panelAksiVerifikator').classList.remove('hidden'); document.getElementById('waContainer').classList.remove('hidden'); document.getElementById('waContainer').classList.add('flex');
        let cleanPhone = String(item.wa || '').replace(/[^0-9]/g, ''); if (cleanPhone.startsWith('0')) { cleanPhone = '62' + cleanPhone.slice(1); } else if (cleanPhone.startsWith('8')) { cleanPhone = '62' + cleanPhone; }        
        let waText = `Yth. PPTK,\nUpdate SPJ (NPD: ${item.npd}):\n*Status: ${item.status}*\n`; if(item.status === 'REVISI' || item.status === 'DITOLAK') waText += `Catatan:\n${String(item.catatanRevisi).replace(/<br>/g, '\n')}\n`;
        document.getElementById('btnSendWa').href = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(waText)}`;
    } else {
        document.getElementById('panelAksiVerifikator').classList.add('hidden'); document.getElementById('waContainer').classList.add('hidden'); document.getElementById('waContainer').classList.remove('flex');
        if(item.status === 'REVISI' || item.status === 'BELUM_DIPROSES') {
            document.getElementById('panelPptkRevisi').classList.remove('hidden');
            if(item.status === 'BELUM_DIPROSES') document.getElementById('teksRevisiPptk').innerText = "Anda masih dapat mengubah data teks sebelum diverifikasi.";
            if(item.status === 'REVISI') document.getElementById('teksRevisiPptk').innerHTML = "Catatan Verifikator: <br>" + String(item.catatanRevisi || "-");
            document.getElementById('btnUploadRevisi').href = `https://docs.google.com/forms/d/e/1FAIpQLSfCvsVCiHDjMtDos9giKhhljCFlfXuWNbC5wgP_IXsmBGyqPw/viewform?usp=pp_url&entry.1525941067=${item.id}`;
        }
    }
    openModal('modalVerify');
}

function bukaFormEdit() {
    const item = spjData.find(i => String(i.id) === String(activeSelectedId)); if(!item) return;
    isEditMode = true; editIdTarget = item.id;
    const existingSukses = document.getElementById('pesanSuksesDiv'); if(existingSukses) existingSukses.remove();
    document.getElementById('formNewSpj').classList.remove('hidden');
    try { const parts = String(item.createdAt).split('/'); document.getElementById('inputTanggal').value = `${parts[2]}-${parts[1]}-${parts[0]}`; } catch(e){}
    document.getElementById('inputJenisSurat').value = item.jenisSurat || 'GU'; ubahLabelNpdKontrak();
    document.getElementById('inputNpd').value = item.npd; document.getElementById('inputPptk').value = item.pptk;
    document.getElementById('inputUnitKerja').value = item.unitKerja; document.getElementById('inputEmail').value = item.emailPptk; document.getElementById('inputWa').value = item.wa;
    document.getElementById('inputProgram').value = item.program; updateKegiatanDropdown(); document.getElementById('inputKegiatan').value = item.kegiatan; updateSubkegiatanDropdown(); document.getElementById('inputSubkegiatan').value = item.subKegiatan;
    document.getElementById('inputNominal').value = item.nominal; document.getElementById('inputUraian').value = item.uraian;
    document.getElementById('btnSubmitNew').innerText = "Simpan Perubahan (Edit)";
    closeModal('modalVerify'); openModal('modalNewSpj');
}

function actionSetujui() { pendingStatusChange = 'DISETUJUI'; prosesUpdateStatusAksi(); }
function toggleActionForm(type) {
    pendingStatusChange = type;
    document.getElementById('revisiContainer').classList.add('hidden'); document.getElementById('pindahbukuContainer').classList.add('hidden'); document.getElementById('confirmActionContainer').classList.remove('hidden');
    if(type === 'REVISI' || type === 'DITOLAK') document.getElementById('revisiContainer').classList.remove('hidden');
    if(type === 'SUDAH DIPINDAHBUKUKAN') document.getElementById('pindahbukuContainer').classList.remove('hidden');
}
function prosesUpdateStatusAksi() {
    let payload = { action: 'update_status', id: activeSelectedId, status: pendingStatusChange, username: sesiAktif.namaLengkap, noPb: '', tglPb: '', catatanRevisi: '', buktiPb: '' };
    if (pendingStatusChange === 'REVISI' || pendingStatusChange === 'DITOLAK') { payload.catatanRevisi = document.getElementById('catatanRevisiInput').value; if(!payload.catatanRevisi) { alert('Catatan wajib diisi!'); return; } } 
    else if (pendingStatusChange === 'SUDAH DIPINDAHBUKUKAN') { payload.noPb = document.getElementById('noPbInput').value; payload.tglPb = document.getElementById('tglPbInput').value; payload.buktiPb = document.getElementById('buktiPbInput').value; if(!payload.noPb || !payload.tglPb) { alert('No PB & Tgl wajib diisi!'); return; } }
    const btn = document.getElementById('btnConfirmAction'); if (btn) { btn.innerText = 'MEMPROSES...'; btn.disabled = true; }
    fetch(CONFIG.APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) })
    .then(res => res.json())
    .then(res => {
        if(res.status === 'success') { showToast(`Sukses memperbarui status.`); tarikDataDariServer(); document.getElementById('confirmActionContainer').classList.add('hidden'); bukaModalVerifikasi(activeSelectedId); } 
        else { alert("GAGAL UPDATE:\n" + res.message); }
    })
    .catch(err => { alert("KONEKSI TERPUTUS:\n" + err.message); })
    .finally(() => { if (btn) { btn.innerText = 'Simpan Keputusan'; btn.disabled = false; } });
}
