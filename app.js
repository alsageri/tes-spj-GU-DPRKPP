// ==========================================
// UPDATE 1: Sapaan Waktu & Format Tanggal
// ==========================================

// FUNGSI HELPER: UPDATE SAPAAN WAKTU (Pagi, Siang, Sore, Malam)
function updateSapaanWaktu() {
    const jam = new Date().getHours();
    let sapaan = 'Selamat Pagi';
    
    if (jam >= 3 && jam < 11) sapaan = 'Selamat Pagi';
    else if (jam >= 11 && jam < 15) sapaan = 'Selamat Siang';
    else if (jam >= 15 && jam < 18) sapaan = 'Selamat Sore';
    else sapaan = 'Selamat Malam';

    const loginSapaan = document.getElementById('sapaan-login');
    if (loginSapaan) loginSapaan.innerHTML = `${sapaan} 👋`;
    
    const headerSapaan = document.getElementById('sapaan-header');
    if (headerSapaan) headerSapaan.innerText = sapaan;
}

// FUNGSI HELPER: FORMAT TANGGAL JADI HARI/BULAN/TAHUN (DD/MM/YYYY)
function formatTanggalIndo(dateStr) {
    if (!dateStr || dateStr === '-') return '-';
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length !== 3) return dateStr.split('T')[0];
    // Mengembalikan format DD/MM/YYYY
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}


// ==========================================
// UPDATE 2: Warna Riwayat & Status Dokumen
// Cari fungsi bukaModalVerifikasi(id) dan timpa bagian let logHtml di dalamnya
// ==========================================

    // RENDER WARNA SPESIFIK UNTUK RIWAYAT (Tema utama Merah)
    let logHtml = '<div class="relative border-l-2 border-red-400 ml-2 mt-3 pb-2">'; 
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
            let dotColor = 'bg-red-500 ring-red-200'; // Titik default merah
            let innerHtml = line; 
            let match = line.match(/^(\[[^\]]+\])\s*(.*)$/);
            
            if (match) {
                let tanggal = match[1]; let isiHtml = match[2];
                if (isiHtml.includes('- Catatan:')) { 
                    let parts = isiHtml.split('- Catatan:'); 
                    let isiCatatan = parts[1].trim(); 
                    isiHtml = `<span class="text-amber-700 font-bold uppercase">${parts[0].trim()}</span><div class="mt-1.5 p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-[11px] leading-relaxed shadow-sm"><i class="fa-solid fa-circle-exclamation me-1 text-amber-600"></i> <b class="text-amber-900">Catatan:</b><br>${isiCatatan}</div>`; 
                    dotColor = 'bg-amber-500 ring-amber-200'; 
                } 
                else if (isiHtml.includes('REVISI')) { 
                    dotColor = 'bg-amber-500 ring-amber-200'; 
                    isiHtml = `<span class="bg-amber-500 text-amber-900 px-2 py-0.5 rounded font-bold uppercase shadow-sm">${isiHtml}</span>`; 
                }
                else if (isiHtml.includes('DITOLAK')) { 
                    dotColor = 'bg-red-600 ring-red-200'; 
                    isiHtml = `<span class="bg-red-600 text-white px-2 py-0.5 rounded font-bold uppercase shadow-sm">${isiHtml}</span>`; 
                } 
                else if (isiHtml.includes('DISETUJUI')) { 
                    dotColor = 'bg-emerald-500 ring-emerald-200'; 
                    isiHtml = `<span class="bg-emerald-500 text-white px-2 py-0.5 rounded font-bold uppercase shadow-sm">${isiHtml}</span>`; 
                } 
                else if (isiHtml.includes('SELESAI PB') || isiHtml.includes('DIPINDAHBUKUKAN')) { 
                    dotColor = 'bg-blue-600 ring-blue-200'; 
                    isiHtml = `<span class="bg-blue-600 text-white px-2 py-0.5 rounded font-bold uppercase shadow-sm">${isiHtml}</span>`; 
                }
                else { 
                    isiHtml = `<span class="text-slate-800 font-bold">${isiHtml}</span>`; 
                }
                // Tanggal dengan warna merah agar kontras
                innerHtml = `<span class="text-[10px] font-bold text-red-600 block mb-0.5">${tanggal}</span>${isiHtml}`;
            } else { 
                innerHtml = `<span class="text-slate-600 italic font-medium block mt-1 pl-2 border-l-2 border-slate-300">${line}</span>`; 
                dotColor = 'bg-transparent ring-transparent'; 
            }
            logHtml += `<div class="relative pl-5 mb-4"><div class="absolute -left-[5px] top-1.5 w-2 h-2 ${dotColor} rounded-full ${dotColor !== 'bg-transparent ring-transparent' ? 'ring-4' : ''}"></div><div class="text-[11px] leading-relaxed">${innerHtml}</div></div>`; 
        }); 
    } else { logHtml += `<div class="relative pl-5"><div class="absolute -left-[5px] top-1.5 w-2 h-2 bg-red-400 rounded-full ring-4 ring-white"></div><p class="text-[11px] text-slate-400 italic">Belum ada riwayat aktivitas.</p></div>`; }
    logHtml += '</div>'; document.getElementById('detailRiwayatBox').innerHTML = logHtml;
