// File: app.js (Logika Aplikasi & Tabel Bersih)

let spjData = []; let referensiData = {}; 
let activeSelectedId = null; let pendingStatusChange = null;
let sesiAktif = { role: "", username: "", namaLengkap: "" };

function checkLogin() {
    const uname = document.getElementById('username-input').value.trim().toLowerCase();
    const pass = document.getElementById('password-input').value;
    const userFound = DATABASE_AKUN.find(u => u.username === uname && u.password === pass);
    if(userFound) { 
        sesiAktif = { role: userFound.role, username: userFound.username, namaLengkap: userFound.namaLengkap };
        masukSistem(); 
    } else { 
        document.getElementById('pin-error').innerText = "Username atau Password salah!";
        document.getElementById('pin-error').classList.remove('hidden'); 
    }
}

function masukSistem() {
    document.getElementById('login-screen').style.display = 'none'; 
    document.getElementById('main-app').style.display = 'flex';
    document.getElementById('role-badge').innerText = sesiAktif.role; 
    document.getElementById('user-display').innerText = sesiAktif.namaLengkap;
    tarikDataDariServer();
}

function tarikDataDariServer() {
    document.getElementById('refresh-icon').classList.add('animate-spin');
    fetch(CONFIG.APPS_SCRIPT_URL)
        .then(res => res.json())
        .then(data => {
            if(data.spj) spjData = data.spj.reverse(); 
            if(data.referensi) referensiData = data.referensi;
            renderTabelSpj(); hitungAnggaran(); isiDropdownProgram();
            document.getElementById('refresh-icon').classList.remove('animate-spin');
        })
        .catch(e => { 
            alert("Gagal memuat data dari server!"); 
            document.getElementById('refresh-icon').classList.remove('animate-spin'); 
        });
}

function hitungAnggaran() {
    let totalPencairan = 0;
    // Diperbarui ke status yang baru
    spjData.forEach(item => { if(item.status === 'SUDAH DIPINDAHBUKUKAN') totalPencairan += Number(item.nominal) || 0; });
    document.getElementById('sisaTahunanVal').innerText = formatRupiah(CONFIG.PAGU_TAHUNAN - totalPencairan);
    document.getElementById('sisaTriwulanVal').innerText = formatRupiah(CONFIG.PAGU_TRIWULAN - totalPencairan);
    document.getElementById('totalCairVal').innerText = formatRupiah(totalPencairan);
}

function isiDropdownProgram() {
    const progSelect = document.getElementById('inputProgram'); 
    progSelect.innerHTML = '<option value="">-- Pilih Program --</option>';
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

function kirimPengajuanSpjBaru(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSubmitNew'); 
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i> Menyimpan...'; btn.disabled = true;

    const rawDate = document.getElementById('inputTanggal').value; const [y, m, d] = rawDate.split('-');

    const payload = {
        action: 'create', id: 'SPJ-' + Date.now(), createdAt: `${d}/${m}/${y}`, username: sesiAktif.namaLengkap,
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
                showToast('Pengajuan Berhasil Disimpan!'); closeModal('modalNewSpj'); 
                document.getElementById('formNewSpj').reset(); tarikDataDariServer();
            } else { alert("SISTEM GAGAL MENYIMPAN!\n" + res.message); }
        })
        .catch(err => alert("KONEKSI TERPUTUS!\nError: " + err.message))
        .finally(() => { btn.innerHTML = 'Kirim Pengajuan'; btn.disabled = false; });
}

function kirimKonfirmasiRevisiPptk() {
    const btn = document.getElementById('btnSubmitRevisi'); btn.innerHTML = 'Mengirim...'; btn.disabled = true;
    fetch(CONFIG.APPS_SCRIPT_URL, { 
        method: 'POST', body: JSON.stringify({ action: 'update_revisi', id: activeSelectedId, username: sesiAktif.namaLengkap }) 
    }).then(res => res.json()).then(res => {
        if(res.status === 'success') { showToast(`Pemberitahuan Revisi Terkirim.`); closeModal('modalVerify'); tarikDataDariServer(); } 
        else { alert("GAGAL UPDATE REVISI:\n" + res.message); }
        btn.innerText = 'Konfirmasi Sudah Diperbaiki'; btn.disabled = false; 
    }).catch(err => { alert("KONEKSI TERPUTUS:\n" + err.message); btn.innerText = 'Konfirmasi Sudah Diperbaiki'; btn.disabled = false; });
}

function actionSetujui() { pendingStatusChange = 'DISETUJUI'; prosesUpdateStatusAksi(); }
function toggleActionForm(type) {
    pendingStatusChange = type;
    document.getElementById('revisiContainer').classList.add('hidden'); 
    document.getElementById('pindahbukuContainer').classList.add('hidden'); 
    document.getElementById('confirmActionContainer').classList.remove('hidden');
    
    // Buka input catatan untuk REVISI atau DITOLAK
    if(type === 'REVISI' || type === 'DITOLAK') document.getElementById('revisiContainer').classList.remove('hidden');
    if(type === 'SUDAH DIPINDAHBUKUKAN') document.getElementById('pindahbukuContainer').classList.remove('hidden');
}

function prosesUpdateStatusAksi() {
    let payload = { action: 'update_status', id: activeSelectedId, status: pendingStatusChange, username: sesiAktif.namaLengkap, noPb: '', tglPb: '', catatanRevisi: '', buktiPb: '' };
    
    if (pendingStatusChange === 'REVISI' || pendingStatusChange === 'DITOLAK') {
        payload.catatanRevisi = document.getElementById('catatanRevisiInput').value; 
        if(!payload.catatanRevisi) { alert('Catatan / Alasan wajib diisi!'); return; }
    } else if (pendingStatusChange === 'SUDAH DIPINDAHBUKUKAN') {
        payload.noPb = document.getElementById('noPbInput').value; 
        payload.tglPb = document.getElementById('tglPbInput').value; 
        payload.buktiPb = document.getElementById('buktiPbInput').value;
        if(!payload.noPb || !payload.tglPb) { alert('No PB & Tgl wajib diisi!'); return; }
    }

    const btn = document.getElementById('btnConfirmAction'); btn.innerText = 'Memproses...'; btn.disabled = true;
    fetch(CONFIG.APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) })
        .then(res => res.json())
        .then(res => {
            if(res.status === 'success') { showToast(`Sukses memperbarui status.`); closeModal('modalVerify'); tarikDataDariServer(); } 
            else { alert("GAGAL UPDATE STATUS:\n" + res.message); }
        }).catch(err => alert("KONEKSI TERPUTUS:\n" + err.message))
        .finally(() => { btn.innerText = 'Simpan Keputusan'; btn.disabled = false; });
}

function formatRupiah(amount) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount); }

// ===============================================
// RENDER TABEL (NPD & TGL DIPISAH, PROGRAM DISUSUN)
// ===============================================
function renderTabelSpj() {
    const tbody = document.getElementById('spjTableBody'); tbody.innerHTML = '';
    spjData.forEach(item => {
        // Desain Badge 4 Status
        let badge = `<span class="px-2 py-1 rounded border border-slate-300 font-bold text-slate-600 bg-slate-50">MENUNGGU</span>`;
        if(item.status === 'DISETUJUI') badge = `<span class="px-2 py-1 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">DISETUJUI</span>`;
        if(item.status === 'REVISI') badge = `<span class="px-2 py-1 rounded bg-amber-100 text-amber-800 font-bold border border-amber-200 shadow-sm">REVISI</span>`;
        if(item.status === 'DITOLAK') badge = `<span class="px-2 py-1 rounded bg-red-100 text-red-800 font-bold border border-red-200 shadow-sm">DITOLAK</span>`;
        if(item.status === 'SUDAH DIPINDAHBUKUKAN') badge = `<span class="px-2 py-1 rounded bg-blue-100 text-blue-800 font-bold border border-blue-200">PB: ${item.noPb}</span>`;

        let actionBtnText = sesiAktif.role === 'VERIFIKATOR' ? 'Verifikasi' : 'Detail'; 
        let actionBtnColor = sesiAktif.role === 'VERIFIKATOR' ? 'bg-emerald-600' : 'bg-slate-600';
        
        // HTML Baris Tabel (Perhatikan penggunaan align-top dan <br> di bagian Program)
        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 border-b">
                <td class="py-3 px-4 text-xs align-top whitespace-nowrap text-slate-600">${String(item.createdAt || '-')}</td>
                <td class="py-3 px-4 text-xs align-top whitespace-nowrap font-bold text-slate-800">${String(item.npd || '-')}</td>
                <td class="py-3 px-4 text-xs align-top whitespace-nowrap">${String(item.pptk || '-')}<br><span class="text-[10px] text-slate-500">${String(item.unitKerja || '-')}</span></td>
                <td class="py-3 px-4 text-xs align-top leading-relaxed min-w-[250px]">
                    <span class="font-bold text-slate-800">${String(item.program || '-')}</span><br>
                    <span class="text-slate-600">${String(item.kegiatan || '-')}</span><br>
                    <span class="text-[10px] text-slate-500">${String(item.subKegiatan || '-')}</span>
                </td>
                <td class="py-3 px-4 text-xs align-top max-w-[200px] truncate" title="${String(item.uraian || '-')}">${String(item.uraian || '-')}</td>
                <td class="py-3 px-4 text-xs text-right font-bold align-top whitespace-nowrap">${formatRupiah(item.nominal)}</td>
                <td class="py-3 px-4 text-center text-[11px] align-top whitespace-nowrap">${badge}</td>
                <td class="py-3 px-4 text-xs text-slate-600 align-top whitespace-nowrap">${String(item.noPb || '-')}</td>
                <td class="py-3 px-4 text-center align-top whitespace-nowrap"><button onclick="bukaModalVerifikasi('${String(item.id)}')" class="px-3 py-1.5 ${actionBtnColor} text-white rounded text-xs font-bold">${actionBtnText}</button></td>
            </tr>
        `;
    });
}

function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
function showToast(msg) { const toast = document.getElementById('toast'); document.getElementById('toastMessage').innerText = msg; toast.classList.remove('translate-y-20', 'opacity-0'); setTimeout(() => toast.classList.add('translate-y-20', 'opacity-0'), 3500); }

function bukaModalVerifikasi(id) {
    activeSelectedId = id; const item = spjData.find(i => String(i.id) === String(id)); if(!item) return;

    document.getElementById('detailUraian').innerText = String(item.uraian || '-');
    document.getElementById('detailPptk').innerText = String(item.pptk || "-") + " (" + String(item.emailPptk || "-") + ")";
    document.getElementById('detailProgKeg').innerText = String(item.program || "-") + " / " + String(item.kegiatan || "-");
    
    document.getElementById('detailLink').href = "#"; 
    document.getElementById('detailLink').innerText = "(Fitur Dokumen Dinonaktifkan)"; 
    document.getElementById('detailLink').classList.add('pointer-events-none', 'text-slate-400');

    const buktiPbBox = document.getElementById('detailBuktiPbBox');
    if (item.status === 'SUDAH DIPINDAHBUKUKAN' && item.buktiPb) {
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

    if (sesiAktif.role === 'VERIFIKATOR') {
        document.getElementById('panelAksiVerifikator').classList.remove('hidden'); document.getElementById('waContainer').classList.remove('hidden');
        let cleanPhone = String(item.wa || '').replace(/[^0-9]/g, ''); if(cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);
        let waText = `Yth. PPTK,\nUpdate SPJ (NPD: ${item.npd}):\n*Status: ${item.status}*\n`;
        if(item.status === 'REVISI' || item.status === 'DITOLAK') waText += `Catatan: ${item.catatanRevisi}\n`;
        document.getElementById('btnSendWa').href = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(waText)}`;
    } else {
        document.getElementById('panelAksiVerifikator').classList.add('hidden'); document.getElementById('waContainer').classList.add('hidden');
        // Hanya munculkan tombol upload jika statusnya REVISI (Jika DITOLAK artinya NPD dibatalkan)
        if(item.status === 'REVISI') document.getElementById('panelPptkRevisi').classList.remove('hidden');
    }
    openModal('modalVerify');
}
