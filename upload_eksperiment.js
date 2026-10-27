// SIMPANAN SCRIPT UPLOAD BASE64 (DIPISAH DARI SISTEM UTAMA)

/*
function handleFileUpload(event) {
    const file = event.target.files[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("File terlalu besar! Maksimal 5 MB."); event.target.value = ""; return; }
    const reader = new FileReader();
    reader.onload = function(e) { 
        uploadedFileBase64 = e.target.result; 
        uploadedFileName = file.name; 
    };
    reader.readAsDataURL(file);
}

// CONTOH PAYLOAD UPLOAD:
// const payloadUpload = {
//    action: 'upload_file',
//    program: 'Program X', 
//    kegiatan: 'Kegiatan Y',
//    fileBase64: uploadedFileBase64, 
//    fileName: uploadedFileName
// };
// 
// await fetch(URL, { method: 'POST', body: JSON.stringify(payloadUpload) });
*/
