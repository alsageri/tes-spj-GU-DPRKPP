// ==========================================
const PAGU_TAHUNAN = 1500000000;  
const PAGU_TRIWULAN = 350000000; 
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw1wVbgJOAIVDnCqzgwe-7fchNnMG3ToSERHdlcE8AV_S27MIKVxgoToDFg2LRrIiY0tA/exec"; 

const DATABASE_AKUN = [
    { username: "ahmad", password: "123", role: "PPTK", namaLengkap: "Ir. Ahmad Fauzi (Perumahan)" },
    { username: "budi", password: "123", role: "PPTK", namaLengkap: "Budi Santoso, S.T. (Permukiman)" },
    { username: "admin", password: "admin123", role: "VERIFIKATOR", namaLengkap: "Admin Keuangan DPRKPP" }
];
// ==========================================

let spjData = []; let referensiData = {}; let activeSelectedId = null; let pendingStatusChange = null;
let userRole = ""; let currentUsername = ""; let currentNamaLengkap = "";
let uploadedFileBase64 = null; let uploadedFileName = null;
let revisiFileBase64 = null; let revisiFileName = null;

function checkLogin() {
    const uname = document.getElementById('username-input').value.trim().toLowerCase();
    const pass = document.getElementById('password-input').value;
    const userFound = DATABASE_AKUN.find(u => u.username === uname && u.password === pass);
    if(userFound) { userRole = userFound.role; currentUsername = userFound.username; currentNamaLengkap = userFound.namaLengkap; masukSistem(); } 
    else { showLoginError("Username atau Password salah!"); }
}
function showLoginError(msg) { const err = document.getElementById('pin-error'); err.innerText = msg; err.classList.remove('hidden'); }
function masukSistem() {
    document.getElementById('login-screen').style.display = 'none'; document.getElementById('main-app').style.display = 'flex';
    document.getElementById('role-badge').innerText = userRole; document.getElementById('user-display').innerText = currentNamaLengkap;
    fetchDataFromGoogleSheets();
}

function fetchDataFromGoogleSheets() {
    document.getElementById('refresh-icon').classList.add('animate-spin');
    fetch(APPS_SCRIPT_URL).then(res => res.json()).then(data => {
        if(data.spj) spjData = data.spj.reverse(); 
        if(data.referensi) referensiData = data.referensi;
        renderApp(); hitungPaguAnggaran(); populateProgramDropdown();
        document.getElementById('refresh-icon').classList.remove('animate-spin');
    }).catch(e => { 
        alert("GAGAL MEMUAT DATA!\nPastikan URL Deploy di app.js sudah benar dan internet stabil.");
        document.getElementById('refresh-icon').classList.remove('animate-spin'); 
    });
}

function hitungPaguAnggaran() {
    let totalPencairan = 0;
    spjData.forEach(item => { if(item.status === 'DIPINDAHBUKUKAN') totalPencairan += Number(item.nominal) || 0; });
    document.getElementById('sisaTahunanVal').innerText = formatRupiah(PAGU_TAHUNAN - totalPencairan);
    document.getElementById('sisaTriwulanVal').innerText = formatRupiah(PAGU_TRIWULAN - totalPencairan);
    document.getElementById('totalCairVal').innerText = formatRupiah(totalPencairan);
}

function populateProgramDropdown() {
    const progSelect = document.getElementById('inputProgram'); progSelect.innerHTML = '<option value="">-- Pilih Program --</option>';
    for (let prog in referensiData) { progSelect.innerHTML += `<option value="${prog}">${prog}</option>`; }
}
function updateKegiatanDropdown() {
    const prog = document.getElementById('inputProgram').value;
    const kegSelect = document.getElementById('inputKegiatan'); const subSelect = document.getElementById('inputSubkegiatan');
    kegSelect.innerHTML = '<option value="">-- Pilih Kegiatan --</option>'; subSelect.innerHTML = '<option value="">-- Pilih Subkegiatan --</option>';
    if(prog && referensiData[prog]) { for (let keg in referensiData[prog]) { kegSelect.innerHTML += `<option value="${keg}">${keg}</option>`; } }
}
function updateSubkegiatanDropdown() {
    const prog = document.getElementById('inputProgram').value; const keg = document.getElementById('inputKegiatan').value; const subSelect = document.getElementById('inputSubkegiatan');
    subSelect.innerHTML = '<option value="">-- Pilih Subkegiatan --</option>';
    if(prog && keg && referensiData[prog][keg]) { referensiData[prog][keg].forEach(sub => { subSelect.innerHTML += `<option value="${sub}">${sub}</option>`; }); }
}

function handleFileUpload(event) {
    const file = event.target.files[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("File terlalu besar! Maksimal 5 MB."); event.target.value = ""; return; }
    const reader = new FileReader();
    reader.onload = function(e) { uploadedFileBase64 = e.target.result; uploadedFileName = file.name; };
    reader.readAsDataURL(file);
}

function submitNewSpjToSheets(e) {
    e.preventDefault();
    if(!uploadedFileBase64) { alert("Pilih file kuitansi (PDF/JPG) terlebih dahulu!"); return; }

    const btn = document.getElementById('btnSubmitNew'); 
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i> Sedang Mengupload (Mohon Tunggu)...'; btn.disabled = true;

    const rawDate = document.getElementById('inputTanggal').value; const [y, m, d] = rawDate.split('-');

    const payload = {
        action: 'create', id: 'SPJ-' + Date.now(), createdAt: `${d}/${m}/${y}`, username: currentNamaLengkap,
        pptk: document.getElementById('inputPptk').value, emailPptk: document.getElementById('inputEmail').value, 
        unitKerja: document.getElementById('inputUnitKerja').value, npd: document.getElementById('inputNpd').value, 
        program: document.getElementById('inputProgram').value, kegiatan: document.getElementById('inputKegiatan').value, 
        subKegiatan: document.getElementById('inputSubkegiatan').value, nominal: document.getElementById('inputNominal').value, 
        uraian: document.getElementById('inputUraian').value, wa: document.getElementById('inputWa').value, 
        status: 'BELUM_DIPROSES', fileBase64: uploadedFileBase64, fileName: uploadedFileName
    };

    fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) })
    .then(res => res.json())
    .then(res => {
        if(res.status === 'success') {
            showToast('Pengajuan & Dokumen Berhasil Disimpan!'); closeModal('modalNewSpj'); 
            document.getElementById('formNewSpj').reset(); uploadedFileBase64 = null; uploadedFileName = null;
            fetchDataFromGoogleSheets();
        } else { alert("💥 SISTEM GAGAL MENYIMPAN!\nPesan Error Server: " + res.message); }
        btn.innerHTML = 'Kirim Pengajuan'; btn.disabled = false;
    })
    .catch(err => { alert("💥 KONEKSI TERPUTUS!\nError: " + err.message); btn.innerHTML = 'Kirim Pengajuan'; btn.disabled = false; });
}

function actionSetujui() { pendingStatusChange = 'DISETUJUI'; submitStatusUpdate(); }
function toggleActionForm(type) {
    pendingStatusChange = type;
    document.getElementById('revisiContainer').classList.add('hidden'); document.getElementById('pindahbukuContainer').classList.add('hidden'); document.getElementById('confirmActionContainer').classList.remove('hidden');
    if(type === 'REVISI') document.getElementById('revisiContainer').classList.remove('hidden');
    if(type === 'DIPINDAHBUKUKAN') document.getElementById('pindahbukuContainer').classList.remove('hidden');
}

function submitStatusUpdate() {
    let payload = { action: 'update_status', id: activeSelectedId, status: pendingStatusChange, username: currentNamaLengkap, noPb: '', tglPb: '', catatanRevisi: '', buktiPb: '' };
    if (pendingStatusChange === 'REVISI') {
        payload.catatanRevisi = document.getElementById('catatanRevisiInput').value; if(!payload.catatanRevisi) { alert('Catatan wajib diisi!'); return; }
    } else if (pendingStatusChange === 'DIPINDAHBUKUKAN') {
        payload.noPb = document.getElementById('noPbInput').value; payload.tglPb = document.getElementById('tglPbInput').value; payload.buktiPb = document.getElementById('buktiPbInput').value;
        if(!payload.noPb || !payload.tglPb) { alert('No PB & Tgl wajib diisi!'); return; }
    }

    const btn = document.getElementById('btnConfirmAction'); btn.innerText = 'Memproses...'; btn.disabled = true;
    fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) }).then(res => res.json()).then(res => {
        if(res.status === 'success') { showToast(`Sukses memperbarui status SPJ.`); closeModal('modalVerify'); fetchDataFromGoogleSheets(); } 
        else { alert("💥 GAGAL UPDATE STATUS:\n" + res.message); }
        btn.innerText = 'Simpan Keputusan'; btn.disabled = false;
    }).catch(err => { alert("💥 KONEKSI TERPUTUS:\n" + err.message); btn.innerText = 'Simpan Keputusan'; btn.disabled = false; });
}

function handleRevisiUpload(event) {
    const file = event.target.files[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("File terlalu besar!"); event.target.value = ""; return; }
    const reader = new FileReader(); reader.onload = function(e) { revisiFileBase64 = e.target.result; revisiFileName = file.name; }; reader.readAsDataURL(file);
}

function submitRevisiPptk() {
    if(!revisiFileBase64) { alert("Pilih file revisi terlebih dahulu!"); return; }
    const btn = document.getElementById('btnSubmitRevisi'); btn.innerHTML = 'Mengirim File...'; btn.disabled = true;
    
    fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'update_revisi', id: activeSelectedId, username: currentNamaLengkap, fileBase64: revisiFileBase64, fileName: revisiFileName }) }).then(res => res.json()).then(res => {
        if(res.status === 'success') { showToast(`Berkas Revisi Terkirim.`); closeModal('modalVerify'); fetchDataFromGoogleSheets(); revisiFileBase64 = null; revisiFileName = null; } 
        else { alert("💥 GAGAL UPLOAD REVISI:\n" + res.message); }
        btn.innerText = 'Kirim Berkas Perbaikan'; btn.disabled = false; 
    }).catch(err => { alert("💥 KONEKSI TERPUTUS:\n" + err.message); btn.innerText = 'Kirim Berkas Perbaikan'; btn.disabled = false; });
}

function formatRupiah(amount) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount); }
function renderApp() {
    const tbody = document.getElementById('spjTableBody'); tbody.innerHTML = '';
    spjData.forEach(item => {
        let badge = `<span class="px-2 py-1 rounded bg-slate-200 text-xs">${item.status}</span>`;
        if(item.status === 'DISETUJUI') badge = `<span class="px-2 py-1 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">Disetujui</span>`;
        if(item.status === 'BELUM_DIPROSES') badge = `<span class="px-2 py-1 rounded border border-slate-300 font-bold text-slate-600 bg-slate-50">Menunggu</span>`;
        if(item.status === 'REVISI') badge = `<span class="px-2 py-1 rounded bg-amber-100 text-amber-800 font-bold border border-amber-200 shadow-sm">Revisi</span>`;
        if(item.status === 'DIPINDAHBUKUKAN') badge = `<span class="px-2 py-1 rounded bg-blue-100 text-blue-800 font-bold border border-blue-200">PB: ${item.noPb}</span>`;

        let actionBtnText = userRole === 'VERIFIKATOR' ? 'Verifikasi' : 'Detail';
        let actionBtnColor = userRole === 'VERIFIKATOR' ? 'bg-emerald-600' : 'bg-slate-600';

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 border-b whitespace-nowrap">
                <td class="py-3 px-4 text-xs font-semibold">${String(item.npd || '-')}<br><span class="text-[10px] text-slate-500 font-normal">${String(item.createdAt || '-')}</span></td>
                <td class="py-3 px-4 text-xs">${String(item.pptk || '-')}<br><span class="text-[10px] text-slate-500">${String(item.unitKerja || '-')}</span></td>
                <td class="py-3 px-4 text-xs">${String(item.program || '-')}<br><span class="text-[10px] text-slate-500">${String(item.kegiatan || '-')}</span></td>
                <td class="py-3 px-4 text-xs max-w-[200px] truncate" title="${String(item.uraian || '-')}">${String(item.uraian || '-')}</td>
                <td class="py-3 px-4 text-xs text-right font-bold">${formatRupiah(item.nominal)}</td>
                <td class="py-3 px-4 text-center text-[11px]">${badge}</td>
                <td class="py-3 px-4 text-xs text-slate-600">${String(item.noPb || '-')}</td>
                <td class="py-3 px-4 text-center"><button onclick="openVerifyModal('${String(item.id)}')" class="px-3 py-1.5 ${actionBtnColor} text-white rounded text-xs font-bold">${actionBtnText}</button></td>
            </tr>
        `;
    });
}

function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

function openVerifyModal(id) {
    activeSelectedId = id; const item = spjData.find(i => String(i.id) === String(id)); if(!item) return;

    document.getElementById('detailUraian').innerText = String(item.uraian || '-');
    document.getElementById('detailPptk').innerText = String(item.pptk || "-") + " (" + String(item.emailPptk || "-") + ")";
    document.getElementById('detailProgKeg').innerText = String(item.program || "-") + " / " + String(item.kegiatan || "-");
    
    let safeLink = String(item.link || ''); if(safeLink && !safeLink.startsWith('http')) safeLink = 'https://' + safeLink;
    const linkElem = document.getElementById('detailLink');
    if(safeLink) { linkElem.href = safeLink; linkElem.innerText = "Buka Berkas Google Drive"; linkElem.classList.remove('pointer-events-none', 'text-slate-400'); } 
    else { linkElem.href = "#"; linkElem.innerText = "Link tidak tersedia"; linkElem.classList.add('pointer-events-none', 'text-slate-400'); }

    const buktiPbBox = document.getElementById('detailBuktiPbBox');
    if (item.status === 'DIPINDAHBUKUKAN' && item.buktiPb) {
        document.getElementById('detailBuktiPbTeks').innerText = `No PB: ${item.noPb} (${item.tglPb})`;
        let buktiLink = String(item.buktiPb || '');
        if(buktiLink.startsWith('http')) { document.getElementById('detailBuktiPbLink').innerHTML = `<a href="${buktiLink}" target="_blank" class="text-blue-600 underline font-bold">Buka Lampiran Bukti PB</a>`; } 
        else { document.getElementById('detailBuktiPbLink').innerHTML = `<span class="text-slate-700 font-bold">Kata Kunci Arsip: ${buktiLink}</span>`; }
        buktiPbBox.classList.remove('hidden');
    } else { buktiPbBox.classList.add('hidden'); }

    let logHtml = ""; const safeRiwayat = String(item.riwayatLog || '');
    if (safeRiwayat.trim() !== "") { safeRiwayat.split('\n').forEach(line => { if(line.trim() !== "") logHtml += `<div class="bg-white p-2.5 rounded text-[11px] text-slate-700 shadow-sm border border-slate-200 mb-1.5"><i class="fa-solid fa-clock-rotate-left me-1 text-slate-400"></i> ${line}</div>`; }); }
    document.getElementById('detailRiwayatBox').innerHTML = logHtml || '<p class="text-xs text-slate-400 italic">Belum ada aktivitas.</p>';

    document.getElementById('revisiContainer').classList.add('hidden'); document.getElementById('pindahbukuContainer').classList.add('hidden'); document.getElementById('confirmActionContainer').classList.add('hidden'); document.getElementById('panelPptkRevisi').classList.add('hidden');

    if (userRole === 'VERIFIKATOR') {
        document.getElementById('panelAksiVerifikator').classList.remove('hidden'); document.getElementById('waContainer').classList.remove('hidden');
        let cleanPhone = String(item.wa || '').replace(/[^0-9]/g, ''); if(cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);
        let waText = `Yth. PPTK,\nUpdate SPJ (NPD: ${item.npd}):\n*Status: ${item.status}*\n`;
        if(item.status === 'REVISI') waText += `Catatan: ${item.catatanRevisi}\n`;
        if(item.status === 'DIPINDAHBUKUKAN') waText += `No PB: ${item.noPb}\nBukti: ${item.buktiPb}\n`;
        document.getElementById('btnSendWa').href = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(waText)}`;
    } else {
        document.getElementById('panelAksiVerifikator').classList.add('hidden'); document.getElementById('waContainer').classList.add('hidden');
        if(item.status === 'REVISI') document.getElementById('panelPptkRevisi').classList.remove('hidden');
    }
    openModal('modalVerify');
}

function showToast(msg) { const toast = document.getElementById('toast'); document.getElementById('toastMessage').innerText = msg; toast.classList.remove('translate-y-20', 'opacity-0'); setTimeout(() => toast.classList.add('translate-y-20', 'opacity-0'), 3500); }
