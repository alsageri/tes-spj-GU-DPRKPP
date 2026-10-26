// ==========================================
// PENGATURAN SISTEM UTAMA
// ==========================================
const PIN_PPTK = "12345678"; 
const PIN_VERIF = "admin";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxvRgul2aY82kMWIb2ECwkC4OgjJA0MdXmMcOkqM3Of-ZaPiF_IjljdmIstDzJNS6BM5g/exec"; 
// ==========================================

let spjData = [];
let activeSelectedId = null;
let pendingStatusChange = null;
let userRole = ""; 
let currentUsername = "";

// 1. SISTEM LOGIN
function checkPin() {
    const pin = document.getElementById('pin-input').value;
    const uname = document.getElementById('username-input').value.trim();
    if(!uname) { 
        showLoginError("Nama/Username harus diisi!"); 
        return; 
    }

    if(pin === PIN_PPTK) {
        userRole = "PPTK"; currentUsername = uname; masukSistem();
    } else if (pin === PIN_VERIF) {
        userRole = "VERIFIKATOR"; currentUsername = uname; masukSistem();
    } else {
        showLoginError("PIN yang Anda masukkan salah!");
    }
}

function showLoginError(msg) {
    const err = document.getElementById('pin-error');
    err.innerText = msg;
    err.classList.remove('hidden');
}

function masukSistem() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-app').style.display = 'flex';
    document.getElementById('role-badge').innerText = userRole;
    document.getElementById('user-display').innerText = currentUsername;
    fetchDataFromGoogleSheets();
}

// 2. MENGAMBIL DATA DARI GOOGLE SHEETS
function fetchDataFromGoogleSheets() {
    document.getElementById('refresh-icon').classList.add('animate-spin');
    fetch(APPS_SCRIPT_URL)
        .then(res => res.json())
        .then(data => {
            spjData = data.reverse(); 
            renderApp();
            document.getElementById('refresh-icon').classList.remove('animate-spin');
        })
        .catch(e => {
            showToast("Gagal mengambil data dari database.");
            document.getElementById('refresh-icon').classList.remove('animate-spin');
        });
}

// 3. MENYIMPAN SPJ BARU (Dengan Input Tanggal Manual)
function submitNewSpjToSheets(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSubmitNew');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i> Menyimpan...'; 
    btn.disabled = true;

    // Format Tanggal Manual (YYYY-MM-DD ke DD/MM/YYYY)
    const rawDate = document.getElementById('inputTanggal').value;
    const [y, m, d] = rawDate.split('-');
    const formattedDate = `${d}/${m}/${y}`;

    const payload = {
        action: 'create', 
        id: 'SPJ-' + Date.now(), 
        createdAt: formattedDate, // Menggunakan tanggal manual
        username: currentUsername,
        pptk: document.getElementById('inputPptk').value, 
        emailPptk: document.getElementById('inputEmail').value,
        unitKerja: document.getElementById('inputUnitKerja').value, 
        npd: document.getElementById('inputNpd').value, 
        program: document.getElementById('inputProgram').value, 
        kegiatan: document.getElementById('inputKegiatan').value, 
        subKegiatan: document.getElementById('inputSubkegiatan').value,
        nominal: document.getElementById('inputNominal').value, 
        uraian: document.getElementById('inputUraian').value, 
        wa: document.getElementById('inputWa').value, 
        link: document.getElementById('inputLink').value, 
        status: 'BELUM_DIPROSES'
    };

    fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) })
        .then(res => res.json())
        .then(res => {
            showToast('Pengajuan Berhasil Dikirim!');
            closeModal('modalNewSpj'); 
            document.getElementById('formNewSpj').reset();
            btn.innerHTML = 'Kirim Pengajuan'; btn.disabled = false; 
            fetchDataFromGoogleSheets();
        });
}

// 4. AKSI VERIFIKATOR (Logika Pembaruan Status)
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
    let payload = { action: 'update_status', id: activeSelectedId, status: pendingStatusChange, username: currentUsername, noPb: '', tglPb: '', catatanRevisi: '' };
    
    if (pendingStatusChange === 'REVISI') {
        payload.catatanRevisi = document.getElementById('catatanRevisiInput').value;
        if(!payload.catatanRevisi) { showToast('Catatan wajib diisi!'); return; }
    } else if (pendingStatusChange === 'DIPINDAHBUKUKAN') {
        payload.noPb = document.getElementById('noPbInput').value; 
        payload.tglPb = document.getElementById('tglPbInput').value;
        if(!payload.noPb || !payload.tglPb) { showToast('No PB dan Tanggal wajib diisi!'); return; }
    }

    const btn = document.getElementById('btnConfirmAction');
    const oriText = btn.innerText;
    btn.innerText = 'Memproses...'; btn.disabled = true;

    fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) })
        .then(res => res.json())
        .then(res => {
            showToast(`Sukses memperbarui status SPJ.`);
            closeModal('modalVerify'); 
            fetchDataFromGoogleSheets();
            btn.innerText = oriText; btn.disabled = false;
        });
}

// 5. AKSI PPTK (Upload File Revisi)
function submitRevisiPptk() {
    const newLink = document.getElementById('newLinkInput').value;
    if(!newLink) { showToast('Link Drive wajib diisi!'); return; }
    
    const btn = document.getElementById('btnSubmitRevisi');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i> Mengirim...'; btn.disabled = true;

    const payload = { action: 'update_revisi', id: activeSelectedId, username: currentUsername, newLink: newLink };

    fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) })
        .then(res => res.json())
        .then(res => {
            showToast(`Berkas Revisi Berhasil Dikirim.`);
            closeModal('modalVerify'); 
            fetchDataFromGoogleSheets();
            btn.innerText = 'Kirim Berkas Perbaikan'; btn.disabled = false;
        });
}

// 6. RENDER DASHBOARD TABEL UTAMA (LEBIH RINCI)
function formatRupiah(amount) { 
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount); 
}

function renderApp() {
    const tbody = document.getElementById('spjTableBody'); 
    tbody.innerHTML = '';
    
    if(spjData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-slate-500">Belum ada data pengajuan.</td></tr>`;
        return;
    }

    spjData.forEach(item => {
        let badge = `<span class="px-2 py-1 rounded bg-slate-200 text-xs">${item.status}</span>`;
        if(item.status === 'DISETUJUI') badge = `<span class="px-2 py-1 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">Disetujui</span>`;
        if(item.status === 'BELUM_DIPROSES') badge = `<span class="px-2 py-1 rounded border border-slate-300 font-bold text-slate-600 bg-slate-50">Menunggu</span>`;
        if(item.status === 'REVISI') badge = `<span class="px-2 py-1 rounded bg-amber-100 text-amber-800 font-bold border border-amber-200 shadow-sm">Revisi</span>`;
        if(item.status === 'DIPINDAHBUKUKAN') badge = `<span class="px-2 py-1 rounded bg-blue-100 text-blue-800 font-bold border border-blue-200">PB: ${item.noPb}</span>`;

        let actionBtnText = userRole === 'VERIFIKATOR' ? '<i class="fa-solid fa-list-check"></i> Verifikasi' : '<i class="fa-solid fa-eye"></i> Detail';
        let actionBtnColor = userRole === 'VERIFIKATOR' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-600 hover:bg-slate-700';

        // Mencegah error tipe data (Fix Bug Tombol Mati)
        const safeNpd = String(item.npd || '-');
        const safeDate = String(item.createdAt || '-');
        const safePptk = String(item.pptk || '-');
        const safeProg = String(item.program || '-');
        const safeKeg = String(item.kegiatan || '-');

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 border-b transition-colors">
                <td class="py-3 px-4 text-xs font-semibold text-slate-800">${safeNpd}<br><span class="text-[10px] text-slate-500 font-normal">${safeDate}</span></td>
                <td class="py-3 px-4 text-xs">${safePptk}<br><span class="text-[10px] text-slate-500">${String(item.unitKerja || '-')}</span></td>
                <td class="py-3 px-4 text-xs max-w-[150px] truncate" title="${safeProg} / ${safeKeg}">${safeProg}<br><span class="text-[10px] text-slate-500">${safeKeg}</span></td>
                <td class="py-3 px-4 text-xs max-w-xs truncate" title="${String(item.uraian || '-')}">${String(item.uraian || '-')}</td>
                <td class="py-3 px-4 text-xs text-right font-bold text-slate-700">${formatRupiah(item.nominal)}</td>
                <td class="py-3 px-4 text-center text-[11px]">${badge}</td>
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
    activeSelectedId = id; 
    const item = spjData.find(i => String(i.id) === String(id));
    if(!item) return;

    document.getElementById('detailUraian').innerText = String(item.uraian || '-');
    document.getElementById('detailPptk').innerText = String(item.pptk || "-") + " (" + String(item.emailPptk || "-") + ")";
    document.getElementById('detailProgKeg').innerText = String(item.program || "-") + " / " + String(item.kegiatan || "-") + " / " + String(item.subKegiatan || "-");
    
    // Perbaikan URL Link 
    let safeLink = String(item.link || '');
    if(safeLink && !safeLink.startsWith('http')) safeLink = 'https://' + safeLink;
    const linkElem = document.getElementById('detailLink');
    if(safeLink) {
        linkElem.href = safeLink;
        linkElem.innerText = "Buka Berkas Google Drive";
        linkElem.classList.remove('pointer-events-none', 'text-slate-400');
    } else {
        linkElem.href = "#";
        linkElem.innerText = "Link tidak tersedia";
        linkElem.classList.add('pointer-events-none', 'text-slate-400');
    }

    // Fix Bug: Hindari error saat riwayatLog kosong atau dibaca sebagai angka
    let logHtml = "";
    const safeRiwayat = String(item.riwayatLog || '');
    if (safeRiwayat.trim() !== "") {
        const lines = safeRiwayat.split('\n');
        lines.forEach(line => { 
            if(line.trim() !== "") {
                logHtml += `<div class="bg-white p-2.5 rounded text-[11px] text-slate-700 shadow-sm border border-slate-200 mb-1.5"><i class="fa-solid fa-clock-rotate-left me-1 text-slate-400"></i> ${line}</div>`; 
            }
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
        
        // Fix Bug: Hindari error WA karena data nomor dari Sheets berupa Integer
        let cleanPhone = String(item.wa || '').replace(/[^0-9]/g, ''); 
        if(cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);
        
        let waText = `Yth. PPTK,\nBerikut update dokumen SPJ Anda (NPD: ${item.npd}):\n\n*Status: ${item.status}*\n`;
        if(item.status === 'REVISI') waText += `Catatan: ${item.catatanRevisi}\n`;
        if(item.status === 'DIPINDAHBUKUKAN') waText += `No PB: ${item.noPb}\nTanggal PB: ${item.tglPb}\n`;
        
        document.getElementById('btnSendWa').href = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(waText)}`;
    } else {
        document.getElementById('panelAksiVerifikator').classList.add('hidden');
        document.getElementById('waContainer').classList.add('hidden');
        
        // Opsi Upload Revisi bagi PPTK
        if(item.status === 'REVISI') {
            document.getElementById('panelPptkRevisi').classList.remove('hidden');
            document.getElementById('newLinkInput').value = '';
        }
    }

    openModal('modalVerify');
}

function showToast(msg) {
    const toast = document.getElementById('toast'); 
    document.getElementById('toastMessage').innerText = msg;
    toast.classList.remove('translate-y-20', 'opacity-0'); 
    setTimeout(() => toast.classList.add('translate-y-20', 'opacity-0'), 3500);
}
