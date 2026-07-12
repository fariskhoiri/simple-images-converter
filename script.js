// 1. Mengambil referensi elemen-elemen HTML yang akan dimanipulasi
const fileInput = document.getElementById('fileInput');
const uploadText = document.getElementById('uploadText');
const previewContainer = document.getElementById('previewContainer');
const convertBtn = document.getElementById('convertBtn');
const formatSelect = document.getElementById('formatSelect');
const downloadArea = document.getElementById('downloadArea');
const downloadLink = document.getElementById('downloadLink');
const uploadAreaDiv = document.getElementById('uploadArea');
const statusText = document.getElementById('statusText');

let originalFiles = []; // Sekarang menggunakan Array untuk menampung banyak file

// 2. Event Listener: Ketika file dipilih/diunggah
fileInput.addEventListener('change', function(event) {
    const files = event.target.files;
    
    if (files.length > 0) {
        originalFiles = Array.from(files);
        previewContainer.innerHTML = ''; // Bersihkan preview sebelumnya
        
        uploadText.style.display = 'none';  
        convertBtn.disabled = false;        
        downloadArea.style.display = 'none';

        // Looping untuk menampilkan preview setiap gambar
        originalFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'preview-item';
                
                const img = document.createElement('img');
                img.src = e.target.result;
                
                const span = document.createElement('span');
                span.textContent = file.name;
                span.title = file.name;

                itemDiv.appendChild(img);
                itemDiv.appendChild(span);
                previewContainer.appendChild(itemDiv);
            }
            reader.readAsDataURL(file);
        });
    }
});

// 3. Efek visual saat menyeret gambar (drag and drop)
uploadAreaDiv.addEventListener('dragover', (e) => {
    uploadAreaDiv.classList.add('dragover');
});
uploadAreaDiv.addEventListener('dragleave', (e) => {
    uploadAreaDiv.classList.remove('dragover');
});
uploadAreaDiv.addEventListener('drop', (e) => {
    uploadAreaDiv.classList.remove('dragover');
});

// Fungsi utilitas untuk memproses satu gambar ke bentuk 'Blob' (data biner)
function processImage(file, targetFormat) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                canvas.width = img.width;
                canvas.height = img.height;
                
                if (targetFormat === 'jpg' || targetFormat === 'jfif') {
                    ctx.fillStyle = "#FFFFFF";
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }

                ctx.drawImage(img, 0, 0);

                let mimeType = 'image/png';
                if (targetFormat === 'jpg' || targetFormat === 'jfif') {
                    mimeType = 'image/jpeg';
                } else if (targetFormat === 'webp') {
                    mimeType = 'image/webp';
                }

                // Mengubah canvas menjadi data Blob untuk dimasukkan ke ZIP
                canvas.toBlob((blob) => {
                    const originalName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                    const newFileName = `${originalName}.${targetFormat}`;
                    resolve({ name: newFileName, blob: blob });
                }, mimeType, 0.9);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// 4. Event Listener: Ketika tombol "Konversi" diklik
convertBtn.addEventListener('click', async function() {
    if (originalFiles.length === 0) return;

    // Ubah tampilan UI selagi memproses
    convertBtn.disabled = true;
    convertBtn.textContent = "Processing...";
    downloadArea.style.display = 'none';

    const targetFormat = formatSelect.value;
    // Hapus inisialisasi JSZip dari sini, kita pindahkan ke dalam kondisi nanti

    try {
        // Jalankan proses gambar satu per satu secara paralel (bersamaan)
        const conversionPromises = originalFiles.map(file => processImage(file, targetFormat));
        const results = await Promise.all(conversionPromises);

        // CEK KONDISI: Apakah 1 gambar atau banyak gambar?
        if (results.length === 1) {
            // --- SKENARIO 1 GAMBAR ---
            const singleImage = results[0];
            const imageUrl = URL.createObjectURL(singleImage.blob);
            
            downloadLink.href = imageUrl;
            downloadLink.download = singleImage.name; // Nama file langsung beserta ekstensinya
            downloadLink.textContent = "Download Image"; // Ubah teks tombol
            statusText.textContent = "Successfully converted!";
            
        } else {
            // --- SKENARIO BANYAK GAMBAR (ZIP) ---
            const zip = new JSZip(); // Mengaktifkan JSZip hanya jika diperlukan
            
            // Masukkan file yang sudah jadi ke dalam bungkus ZIP
            results.forEach(result => {
                zip.file(result.name, result.blob);
            });

            // Generate (buat) file ZIP-nya
            const zipContent = await zip.generateAsync({ type: "blob" });
            
            // Siapkan tautan unduhan untuk file ZIP
            const zipUrl = URL.createObjectURL(zipContent);
            downloadLink.href = zipUrl;
            downloadLink.download = `Hasil_Konversi_${targetFormat.toUpperCase()}.zip`;
            downloadLink.textContent = "Download File ZIP"; // Ubah teks tombol
            statusText.textContent = `Successfully converted ${results.length} images!`;
        }

        // Tampilkan area unduhan (baik itu tombol ZIP maupun gambar langsung)
        downloadArea.style.display = 'block';
        
    } catch (error) {
        console.error("Terjadi kesalahan:", error);
        alert("An error occurred while processing the image.");
    } finally {
        // Kembalikan tombol seperti semula
        convertBtn.disabled = false;
        convertBtn.textContent = "Convert Image";
    }
});