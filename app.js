// ========================================================
// FILE: app.js (Sistem Logika Utama)
// ========================================================

let spjData = []; let referensiData = {}; 
let activeSelectedId = null; let pendingStatusChange = null;
let sesiAktif = { role: "", username: "", namaLengkap: "" };
let isEditMode = false;
let editIdTarget = null;
let currentPage = 1;
let rowsPerPage = 10;

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
    document.getElementById('login-screen').style.display = 'none'; document.getElementById('main-app').style.display = 'flex';
    document.getElementById('role-badge').innerText = sesiAktif.role; document.getElementById('user-display').innerText = sesiAktif.namaLengkap;
    tarikDataDariServer();
}

function tarikDataDariServer() {
    document.getElementById('refresh-icon').classList.add('animate-spin');
    fetch(CONFIG.APPS_SCRIPT_URL)
        .then(res => res.json())
        .then(data => {
            if (data.status === 'error') {
                alert("Sistem Google Menolak: " + data.message);
                document.getElementById('refresh-icon').classList.remove('animate-spin');
                return;
            }
            if(data.spj) spjData = data.spj.reverse(); 
            if(data.referensi) referensiData = data.referensi;
            renderTabelSpj(); hitungAnggaran(); isiDropdownProgram();
            document.getElementById('refresh-icon').classList.remove('animate-spin');
        })
        .catch(e => { alert("Gagal memuat data! Detail Error: " + e.message); document.getElementById('refresh-icon').classList.remove('animate-spin'); });
}

function hitungAnggaran() {
    let totalPencairan = 0;
    spjData.forEach(item => { if(item.status === 'SUDAH DIPINDAHBUKUKAN') totalPencairan += Number(item.nominal) || 0; });
    document.getElementById('sisaTahunanVal').innerText = formatRupiah(CONFIG.PAGU_TAHUNAN - totalPencairan);
    document.getElementById('sisaTriwulanVal').innerText = formatRupiah(CONFIG.PAGU_TRIWULAN - totalPencairan);
    document.getElementById('totalCairVal').innerText = formatRupiah(totalPencairan);
}

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
    if(prog && keg && referensiData[prog][keg]) { referensiData[prog][keg].forEach(sub => { subSelect.innerHTML += `<option value="${sub}">${sub}</option>`; }); } }  function kirimPengajuanSpjBaru(e) { e.preventDefault(); const btn = document.getElementById('btnSubmitNew'); btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i> Menyimpan...'; btn.disabled = true; const rawDate = document.getElementById('inputTanggal').value; const [y, m, d] = rawDate.split('-');  const idSistem = isEditMode ? editIdTarget : 'SPJ-' + Date.now(); const actionType = isEditMode ? 'update_data_teks' : 'create';  const payload = { action: actionType, id: idSistem, createdAt: `${d}/${m}/${y}`, username: sesiAktif.namaLengkap,
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
                    const divSukses = document.createElement('div');
                    divSukses.id = "pesanSuksesDiv"; divSukses.className = "text-center py-6 space-y-4";
                    divSukses.innerHTML = `<div class="text-5xl text-emerald-500 mb-2"><i class="fa-solid fa-circle-check"></i></div><h3 class="text-lg font-bold text-slate-800">Perbaikan Data Berhasil!</h3><button onclick="closeModal('modalNewSpj'); tarikDataDariServer();" class="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md">Tutup & Refresh</button>`;
                    document.getElementById('formNewSpj').parentElement.appendChild(divSukses);
                } else {
                    const formPrefilledUrl = `https://docs.google.com/forms/d/e/1FAIpQLSfCvsVCiHDjMtDos9giKhhljCFlfXuWNbC5wgP_IXsmBGyqPw/viewform?usp=pp_url&entry.1525941067=${idSistem}`; 
                    const divSukses = document.createElement('div');
                    divSukses.id = "pesanSuksesDiv"; divSukses.className = "text-center py-6 space-y-4";
                    divSukses.innerHTML = `<div class="text-5xl text-emerald-500 mb-2"><i class="fa-solid fa-circle-check"></i></div><h3 class="text-lg font-bold text-slate-800">Data Pengajuan Berhasil Disimpan!</h3><p class="text-sm text-slate-600 mb-4 bg-amber-50 border border-amber-200 p-3 rounded text-left"><strong>PENTING:</strong> Pengajuan belum selesai. Lanjut klik tombol di bawah untuk Upload Berkas (Keuangan & SPJ GU).</p><a href="${formPrefilledUrl}" target="_blank" onclick="closeModal('modalNewSpj'); tarikDataDariServer();" class="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md"><i class="fa-solid fa-cloud-arrow-up me-2"></i> Lanjut Upload Berkas</a>`;
                    document.getElementById('formNewSpj').parentElement.appendChild(divSukses);
                }
            } else { alert("GAGAL MENYIMPAN!\n" + res.message); }
        })
        .catch(err => alert("KONEKSI TERPUTUS!\nError: " + err.message))
        .finally(() => { btn.innerHTML = 'Kirim Pengajuan'; btn.disabled = false; });
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
    if (pendingStatusChange === 'REVISI' || pendingStatusChange === 'DITOLAK') {
        payload.catatanRevisi = document.getElementById('catatanRevisiInput').value; if(!payload.catatanRevisi) { alert('Catatan wajib diisi!'); return; }
    } else if (pendingStatusChange === 'SUDAH DIPINDAHBUKUKAN') {
        payload.noPb = document.getElementById('noPbInput').value; payload.tglPb = document.getElementById('tglPbInput').value; payload.buktiPb = document.getElementById('buktiPbInput').value;
        if(!payload.noPb || !payload.tglPb) { alert('No PB & Tgl wajib diisi!'); return; }
    }

    const btn = document.getElementById('btnConfirmAction'); 
    if (btn) { btn.innerText = 'MEMPROSES...'; btn.disabled = true; }

    fetch(CONFIG.APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) })
    .then(res => res.json())
    .then(res => {
        if(res.status === 'success') { 
            showToast(`Sukses memperbarui status.`); 
            
            // 1. Update data lokal sementara agar UI langsung berubah
            const item = spjData.find(i => String(i.id) === String(activeSelectedId));
            if(item) {
                item.status = pendingStatusChange;
                if(pendingStatusChange === 'REVISI' || pendingStatusChange === 'DITOLAK') item.catatanRevisi = payload.catatanRevisi;
                if(pendingStatusChange === 'SUDAH DIPINDAHBUKUKAN') { item.noPb = payload.noPb; item.tglPb = payload.tglPb; item.buktiPb = payload.buktiPb; }
                
                // Tambah log lokal sementara
                let timeNow = new Date().toLocaleString("en-GB", {timeZone: "Asia/Jakarta"}).replace(',', '');
                let parts = timeNow.split(' ');
                let cleanTime = `[${parts[0]} ${parts[1].substring(0,5)}]`; item.riwayatLog = `${cleanTime} ${pendingStatusChange} oleh${sesiAktif.namaLengkap}` + (payload.catatanRevisi ? ` - Catatan: ${payload.catatanRevisi}` : '') + `\n` + (item.riwayatLog \vert{}\vert{} ""); }  // 2. Tarik data asli di background agar tetap sinkron tarikDataDariServer();  // 3. Sembunyikan form input keputusan document.getElementById('confirmActionContainer').classList.add('hidden'); document.getElementById('revisiContainer').classList.add('hidden'); document.getElementById('pindahbukuContainer').classList.add('hidden'); document.getElementById('catatanRevisiInput').value = ""; // Kosongkan input pendingStatusChange = null;  // 4. Render ulang modal (MODAL TIDAK DITUTUP, sehingga tombol WA/Email bisa langsung ditekan) bukaModalVerifikasi(activeSelectedId);  } else { alert("GAGAL UPDATE STATUS:\n" + res.message); } }) .catch(err => { alert("KONEKSI TERPUTUS:\n" + err.message); }) .finally(() => { if (btn) { btn.innerText = 'Simpan Keputusan'; btn.disabled = false; } }); }  function formatRupiah(amount) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount); }  // ========================================== // PAGINATION LOGIC // ========================================== function gantiPageSize() { rowsPerPage = parseInt(document.getElementById('selectPageSize').value); currentPage = 1; renderTabelSpj(); }  function gantiHalaman(arah) { const totalPages = Math.ceil(spjData.length / rowsPerPage); currentPage += arah; if (currentPage < 1) currentPage = 1; if (currentPage > totalPages) currentPage = totalPages; renderTabelSpj(); }  function renderTabelSpj() { const tbody = document.getElementById('spjTableBody'); tbody.innerHTML = '';  const totalData = spjData.length; const totalPages = Math.ceil(totalData / rowsPerPage) \vert{}\vert{} 1; const startIndex = (currentPage - 1) * rowsPerPage; const endIndex = Math.min(startIndex + rowsPerPage, totalData);  const infoEl = document.getElementById('infoHalaman'); const btnPrev = document.getElementById('btnPrevPage'); const btnNext = document.getElementById('btnNextPage');  if (infoEl) infoEl.innerText = `Menampilkan ${totalData === 0 ? 0 : startIndex + 1}-${endIndex} dari${totalData} (Hal ${currentPage}/${totalPages})`;
    if (btnPrev) btnPrev.disabled = currentPage === 1;
    if (btnNext) btnNext.disabled = currentPage === totalPages || totalPages === 0;

    const dataHalamanIni = spjData.slice(startIndex, endIndex);

    if (dataHalamanIni.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center py-10 text-slate-500 font-medium">Belum ada data SPJ untuk ditampilkan.</td></tr>';
        return;
    }

    dataHalamanIni.forEach(item => {
        let badge = `<span class="px-2.5 py-1 rounded-full border border-slate-200 font-bold text-slate-600 bg-slate-100 text-[10px] tracking-wide">MENUNGGU</span>`;
        if(item.status === 'DISETUJUI') badge = `<span class="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[10px] tracking-wide">DISETUJUI</span>`;
        if(item.status === 'REVISI') badge = `<span class="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200 text-[10px] tracking-wide">REVISI</span>`;
        if(item.status === 'DITOLAK') badge = `<span class="px-2.5 py-1 rounded-full bg-red-50 text-red-700 font-bold border border-red-200 text-[10px] tracking-wide">DITOLAK</span>`;
        if(item.status === 'SUDAH DIPINDAHBUKUKAN') badge = `<span class="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200 text-[10
