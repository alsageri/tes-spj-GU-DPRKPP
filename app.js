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
    if(prog && keg && referensiData[prog][keg]) { referensiData[prog][keg].forEach(sub => { subSelect.innerHTML += `<option value="${sub}">${sub}</option>`; }); }
}

function kirimPengajuanSpjBaru(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSubmitNew'); 
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i> Menyimpan...'; btn.disabled = true;
    const rawDate = document.getElementById('inputTanggal').value; const [y, m, d] = rawDate.split('-');
    
    let generatedId = "";
    if (!isEditMode) {
        const now = new Date();
        const yy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const mnt = String(now.getMinutes()).padStart(2, '0');
        const sec = String(now.getSeconds()).padStart(2, '0');
        generatedId = `SPJ-${yy}${mm}${dd}-${hh}${mnt}${sec}`; 
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
            
            const item = spjData.find(i => String(i.id) === String(activeSelectedId));
            if(item) {
                item.status = pendingStatusChange;
                if(pendingStatusChange === 'REVISI' || pendingStatusChange === 'DITOLAK') item.catatanRevisi = payload.catatanRevisi;
                if(pendingStatusChange === 'SUDAH DIPINDAHBUKUKAN') { item.noPb = payload.noPb; item.tglPb = payload.tglPb; item.buktiPb = payload.buktiPb; }
                
                let timeNow = new Date().toLocaleString("en-GB", {timeZone: "Asia/Jakarta"}).replace(',', '');
                let parts = timeNow.split(' ');
                let cleanTime = `[${parts[0]} ${parts[1].substring(0,5)}]`;
                
                let catatanClean = (payload.catatanRevisi || "").replace(/\n/g, "<br>");
                
                item.riwayatLog = `${cleanTime} ${pendingStatusChange} oleh ${sesiAktif.namaLengkap}` + (catatanClean ? ` - Catatan: ${catatanClean}` : '') + `\n` + (item.riwayatLog || "");
            }

            tarikDataDariServer(); 
            
            document.getElementById('confirmActionContainer').classList.add('hidden');
            document.getElementById('revisiContainer').classList.add('hidden');
            document.getElementById('pindahbukuContainer').classList.add('hidden');
            document.getElementById('catatanRevisiInput').value = ""; 
            pendingStatusChange = null;
            
            bukaModalVerifikasi(activeSelectedId); 
        } 
        else { alert("GAGAL UPDATE STATUS:\n" + res.message); }
    })
    .catch(err => { alert("KONEKSI TERPUTUS:\n" + err.message); })
    .finally(() => { if (btn) { btn.innerText = 'Simpan Keputusan'; btn.disabled = false; } });
}

function formatRupiah(amount) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount); }

// ==========================================
// PAGINATION LOGIC
// ==========================================
function gantiPageSize() {
    rowsPerPage = parseInt(document.getElementById('selectPageSize').value);
    currentPage = 1; 
    renderTabelSpj();
}

function gantiHalaman(arah) {
    const totalPages = Math.ceil(spjData.length / rowsPerPage);
    currentPage += arah;
    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;
    renderTabelSpj();
}

function renderTabelSpj() {
    const tbody = document.getElementById('spjTableBody'); 
    tbody.innerHTML = '';
    
    const totalData = spjData.length;
    const totalPages = Math.ceil(totalData / rowsPerPage) || 1;
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, totalData);
    
    const infoEl = document.getElementById('infoHalaman');
    const btnPrev = document.getElementById('btnPrevPage');
    const btnNext = document.getElementById('btnNextPage');
    
    if (infoEl) infoEl.innerText = `Menampilkan ${totalData === 0 ? 0 : startIndex + 1}-${endIndex} dari ${totalData} (Hal ${currentPage}/${totalPages})`;
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
        if(item.status === 'SUDAH DIPINDAHBUKUKAN') badge = `<span class="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200 text-[10px] tracking-wide">SELESAI PB</span>`;
        
        let jenisSurat = String(item.jenisSurat || 'GU');
        let jenisBadge = jenisSurat === 'LS' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200';
        
        let actionBtnText = sesiAktif.role === 'VERIFIKATOR' ? 'Verifikasi' : 'Detail'; 
        let actionBtnColor = sesiAktif.role === 'VERIFIKATOR' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-800 hover:bg-slate-900';
        
        tbody.innerHTML += `
            <tr class="hover:bg-slate-50/50 border-b border-slate-100 transition-colors relative z-10">
                <td class="py-4 px-4 text-xs align-top whitespace-nowrap text-slate-500">${String(item.createdAt || '-').split('T')[0]}</td>
                <td class="py-4 px-4 text-xs align-top font-bold text-slate-800 max-w-[150px] whitespace-normal break-words">${String(item.npd || '-')}</td>
                <td class="py-4 px-4 text-xs align-top whitespace-nowrap"><span class="px-2 py-1 rounded-md border font-bold text-[10px] ${jenisBadge}">${jenisSurat}</span></td>
                <td class="py-4 px-4 text-xs align-top whitespace-nowrap">${String(item.pptk || '-')}<br><span class="text-[10px] text-slate-500">${String(item.unitKerja || '-')}</span></td>
                <td class="py-4 px-4 text-xs align-top leading-relaxed min-w-[250px] whitespace-normal break-words"><span class="font-bold text-slate-800">${String(item.program || '-')}</span><br><span class="text-slate-500">${String(item.kegiatan || '-')}</span><br><span class="text-[10px] text-slate-400">${String(item.subKegiatan || '-')}</span></td>
                <td class="py-4 px-4 text-xs align-top text-slate-600 max-w-[200px] whitespace-normal break-words" title="${String(item.uraian || '-')}">${String(item.uraian || '-')}</td>
                <td class="py-4 px-4 text-xs text-right font-bold align-top whitespace-nowrap text-slate-800">${formatRupiah(item.nominal)}</td>
                <td class="py-4 px-4 text-center align-top whitespace-nowrap">${badge}</td>
                <td class="py-4 px-4 text-xs text-slate-500 align-top max-w-[100px] whitespace-normal break-words">${String(item.noPb || '-')}</td>
                <td class="py-4 px-4 text-center align-top whitespace-nowrap sticky right-0 bg-white/90 backdrop-blur-sm shadow-[-8px_0_15px_rgba(0,0,0,0.02)]">
                    <button onclick="bukaModalVerifikasi('${String(item.id)}')" class="px-4 py-1.5 ${actionBtnColor} text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer relative z-50">${actionBtnText}</button>
                </td>
            </tr>
        `;
    });
}

function openModal(id) { 
    if(id === 'modalNewSpj' && !isEditMode) { 
        document.getElementById('formNewSpj').reset(); 
        const existingSukses = document.getElementById('pesanSuksesDiv'); if(existingSukses) existingSukses.remove();
        document.getElementById('formNewSpj').classList.remove('hidden');
        document.getElementById('btnSubmitNew').innerText = "Lanjut ke Form Upload"; 
    }
    document.getElementById(id).classList.remove('hidden'); 
}

function bukaFormSpjBaru() {
    isEditMode = false;
    editIdTarget = null;
    document.getElementById('formNewSpj').reset(); 
    const existingSukses = document.getElementById('pesanSuksesDiv'); 
    if(existingSukses) existingSukses.remove();
    document.getElementById('formNewSpj').classList.remove('hidden');
    document.getElementById('btnSubmitNew').innerText = "Lanjut ke Form Upload"; 
    openModal('modalNewSpj');
}
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

    // ISI HEADER MODAL YANG BARU
    document.getElementById('detailUraian').innerText = String(item.uraian || '-');
    document.getElementById('detailPptkNama').innerText = String(item.pptk || "-");
    document.getElementById('detailUnitKerja').innerText = String(item.unitKerja || "-");
    document.getElementById('detailEmailPptk').innerText = String(item.emailPptk || "-");
    document.getElementById('detailNominal').innerText = formatRupiah(item.nominal || 0);
    
    // (Kode DPA telah dihapus dari HTML sehingga tidak perlu di-set di JS)
    
    document.getElementById('linkDokKeuangan').innerHTML = jadikanLink(item.linkKeuangan, item.id);
    document.getElementById('linkDokSpj').innerHTML = jadikanLink(item.linkSpj, item.id);
    document.getElementById('linkDokRevisi').innerHTML = jadikanLink(item.linkRevisi, item.id);

    const buktiPbBox = document.getElementById('detailBuktiPbBox');
    if (item.status === 'SUDAH DIPINDAHBUKUKAN' && item.buktiPb) {
        document.getElementById('detailBuktiPbTeks').innerText = `No PB: ${item.noPb} (${item.tglPb})`;
        let buktiLink = String(item.buktiPb || '');
        if(buktiLink.startsWith('http')) { document.getElementById('detailBuktiPbLink').innerHTML = `<a href="${buktiLink}" target="_blank" class="text-blue-600 underline font-bold">Buka Lampiran Bukti PB</a>`; } 
        else { document.getElementById('detailBuktiPbLink').innerHTML = `<span class="text-slate-700 font-bold">Kata Kunci Arsip: ${buktiLink}</span>`; }
        buktiPbBox.classList.remove('hidden');
    } else { buktiPbBox.classList.add('hidden'); }

    // RENDER RIWAYAT
    let logHtml = '<div class="relative border-l-2 border-slate-100 ml-2 mt-3 pb-2">'; 
    const safeRiwayat = String(item.riwayatLog || '');
    
    if (safeRiwayat.trim() !== "") { 
        safeRiwayat.split('\n').forEach((line, index) => { 
            if(line.trim() !== "") {
                let dotColor = 'bg-slate-300 ring-slate-100';
                let innerHtml = line;

                let match = line.match(/^(\[[^\]]+\])\s*(.*)$/);
                if (match) {
                    let tanggal = match[1];
                    let isiHtml = match[2];
                    
                    if (isiHtml.includes('- Catatan:')) {
                        let parts = isiHtml.split('- Catatan:');
                        isiHtml = `<span class="text-slate-700 font-semibold">${parts[0].trim()}</span>
                                   <div class="mt-1.5 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11.5px] leading-relaxed shadow-sm block w-full">
                                     <div class="flex items-center mb-1"><i class="fa-solid fa-circle-exclamation me-1.5 text-amber-600"></i> <b class="text-amber-900">Catatan:</b></div>
                                     <div class="pl-4">${parts[1].trim()}</div>
                                   </div>`;
                        dotColor = 'bg-amber-500 ring-amber-100';
                    } else if (isiHtml.includes('REVISI') || isiHtml.includes('DITOLAK')) {
                        dotColor = 'bg-amber-500 ring-amber-100';
                        isiHtml = `<span class="text-amber-700 font-semibold">${isiHtml}</span>`;
                    } else if (isiHtml.includes('DISETUJUI') || isiHtml.includes('SELESAI')) {
                        dotColor = 'bg-emerald-500 ring-emerald-100';
                        isiHtml = `<span class="text-emerald-700 font-semibold">${isiHtml}</span>`;
                    } else {
                        isiHtml = `<span class="text-slate-600">${isiHtml}</span>`;
                    }
                    innerHtml = `<span class="text-[10px] font-bold text-slate-400 block mb-0.5">${tanggal}</span>${isiHtml}`;
                } else {
                    innerHtml = `<span class="text-slate-500 italic block mt-1 pl-2 border-l-2 border-slate-300">${line}</span>`;
                    dotColor = 'bg-transparent ring-transparent'; 
                }

                logHtml += `
                <div class="relative pl-5 mb-4">
                    <div class="absolute -left-[5px] top-1.5 w-2 h-2 ${dotColor} rounded-full ${dotColor !== 'bg-transparent ring-transparent' ? 'ring-4' : ''}"></div>
                    <div class="text-[11px] leading-relaxed">${innerHtml}</div>
                </div>`; 
            } 
        }); 
    } else {
        logHtml += `<div class="relative pl-5"><div class="absolute -left-[5px] top-1.5 w-2 h-2 bg-slate-200 rounded-full ring-4 ring-white"></div><p class="text-[11px] text-slate-400 italic">Belum ada riwayat aktivitas.</p></div>`;
    }
    logHtml += '</div>';
    document.getElementById('detailRiwayatBox').innerHTML = logHtml;
    
    document.getElementById('revisiContainer').classList.add('hidden'); document.getElementById('pindahbukuContainer').classList.add('hidden'); document.getElementById('confirmActionContainer').classList.add('hidden'); document.getElementById('panelPptkRevisi').classList.add('hidden');

    if (sesiAktif.role === 'VERIFIKATOR') {
        document.getElementById('panelAksiVerifikator').classList.remove('hidden'); 
        document.getElementById('waContainer').classList.remove('hidden');
        document.getElementById('waContainer').classList.add('flex');
        
        let cleanPhone = String(item.wa || '').replace(/[^0-9]/g, ''); 
        if (cleanPhone.startsWith('0')) { cleanPhone = '62' + cleanPhone.slice(1); } else if (cleanPhone.startsWith('8')) { cleanPhone = '62' + cleanPhone; }        
        
        let waText = `Yth. PPTK,\nUpdate SPJ (NPD: ${item.npd}):\n*Status: ${item.status}*\n`;
        if(item.status === 'REVISI' || item.status === 'DITOLAK') waText += `Catatan:\n${String(item.catatanRevisi).replace(/<br>/g, '\n')}\n`;
        document.getElementById('btnSendWa').href = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(waText)}`;
        
        // --- LOGIC EMAIL ---
        let emailText = `Yth. PPTK,\n\nBerikut adalah update status dokumen SPJ Anda (NPD: ${item.npd}).\nStatus Saat Ini: ${item.status}\n`;
        if(item.status === 'REVISI' || item.status === 'DITOLAK') emailText += `\nCatatan Verifikator:\n${String(item.catatanRevisi).replace(/<br>/g, '\n')}\n\nMohon segera diperbaiki.`;
        let mailtoLink = `mailto:${item.emailPptk}?subject=Update Status SPJ GU - ${item.npd}&body=${encodeURIComponent(emailText)}`;
        
        let btnEmail = document.getElementById('btnSendEmail');
        if (btnEmail) {
            btnEmail.href = mailtoLink;
            btnEmail.onclick = function() {
                let originalHtml = this.innerHTML;
                this.innerHTML = '<i class="fa-solid fa-check text-sm"></i> Draft Terbuka!';
                this.classList.replace('bg-blue-600', 'bg-emerald-600');
                this.classList.replace('hover:bg-blue-700', 'hover:bg-emerald-700');
                showToast('Aplikasi Email dibuka.');
                setTimeout(() => {
                    this.innerHTML = originalHtml;
                    this.classList.replace('bg-emerald-600', 'bg-blue-600');
                    this.classList.replace('hover:bg-emerald-700', 'hover:bg-blue-700');
                }, 3000);
            };
        }
    
    } else {
        document.getElementById('panelAksiVerifikator').classList.add('hidden'); 
        document.getElementById('waContainer').classList.add('hidden');
        document.getElementById('waContainer').classList.remove('flex');
        
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
    
    document.getElementById('inputNpd').value = item.npd; document.getElementById('inputPptk').value = item.pptk;
    document.getElementById('inputJenisSurat').value = item.jenisSurat || 'GU';
    document.getElementById('inputUnitKerja').value = item.unitKerja; document.getElementById('inputEmail').value = item.emailPptk;
    document.getElementById('inputWa').value = item.wa;
    
    document.getElementById('inputProgram').value = item.program; updateKegiatanDropdown();
    document.getElementById('inputKegiatan').value = item.kegiatan; updateSubkegiatanDropdown();
    document.getElementById('inputSubkegiatan').value = item.subKegiatan;
    
    document.getElementById('inputNominal').value = item.nominal; document.getElementById('inputUraian').value = item.uraian;
    
    document.getElementById('btnSubmitNew').innerText = "Simpan Perubahan (Edit)";
    closeModal('modalVerify'); openModal('modalNewSpj');
}

// ==========================================
// FITUR AUTO-NUMBERING PADA TEXTAREA REVISI
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    const textarea = document.getElementById('catatanRevisiInput');
    if (textarea) {
        textarea.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                const cursorPos = this.selectionStart;
                const textBeforeCursor = this.value.substring(0, cursorPos);
                
                const lines = textBeforeCursor.split('\n');
                const lastLine = lines[lines.length - 1];
                const match = lastLine.match(/^(\d+)\.\s/);
                
                if (match) {
                    e.preventDefault();
                    if (lastLine.trim() === `${match[1]}.`) {
                        this.value = textBeforeCursor.substring(0, textBeforeCursor.lastIndexOf(lastLine)) + 
                                     this.value.substring(this.selectionEnd);
                        return;
                    }
                    const nextNum = parseInt(match[1]) + 1;
                    const nextPrefix = `\n${nextNum}. `;
                    const textAfterCursor = this.value.substring(this.selectionEnd);
                    this.value = textBeforeCursor + nextPrefix + textAfterCursor;
                    this.selectionStart = this.selectionEnd = cursorPos + nextPrefix.length;
                }
            }
        });
    }
});
