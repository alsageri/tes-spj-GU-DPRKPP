// ==========================================
// PENGATURAN SISTEM & DATABASE AKUN
// ==========================================
const PAGU_TAHUNAN = 1500000000;  // Rp 1.5 Miliar (Sesuaikan)
const PAGU_TRIWULAN = 350000000; // Rp 350 Juta (Sesuaikan)
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzIbYYWrfmOhfH0VgqPLF1VfqBI9JS0Td6UO2gm4WiqS_GyTx2ES6EMQz7HRBf2Stsyrg/exec"; 

// DATABASE AKUN (Username & Password Berbeda)
const DATABASE_AKUN = [
    { username: "geri", password: "perumahan", role: "PPTK", namaLengkap: "Ir. geri  (Perumahan)" },
    { username: "dayat", password: "bangkim", role: "PPTK", namaLengkap: "Putra Nurhidayat, S.T. (Permukiman)" },
    { username: "indah", password: "sekretariat", role: "PPTK", namaLengkap: "indah dwi septami (Sekretariat)" },
    { username: "Vivi", password: "keu", role: "PPTK", namaLengkap: "Vivi okta (Keuangan)" },
    { username: "haliza", password: "admin123", role: "VERIFIKATOR", namaLengkap: "Admin Keuangan DPRKPP" }
];
// ==========================================

let spjData = [];
let activeSelectedId = null;
let pendingStatusChange = null;
let userRole = ""; 
let currentUsername = "";
let currentNamaLengkap = "";

// 1. SISTEM LOGIN MULTI-AKUN
function checkLogin() {
    const uname = document.getElementById('username-input').value.trim().toLowerCase();
    const pass = document.getElementById('password-input').value;
    
    // Cari user di database
    const userFound = DATABASE_AKUN.find(u => u.username === uname && u.password === pass);

    if(userFound) {
        userRole = userFound.role;
        currentUsername = userFound.username;
        currentNamaLengkap = userFound.namaLengkap;
        masukSistem();
    } else {
        showLoginError("Username atau Password salah!");
    }
}

function showLoginError(msg) {
    const err = document.getElementById('pin-error');
    err.innerText = msg; err.classList.remove('hidden');
}

function masukSistem() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-app').style.display = 'flex';
    document.getElementById('role-badge').innerText = userRole;
    document.getElementById('user-display').innerText = currentNamaLengkap;
    fetchDataFromGoogleSheets();
}

// 2. AMBIL DATA & HITUNG SISA ANGGARAN
function fetchDataFromGoogleSheets() {
    document.getElementById('refresh-icon').classList.add('animate-spin');
    fetch(APPS_SCRIPT_URL).then(res => res.json()).then(data => {
        spjData = data.reverse(); 
        renderApp();
        hitungPaguAnggaran();
        document.getElementById('refresh-icon').classList.remove('animate-spin');
    }).catch(e => {
        showToast("Gagal mengambil data database.");
        document.getElementById('refresh-icon').classList.remove('animate-spin');
    });
}

function hitungPaguAnggaran() {
    // Hanya jumlahkan nominal yang statusnya DIPINDAHBUKUKAN
    let totalPencairan = 0;
    spjData.forEach(item => {
        if(item.status === 'DIPINDAHBUKUKAN') {
            totalPencairan += Number(item.nominal) || 0;
        }
    });

    const sisaTahunan = PAGU_TAHUNAN - totalPencairan;
    const sisaTriwulan = PAGU_TRIWULAN - totalPencairan;

    document.getElementById('sisaTahunanVal').innerText = formatRupiah(sisaTahunan);
    document.getElementById('sisaTriwulanVal').innerText = formatRupiah(sisaTriwulan);
    document.getElementById('totalCairVal').innerText = formatRupiah(totalPencairan);
}

// 3. SIMPAN SPJ BARU
function submitNewSpjToSheets(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSubmitNew');
    btn.innerHTML = 'Menyimpan...'; btn.disabled = true;

    const rawDate = document.getElementById('inputTanggal').value;
    const [y, m, d] = rawDate.split('-');

    const payload = {
        action: 'create', id: 'SPJ-' + Date.now(), createdAt: `${d}/${m}/${y}`,
        username: currentNamaLengkap, pptk: document.getElementById('inputPptk').value, 
        emailPptk: document.getElementById('inputEmail').value, unitKerja: document.getElementById('inputUnitKerja').value, 
        npd: document.getElementById('inputNpd').value, program: document.getElementById('inputProgram').value, 
        kegiatan: document.getElementById('inputKegiatan').value, subKegiatan: document.getElementById('inputSubkegiatan').value,
        nominal: document.getElementById('inputNominal').value, uraian: document.getElementById('inputUraian').value, 
        wa: document.getElementById('inputWa').value, link: document.getElementById('inputLink').value, status: 'BELUM_DIPROSES'
    };

    fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) })
        .then(res => res.json()).then(res => {
            showToast('Pengajuan Berhasil Dikirim!'); closeModal('modalNewSpj'); 
            document.getElementById('formNewSpj').reset();
            btn.innerHTML = 'Kirim Pengajuan'; btn.disabled = false; fetchDataFromGoogleSheets();
        });
}

// 4. AKSI VERIFIKATOR (Termasuk Bukti PB)
function actionSetujui() { pendingStatusChange = 'DISETUJUI'; submitStatusUpdate(); }

function toggleActionForm(type) {
    pendingStatusChange = type;
    document.getElementById('revisiContainer').classList.add('hidden');
    document.getElementById('pindahbukuContainer').classList.add('hidden');
    document.getElementById('confirmActionContainer').classList.remove('hidden');
    
    if(type === 'REVISI') document.getElementById('revisiContainer').classList.remove('hidden');
    if(type === 'DIPINDAHBUKUKAN') document.getElementById('pindahbukuContainer').classList.remove('hidden');
}

function submitStatusUpdate() {
    let payload = { action: 'update_status', id: activeSelectedId, status: pendingStatusChange, username: currentNamaLengkap, noPb: '', tglPb: '', catatanRevisi: '', buktiPb: '' };
    
    if (pendingStatusChange === 'REVISI') {
        payload.catatanRevisi = document.getElementById('catatanRevisiInput').value;
        if(!payload.catatanRevisi) { showToast('Catatan wajib diisi!'); return; }
    } else if (pendingStatusChange === 'DIPINDAHBUKUKAN') {
        payload.noPb = document.getElementById('noPbInput').value; 
        payload.tglPb = document.getElementById('tglPbInput').value;
        payload.buktiPb = document.getElementById('buktiPbInput').value;
        if(!payload.noPb || !payload.tglPb || !payload.buktiPb) { showToast('Data Pindahbuku (Termasuk Bukti) wajib diisi lengkap!'); return; }
    }

    const btn = document.getElementById('btnConfirmAction');
    btn.innerText = 'Memproses...'; btn.disabled = true;

    fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) }).then(res => res.json()).then(res => {
        showToast(`Sukses memperbarui status.`);
        closeModal('modalVerify'); fetchDataFromGoogleSheets();
        btn.innerText = 'Simpan Keputusan'; btn.disabled = false;
    });
}

// 5. AKSI PPTK (Upload File Revisi)
function submitRevisiPptk() {
    const newLink = document.getElementById('newLinkInput').value;
    if(!newLink) { showToast('Link Drive wajib diisi!'); return; }
    const btn = document.getElementById('btnSubmitRevisi');
    btn.innerHTML = 'Mengirim...'; btn.disabled = true;

    fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'update_revisi', id: activeSelectedId, username: currentNamaLengkap, newLink: newLink }) })
        .then(res => res.json()).then(res => {
            showToast(`Berkas Revisi Berhasil Dikirim.`);
            closeModal('modalVerify'); fetchDataFromGoogleSheets();
            btn.innerText = 'Kirim Berkas Perbaikan'; btn.disabled = false;
        });
}

// 6. RENDER DASHBOARD TABEL SCROLL HORIZONTAL
function formatRupiah(amount) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount); }

function renderApp() {
    const tbody = document.getElementById('spjTableBody'); tbody.innerHTML = '';
    
    if(spjData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center py-6 text-slate-500">Belum ada data pengajuan.</td></tr>`; return;
    }

    spjData.forEach(item => {
        let badge = `<span class="px-2 py-1 rounded bg-slate-200 text-xs">${item.status}</span>`;
        if(item.status === 'DISETUJUI') badge = `<span class="px-2 py-1 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">Disetujui</span>`;
        if(item.status === 'BELUM_DIPROSES') badge = `<span class="px-2 py-1 rounded border border-slate-300 font-bold text-slate-600 bg-slate-50">Menunggu</span>`;
        if(item.status === 'REVISI') badge = `<span class="px-2 py-1 rounded bg-amber-100 text-amber-800 font-bold border border-amber-200 shadow-sm">Revisi</span>`;
        if(item.status === 'DIPINDAHBUKUKAN') badge = `<span class="px-2 py-1 rounded bg-blue-100 text-blue-800 font-bold border border-blue-200">Selesai PB</span>`;

        let actionBtnText = userRole === 'VERIFIKATOR' ? 'Verifikasi' : 'Detail & Lacak';
        let actionBtnColor = userRole === 'VERIFIKATOR' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-600 hover:bg-slate-700';

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 border-b transition-colors whitespace-nowrap">
                <td class="py-3 px-4 text-xs font-semibold text-slate-800">${String(item.npd || '-')}<br><span class="text-[10px] text-slate-500 font-normal">${String(item.createdAt || '-')}</span></td>
                <td class="py-3 px-4 text-xs">${String(item.pptk || '-')}<br><span class="text-[10px] text-slate-500">${String(item.unitKerja || '-')}</span></td>
                <td class="py-3 px-4 text-xs">${String(item.program || '-')}<br><span class="text-[10px] text-slate-500">${String(item.kegiatan || '-')}</span></td>
                <td class="py-3 px-4 text-xs max-w-[200px] truncate" title="${String(item.uraian || '-')}">${String(item.uraian || '-')}</td>
                <td class="py-3 px-4 text-xs text-right font-bold text-slate-700">${formatRupiah(item.nominal)}</td>
                <td class="py-3 px-4 text-center text-[11px]">${badge}</td>
                <td class="py-3 px-4 text-xs text-slate-600">${String(item.noPb || '-')}</td>
                <td class="py-3 px-4 text-center">
                    <button onclick="openVerifyModal('${String(item.id)}')" class="px-3 py-1.5 ${actionBtnColor} text-white rounded text-xs font-bold shadow-sm transition-all">${actionBtnText}</button>
                </td>
            </tr>
        `;
    });
}

// 7. MODAL & INTERAKSI
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

function openVerifyModal(id) {
    activeSelectedId = id; const item = spjData.find(i => String(i.id) === String(id));
    if(!item) return;

    document.getElementById('detailUraian').innerText = String(item.uraian || '-');
    document.getElementById('detailPptk').innerText = String(item.pptk || "-") + " (" + String(item.emailPptk || "-") + ")";
    document.getElementById('detailProgKeg').innerText = String(item.program || "-") + " / " + String(item.kegiatan || "-");
    
    // Tampilan Link Dokumen Awal
    let safeLink = String(item.link || '');
    if(safeLink && !safeLink.startsWith('http')) safeLink = 'https://' + safeLink;
    const linkElem = document.getElementById('detailLink');
    if(safeLink) { linkElem.href = safeLink; linkElem.innerText = "Buka Berkas Google Drive"; linkElem.classList.remove('pointer-events-none', 'text-slate-400'); } 
    else { linkElem.href = "#"; linkElem.innerText = "Link tidak tersedia"; linkElem.classList.add('pointer-events-none', 'text-slate-400'); }

    // Tampilan Bukti Pindahbuku (Hanya muncul jika sudah ada)
    const buktiPbBox = document.getElementById('detailBuktiPbBox');
    if (item.status === 'DIPINDAHBUKUKAN' && item.buktiPb) {
        document.getElementById('detailBuktiPbTeks').innerText = `No PB: ${item.noPb} (${item.tglPb})`;
        let buktiLink = String(item.buktiPb || '');
        if(buktiLink.startsWith('http')) {
            document.getElementById('detailBuktiPbLink').innerHTML = `<a href="${buktiLink}" target="_blank" class="text-blue-600 underline font-bold">Buka Lampiran Bukti PB</a>`;
        } else {
            document.getElementById('detailBuktiPbLink').innerHTML = `<span class="text-slate-700 font-bold">Kata Kunci Arsip: ${buktiLink}</span>`;
        }
        buktiPbBox.classList.remove('hidden');
    } else {
        buktiPbBox.classList.add('hidden');
    }

    // Riwayat Log
    let logHtml = ""; const safeRiwayat = String(item.riwayatLog || '');
    if (safeRiwayat.trim() !== "") {
        const lines = safeRiwayat.split('\n');
        lines.forEach(line => { 
            if(line.trim() !== "") logHtml += `<div class="bg-white p-2.5 rounded text-[11px] text-slate-700 shadow-sm border border-slate-200 mb-1.5"><i class="fa-solid fa-clock-rotate-left me-1 text-slate-400"></i> ${line}</div>`; 
        });
    }
    document.getElementById('detailRiwayatBox').innerHTML = logHtml || '<p class="text-xs text-slate-400 italic">Belum ada aktivitas riwayat.</p>';

    // Role Management Modal
    document.getElementById('revisiContainer').classList.add('hidden');
    document.getElementById('pindahbukuContainer').classList.add('hidden');
    document.getElementById('confirmActionContainer').classList.add('hidden');
    document.getElementById('panelPptkRevisi').classList.add('hidden');

    if (userRole === 'VERIFIKATOR') {
        document.getElementById('panelAksiVerifikator').classList.remove('hidden');
        document.getElementById('waContainer').classList.remove('hidden');
        
        let cleanPhone = String(item.wa || '').replace(/[^0-9]/g, ''); if(cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);
        let waText = `Yth. PPTK,\nBerikut update dokumen SPJ (NPD: ${item.npd}):\n\n*Status: ${item.status}*\n`;
        if(item.status === 'REVISI') waText += `Catatan: ${item.catatanRevisi}\n`;
        if(item.status === 'DIPINDAHBUKUKAN') waText += `No PB: ${item.noPb}\nBukti: ${item.buktiPb}\n`;
        document.getElementById('btnSendWa').href = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(waText)}`;
    } else {
        document.getElementById('panelAksiVerifikator').classList.add('hidden');
        document.getElementById('waContainer').classList.add('hidden');
        if(item.status === 'REVISI') {
            document.getElementById('panelPptkRevisi').classList.remove('hidden');
            document.getElementById('newLinkInput').value = '';
        }
    }
    openModal('modalVerify');
}

function showToast(msg) {
    const toast = document.getElementById('toast'); document.getElementById('toastMessage').innerText = msg;
    toast.classList.remove('translate-y-20', 'opacity-0'); setTimeout(() => toast.classList.add('translate-y-20', 'opacity-0'), 3500);
}
