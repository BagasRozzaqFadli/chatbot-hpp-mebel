// =============================================================================
// FILE: app.js
// DESKRIPSI: File logika utama aplikasi. Bertanggung jawab untuk:
//            1. Mengelola tampilan UI (DOM Manipulation)
//            2. Berkomunikasi dengan Google Gemini API (NLP/Ekstraksi Entitas)
//            3. Memanggil logika Fuzzy dari fuzzy.js
//            4. Menyimpan riwayat ke Firebase Firestore
// =============================================================================

// ---------------------------------------------------------------------------
// IMPORT ES MODULE - WAJIB di baris paling atas file.
// Aturan JavaScript ESM: pernyataan 'import' hanya boleh ada di level
// teratas file (top-level), tidak boleh di dalam fungsi atau blok kode.
// Nama modul ('firebase/app' dan 'firebase/firestore') dipetakan ke URL CDN
// melalui <script type="importmap"> yang ada di index.html.
// ---------------------------------------------------------------------------
import { initializeApp }                                          from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp,
         getDocs, query, where, limit, orderBy }                   from 'firebase/firestore';
// Penjelasan fungsi Firestore yang baru ditambahkan:
// - getDocs()  : Mengambil semua dokumen hasil query
// - query()    : Membuat query/pencarian ke koleksi Firestore
// - where()    : Kondisi filter (seperti WHERE di SQL)
// - limit()    : Batasi jumlah dokumen yang dikembalikan
// - orderBy()  : Urutkan hasil (opsional)



// =============================================================================
// BAGIAN 1: KONFIGURASI APLIKASI
// =============================================================================
// Berisi semua kredensial yang diperlukan aplikasi untuk terhubung ke
// layanan eksternal (Google Gemini AI dan Firebase Firestore).

// // ===========================================================================
// VERSI NETLIFY: API Key Gemini DIHAPUS dari sini demi keamanan.
// API Key disimpan di Environment Variables Netlify (Site Settings -> Env Vars).
// Panggilan ke Gemini diarahkan ke Netlify Serverless Function: /api/gemini
// yang berjalan di server, bukan di browser pengguna.
// ===========================================================================

// Konfigurasi Firebase Project "skripsi-chatbot-mebel"
// CATATAN: Firebase config boleh ada di kode publik karena keamanannya
// dikendalikan oleh Firestore Security Rules di Firebase Console.
const FIREBASE_CONFIG = {
    apiKey:            "AIzaSyD78d6wWdppdsZwyas_IYK0x2SvvwdhcBc",
    authDomain:        "skripsi-chatbot-mebel.firebaseapp.com",
    projectId:         "skripsi-chatbot-mebel",
    storageBucket:     "skripsi-chatbot-mebel.firebasestorage.app",
    messagingSenderId: "908574807446",
    appId:             "1:908574807446:web:6c062b5555f83496e639b7"
};

// Endpoint mengarah ke Netlify Serverless Function (bukan langsung ke Google)
// Function ini yang menyimpan API Key secara aman di sisi server.
const GEMINI_ENDPOINT = '/api/gemini';




// =============================================================================
// BAGIAN 2: INISIALISASI FIREBASE (ESM - Modular SDK v11)
// =============================================================================
// Fungsi initializeApp, getFirestore, dll sudah diimpor di baris paling atas.
// Di sini kita tinggal memanggilnya untuk mendaftarkan app dan mendapat
// referensi ke database Firestore.

// Variabel 'db' untuk menyimpan instance Firestore Database
let db;

try {
    // initializeApp() mendaftarkan aplikasi kita ke Firebase menggunakan config
    const app = initializeApp(FIREBASE_CONFIG);
    // getFirestore() mendapatkan referensi ke database Firestore dari app tersebut
    db = getFirestore(app);
    console.log('✅ Firebase berhasil diinisialisasi (ESM Modular).');
} catch (error) {
    // Jika gagal, aplikasi tetap berjalan tapi fitur simpan riwayat nonaktif
    console.error('❌ Gagal inisialisasi Firebase:', error.message);
}



// =============================================================================
// BAGIAN 3: REFERENSI ELEMEN DOM (Document Object Model)
// =============================================================================
// Kita ambil referensi ke elemen HTML yang sering diakses agar tidak perlu
// memanggil document.getElementById() berulang kali (lebih efisien).

const chatHistory   = document.getElementById("chat-history");   // Area tampilan pesan
const userInput     = document.getElementById("user-input");      // Kotak input teks
const sendButton    = document.getElementById("send-button");     // Tombol kirim
const typingIndicator = document.getElementById("typing-indicator"); // Indikator "mengetik"


// =============================================================================
// BAGIAN 11: FUNGSI PENGUJIAN BAB 4 (GLOBAL)
// =============================================================================
window.simpanKeRekap = function(dataStr, btnId) {
    const data = JSON.parse(dataStr.replace(/&quot;/g, '"'));
    const tbody = document.getElementById('testTableBody');
    const countSpan = document.getElementById('testCount');
    
    if (tbody && countSpan) {
        const tr = document.createElement('tr');
        tr.id = `row-rekap-${data.id}`;
        
        const warnaPersen = data.arah === 'tinggi' ? '#f87171' : '#34d399';
        
        tr.innerHTML = `
            <td><strong>${data.nama}</strong></td>
            <td>${data.p}</td>
            <td>${data.l}</td>
            <td>${data.t}</td>
            <td>${data.kualitas}</td>
            <td class="angka">${formatRupiah(data.aktual)}</td>
            <td class="angka">${formatRupiah(data.fuzzy)}</td>
            <td class="angka" style="color:${warnaPersen}; font-weight:bold;">${data.persen}%</td>
            <td style="text-align:center;">
                <button onclick="window.hapusDariRekap('${data.id}')" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:16px;" title="Hapus">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
        countSpan.textContent = parseInt(countSpan.textContent) + 1;
        
        // Urutkan ulang tabel berdasarkan angka [X] di nama barang setiap kali ada data masuk
        const rows = Array.from(tbody.querySelectorAll('tr'));
        rows.sort((a, b) => {
            const nameA = a.querySelector('td:first-child').textContent;
            const nameB = b.querySelector('td:first-child').textContent;
            const matchA = nameA.match(/^\[(\d+)\]/);
            const matchB = nameB.match(/^\[(\d+)\]/);
            if (matchA && matchB) {
                return parseInt(matchA[1]) - parseInt(matchB[1]);
            }
            return nameA.localeCompare(nameB);
        });
        
        tbody.innerHTML = '';
        rows.forEach(r => tbody.appendChild(r));
        
        // Ubah state tombol
        const btn = document.getElementById(btnId);
        if(btn) {
            btn.innerHTML = '✅ Tersimpan';
            btn.style.background = 'transparent';
            btn.style.color = '#10b981';
            btn.style.border = '1px solid #10b981';
            btn.style.boxShadow = 'none';
            btn.disabled = true;
        }
    }
};

window.hapusDariRekap = function(id) {
    const row = document.getElementById(`row-rekap-${id}`);
    const countSpan = document.getElementById('testCount');
    if(row) {
        row.remove();
        if(countSpan) countSpan.textContent = Math.max(0, parseInt(countSpan.textContent) - 1);
        
        // Kembalikan tombol simpan di chat ke kondisi semula
        const btn = document.getElementById(`btn-rekap-${id}`);
        if(btn) {
            btn.innerHTML = '💾 Simpan Data Ini ke Tabel Rekap';
            btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
            btn.style.color = 'white';
            btn.style.border = 'none';
            btn.style.boxShadow = '0 2px 10px rgba(16,185,129,0.2)';
            btn.disabled = false;
        }
    }
};

window.kosongkanRekap = function() {
    if(confirm('Yakin ingin mengosongkan seluruh tabel rekap?')) {
        const tbody = document.getElementById('testTableBody');
        const countSpan = document.getElementById('testCount');
        if(tbody) tbody.innerHTML = '';
        if(countSpan) countSpan.textContent = '0';
        
        // Reset semua tombol rekap di chat
        const semuaTombol = document.querySelectorAll('[id^="btn-rekap-"]');
        semuaTombol.forEach(btn => {
            btn.innerHTML = '💾 Simpan Data Ini ke Tabel Rekap';
            btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
            btn.style.color = 'white';
            btn.style.border = 'none';
            btn.style.boxShadow = '0 2px 10px rgba(16,185,129,0.2)';
            btn.disabled = false;
        });
    }
};

window.jalankanAutoTest = async function() {
    appendMessage('bot', `<p>⏳ Sedang menarik dan memproses seluruh data dari Firestore...</p>`);
    setTypingIndicator(true);
    
    // Matikan input sementara
    setInputDisabled(true);

    try {
        const q = query(collection(db, "produk_referensi"));
        const snapshot = await getDocs(q);
        
        let allData = [];
        snapshot.forEach(doc => {
            allData.push(doc.data());
        });
        
        if (allData.length === 0) {
            appendMessage('bot', `<p>⚠️ Database referensi masih kosong. Silakan upload file <strong>data_uji.csv</strong> Anda terlebih dahulu.</p>`);
            setTypingIndicator(false);
            setInputDisabled(false);
            return;
        }

        // Urutkan data berdasarkan angka di dalam tanda kurung siku [1], [2], dst.
        allData.sort((a, b) => {
            const matchA = a.nama_barang.match(/^\[(\d+)\]/);
            const matchB = b.nama_barang.match(/^\[(\d+)\]/);
            if (matchA && matchB) {
                return parseInt(matchA[1]) - parseInt(matchB[1]); // Sort numerik
            }
            return a.nama_barang.localeCompare(b.nama_barang); // Fallback ke alfabet
        });

        const tbody = document.getElementById('testTableBody');
        const countSpan = document.getElementById('testCount');
        if (tbody) tbody.innerHTML = ''; // Kosongkan tabel sebelum diisi ulang
        
        let totalMape = 0;
        let count = 0;

        for (let produk of allData) {
            try {
                let hasilFuzzy = hitungFuzzyTsukamoto(
                    produk.panjang,
                    produk.lebar,
                    produk.tinggi,
                    produk.kualitas_bahan
                );
                
                const testId = 'auto-' + Date.now() + Math.random().toString(36).substring(7);
                let selisih = hasilFuzzy.hpp - produk.hpp_aktual;
                let persen = ((Math.abs(selisih) / produk.hpp_aktual) * 100);
                let arah = selisih > 0 ? 'tinggi' : 'rendah';
                let warnaPersen = arah === 'tinggi' ? '#f87171' : '#34d399';
                
                totalMape += persen;
                count++;

                if (tbody) {
                    const tr = document.createElement('tr');
                    tr.id = `row-rekap-${testId}`;
                    tr.innerHTML = `
                        <td><strong>${produk.nama_barang}</strong></td>
                        <td>${produk.panjang}</td>
                        <td>${produk.lebar}</td>
                        <td>${produk.tinggi}</td>
                        <td>${produk.kualitas_bahan}</td>
                        <td class="angka">${formatRupiah(produk.hpp_aktual)}</td>
                        <td class="angka">${formatRupiah(hasilFuzzy.hpp)}</td>
                        <td class="angka" style="color:${warnaPersen}; font-weight:bold;">${persen.toFixed(2)}%</td>
                        <td style="text-align:center;">
                            <button onclick="window.hapusDariRekap('${testId}')" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:16px;" title="Hapus">🗑️</button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                }
            } catch(e) {
                console.error("Gagal hitung", produk.nama_barang, e);
            }
        }
        
        if (countSpan) countSpan.textContent = count;
        
        let avgMape = (totalMape / count).toFixed(2);
        
        setTypingIndicator(false);
        setInputDisabled(false);
        appendMessage('bot', `
            <div style="background:linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.1)); border:1px solid #10b981; padding:16px; border-radius:12px;">
                <h3 style="color:#10b981; margin:0 0 10px 0;">✅ Auto-Test ${count} Data Selesai!</h3>
                <p style="margin:0 0 8px 0; font-size:13px;">Algoritma Fuzzy Tsukamoto Anda berhasil memproses <strong>${count} data uji</strong> secara instan (tanpa campur tangan AI/Kalibrasi).</p>
                <div style="background:rgba(255,255,255,0.05); padding:12px; border-radius:8px; display:inline-block; margin-top:8px;">
                    Rata-rata Error Total (MAPE): <br>
                    <strong style="color:#10b981; font-size:24px;">${avgMape}%</strong>
                </div>
                <p style="margin:16px 0 12px 0; font-size:13px;">Data sudah tersusun rapi di dalam tabel dan siap di-<em>screenshot</em> untuk Bab 4.</p>
                <button onclick="document.getElementById('testModal').classList.add('active')" style="width:100%; background:linear-gradient(135deg, #10b981, #059669); border:none; color:white; padding:12px; border-radius:8px; cursor:pointer; font-weight:bold; font-size:13px; box-shadow: 0 4px 10px rgba(16,185,129,0.3);">
                    📋 Buka Tabel Rekap Sekarang
                </button>
            </div>
        `);
        
    } catch (e) {
        setTypingIndicator(false);
        setInputDisabled(false);
        appendMessage('bot', `<p>⚠️ Gagal menjalankan Auto-Test: ${e.message}</p>`);
    }
};

/**
 * Menambahkan bubble pesan baru ke area chat.
 * @param {string} sender - "user" atau "bot" untuk menentukan styling bubble.
 * @param {string} htmlContent - Konten HTML yang akan ditampilkan di dalam bubble.
 */
function appendMessage(sender, htmlContent) {
    // Buat elemen div baru sebagai wrapper untuk satu baris pesan
    const messageRow = document.createElement("div");
    // Tambahkan class CSS "message-row" dan "user-row" atau "bot-row"
    // Ini akan mengatur apakah pesan muncul di kanan (user) atau kiri (bot)
    messageRow.classList.add("message-row", `${sender}-row`);

    // Buat elemen div untuk bubble pesan itu sendiri
    const bubble = document.createElement("div");
    // Tambahkan class "bubble" dan "user-bubble" atau "bot-bubble"
    bubble.classList.add("bubble", `${sender}-bubble`);
    // Isi bubble dengan konten HTML (mendukung format teks tebal, daftar, dll)
    bubble.innerHTML = htmlContent;

    // Masukkan bubble ke dalam messageRow, lalu messageRow ke area chat
    messageRow.appendChild(bubble);
    chatHistory.appendChild(messageRow);

    // Gulirkan area chat ke bawah otomatis agar pesan terbaru selalu terlihat
    // scrollTop = scrollHeight memastikan scroll selalu berada di posisi paling bawah
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

/**
 * Menampilkan atau menyembunyikan indikator "Bot sedang mengetik...".
 * @param {boolean} isVisible - true untuk tampilkan, false untuk sembunyikan.
 */
function setTypingIndicator(isVisible) {
    // Mengubah properti CSS 'display' untuk menampilkan/menyembunyikan elemen
    typingIndicator.style.display = isVisible ? "flex" : "none";
    if (isVisible) {
        // Scroll ke bawah agar indikator terlihat ketika muncul
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }
}

/**
 * Mengaktifkan atau menonaktifkan input dan tombol kirim.
 * Dipanggil saat bot sedang memproses agar user tidak bisa mengirim pesan ganda.
 * @param {boolean} isDisabled - true untuk menonaktifkan, false untuk mengaktifkan.
 */
function setInputDisabled(isDisabled) {
    userInput.disabled   = isDisabled;
    sendButton.disabled  = isDisabled;
}

/**
 * Memformat angka Rupiah ke format mata uang Indonesia.
 * Contoh: 5000000 -> "Rp 5.000.000"
 * @param {number} angka - Nilai numerik yang akan diformat.
 * @returns {string} String terformat.
 */
function formatRupiah(angka) {
    // Intl.NumberFormat adalah API bawaan JavaScript untuk format angka lokal
    return new Intl.NumberFormat("id-ID", {
        style:    "currency",
        currency: "IDR",
        minimumFractionDigits: 0, // Tidak tampilkan desimal (tidak perlu untuk Rupiah)
        maximumFractionDigits: 0
    }).format(angka);
}


// =============================================================================
// BAGIAN 5: FUNGSI KOMUNIKASI DENGAN GEMINI API (NLP)
// =============================================================================

/**
 * Mengirim teks user ke Gemini API dan mengekstrak variabel terstruktur.
 *
 * Teknik yang digunakan: "System Prompting" - kita memberikan instruksi
 * yang sangat spesifik kepada Gemini tentang format output yang diinginkan.
 * Ini memastikan Gemini HANYA mengembalikan JSON murni, bukan teks biasa.
 *
 * @param {string} pesanUser - Teks deskripsi mebel dari pengguna.
 * @returns {object|null} Objek JSON dengan variabel yang diekstrak, atau null jika gagal.
 */
async function ekstrakVariabelDenganGemini(pesanUser) {

    // --- SYSTEM PROMPT ---
    // Ini adalah "instruksi rahasia" yang tidak terlihat user tapi dibaca Gemini.
    // Kunci keberhasilan ekstraksi ada di sini. Kita berikan contoh (few-shot prompting)
    // agar Gemini mengerti persis apa yang kita inginkan.
    // PERBAIKAN: systemPrompt ditulis menggunakan string biasa (single quote + concatenation)
    // agar tidak ada konflik dengan karakter backtick (`) di dalam teks.
    const systemPrompt =
        'Kamu adalah asisten ekstraksi data untuk aplikasi estimasi harga mebel.\n' +
        'Tugasmu HANYA mengekstrak informasi berikut dari teks yang diberikan oleh pengguna dan mengembalikannya sebagai JSON murni:\n' +
        '1. "nama_barang": Jenis/nama mebel yang disebutkan (string).\n' +
        '2. "panjang": Ukuran panjang dalam cm (angka, tanpa satuan). Konversi dari meter jika perlu (1m=100cm).\n' +
        '3. "lebar": Ukuran lebar dalam cm (angka).\n' +
        '4. "tinggi": Ukuran tinggi dalam cm (angka).\n' +
        '5. "kualitas_bahan": Kualitas bahan yang disebutkan. WAJIB pilih salah satu: "Standar", "Menengah", atau "Premium".\n' +
        '   Inferensikan dari kata: "kayu biasa/murah/ekonomi" -> "Standar"; "mahoni/pinus/menengah" -> "Menengah"; "jati solid/premium/mewah" -> "Premium".\n' +
        '\n' +
        'ATURAN KETAT:\n' +
        '- Output HARUS berupa JSON murni saja. JANGAN tambahkan teks apapun di luar JSON, termasuk blok markdown.\n' +
        '- Jika ada nilai yang tidak disebutkan atau tidak bisa diinferensi dengan yakin, isi dengan nilai null.\n' +
        '- Format output yang benar: {"nama_barang":"...","panjang":...,"lebar":...,"tinggi":...,"kualitas_bahan":"..."}\n' +
        '\n' +
        'Contoh input: "Saya mau bikin lemari pakaian kayu jati ukuran 2 meter x 60cm x 200cm"\n' +
        'Contoh output: {"nama_barang":"Lemari Pakaian","panjang":200,"lebar":60,"tinggi":200,"kualitas_bahan":"Premium"}';

    // --- BUAT PAYLOAD REQUEST ---
    // Struktur request body mengikuti dokumentasi resmi Gemini API
    const requestBody = {
        // "system_instruction" adalah cara resmi mengirim system prompt ke Gemini
        system_instruction: {
            parts: [{ text: systemPrompt }]
        },
        // "contents" berisi pesan dari user
        contents: [{
            role: "user",
            parts: [{ text: pesanUser }]
        }],
        // "generationConfig" mengatur perilaku generasi teks
        generationConfig: {
            // responseMimeType meminta Gemini untuk mengembalikan JSON secara eksplisit
            // Ini cara terbaik untuk memastikan output valid JSON
            responseMimeType: "application/json",
            temperature: 0.1, // Nilai rendah = output lebih deterministik (konsisten), tidak "kreatif"
            maxOutputTokens: 256 // Batasi panjang output karena kita hanya butuh JSON singkat
        }
    };

    // --- KIRIM REQUEST KE GEMINI API ---
    // Menggunakan fetch() API bawaan browser untuk HTTP request
    const response = await fetch(GEMINI_ENDPOINT, {
        method:  "POST", // Metode HTTP POST karena kita mengirim data
        headers: { "Content-Type": "application/json" }, // Beritahu server kita mengirim JSON
        body:    JSON.stringify(requestBody) // Ubah objek JS menjadi string JSON
    });

    // Cek apakah request berhasil (status HTTP 200-299)
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gemini API Error: ${errorData.error?.message || response.statusText}`);
    }

    // --- PARSE RESPONSE ---
    const responseData = await response.json();

    // Navigasi ke dalam struktur response Gemini untuk mendapatkan teks output
    // Struktur: candidates[0].content.parts[0].text
    const rawText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
        throw new Error("Gemini tidak mengembalikan konten yang valid.");
    }

    // Hapus format markdown backtick jika Gemini bandel membungkus JSON-nya
    const cleanText = rawText.replace(/```json\n?/gi, '').replace(/```/g, '').trim();
    
    // Parse string JSON yang dikembalikan Gemini menjadi objek JavaScript
    const extractedData = JSON.parse(cleanText);
    return extractedData;
}


// =============================================================================
// BAGIAN 6: FUNGSI PENYIMPANAN KE FIREBASE FIRESTORE
// =============================================================================

/**
 * Menyimpan data hasil estimasi ke koleksi "riwayat_pesanan" di Firestore.
 * @param {object} data - Objek berisi semua data yang akan disimpan.
 * @returns {string} ID dokumen yang baru dibuat, atau null jika gagal.
 */
async function simpanKeFirestore(data) {
    // Cek apakah database Firestore berhasil diinisialisasi sebelumnya
    if (!db) {
        console.warn("Firestore tidak tersedia, data tidak disimpan.");
        return null;
    }

    try {
        // "collection(db, 'riwayat_pesanan')" - Referensi ke koleksi di Firestore.
        // Jika koleksi belum ada, Firestore akan membuatnya secara otomatis.
        const koleksiRef = collection(db, "riwayat_pesanan");

        // "addDoc()" menambahkan dokumen baru dengan ID yang dibuat otomatis oleh Firestore.
        // Kita menyimpan semua field yang relevan untuk keperluan analisis data.
        const docRef = await addDoc(koleksiRef, {
            teks_user:      data.teks_user,           // Teks asli yang diketik user
            nama_barang:    data.nama_barang,          // Nama mebel yang diestimasi
            panjang_cm:     data.panjang,              // Dimensi dalam cm
            lebar_cm:       data.lebar,
            tinggi_cm:      data.tinggi,
            volume_cm3:     data.volume,               // Volume dalam cm³
            kualitas_bahan: data.kualitas_bahan,       // Kualitas bahan
            estimasi_hpp:   data.estimasi_hpp,         // Hasil HPP dalam Rupiah
            timestamp:      serverTimestamp()          // Waktu server saat data disimpan
        });

        console.log(`✅ Data tersimpan ke Firestore dengan ID: ${docRef.id}`);
        return docRef.id;

    } catch (error) {
        console.error("❌ Gagal menyimpan ke Firestore:", error);
        return null;
    }
}


// =============================================================================
// BAGIAN 6b: PENCARIAN CERDAS MULTI-LAYER DI FIRESTORE
// =============================================================================
// Sistem pencarian 3 lapisan (semakin kebawah semakin "pintar"):
//   Layer 1 - Keyword Match  : cocokkan kata per kata (paling cepat)
//   Layer 2 - Bigram Similarity : cocokkan karakter berpasangan (tangkap typo/mirip)
//   Layer 3 - Sinonim Mebel  : perluas query dengan kata-kata sinonim
// Setiap produk mendapat SKOR GABUNGAN dari ketiga lapisan.

// -----------------------------------------------------------------------
// KAMUS SINONIM MEBEL (Layer 3)
// Kunci = kata yang mungkin diketik user
// Nilai = kata-kata yang harus ikut dicari di database
// Ini sangat membantu ketika user pakai kata sehari-hari yang berbeda
// dari nama produk di database.
// -----------------------------------------------------------------------
const SINONIM_MEBEL = {
    // Kursi & Sofa
    'kursi goyang':    ['kursi santai', 'kursi malas', 'rocking'],
    'kursi malas':     ['kursi santai', 'kursi goyang'],
    'sofa':            ['kursi tamu', 'sofa tamu', 'kursi sofa'],
    'couch':           ['sofa', 'kursi tamu'],
    'kursi makan':     ['kursi makan', 'kursi dapur'],
    'bangku':          ['kursi', 'bangku taman', 'bench'],
    // Lemari & Rak
    'lemari baju':     ['lemari pakaian', 'wardrobe', 'cabinet'],
    'lemari pakaian':  ['wardrobe', 'lemari baju', 'almari'],
    'almari':          ['lemari', 'lemari pakaian', 'wardrobe'],
    'wardrobe':        ['lemari pakaian', 'lemari baju'],
    'rak buku':        ['rak buku', 'bookshelf', 'rak dinding'],
    'kabinet':         ['lemari', 'cabinet', 'bufet', 'lemari kecil'],
    'storage':         ['rak', 'lemari', 'kabinet'],
    // Meja
    'meja tulis':      ['meja kerja', 'meja belajar', 'meja kantor'],
    'meja belajar':    ['meja kerja', 'meja tulis', 'meja kantor'],
    'meja kantor':     ['meja kerja', 'meja direktur', 'meja tulis'],
    'meja makan':      ['meja makan', 'dining table'],
    'meja tv':         ['bufet', 'tv cabinet', 'meja televisi'],
    'desk':            ['meja kerja', 'meja tulis', 'meja belajar'],
    // Tempat Tidur
    'tempat tidur':    ['dipan', 'ranjang', 'bed', 'kasur', 'springbed'],
    'ranjang':         ['dipan', 'tempat tidur', 'bed'],
    'dipan':           ['tempat tidur', 'ranjang', 'bed frame'],
    'kasur':           ['dipan', 'tempat tidur', 'ranjang'],
    'bunk bed':        ['dipan tingkat', 'tempat tidur tingkat', 'ranjang susun'],
    'tingkat':         ['bunk bed', 'dipan tingkat', 'susun'],
    // Aksesori & Dekorasi
    'tempat abu':      ['asbak', 'ashtray'],
    'ashtray':         ['asbak', 'tempat abu rokok'],
    'cermin':          ['kaca', 'mirror', 'figura cermin'],
    'kaca rias':       ['cermin', 'meja rias', 'kaca'],
    'meja rias':       ['cermin', 'vanity', 'dressing table'],
    'foto':            ['figura', 'bingkai', 'frame', 'pigura'],
    'bingkai':         ['figura', 'pigura', 'frame foto'],
    'pigura':          ['figura', 'bingkai', 'frame'],
    'gantungan':       ['hanger', 'gantungan baju', 'standing hanger'],
    // Pintu & Partisi
    'pintu':           ['pintu kayu', 'daun pintu', 'door'],
    'partisi':         ['sekat ruangan', 'room divider', 'bufet partisi'],
    'sekat':           ['partisi', 'room divider'],
    // Taman & Outdoor
    'bangku taman':    ['garden bench', 'bangku outdoor', 'magic bench'],
    'kursi taman':     ['bangku taman', 'kursi outdoor', 'garden chair'],
    // Ibadah
    'mimbar':          ['mimbar masjid', 'podium', 'mimbar ceramah'],
    'podium':          ['mimbar', 'lectern'],
};

// -----------------------------------------------------------------------
// FUNGSI BIGRAM SIMILARITY (Dice Coefficient)
// -----------------------------------------------------------------------
// Bigram = pasangan 2 karakter berturut-turut.
// Contoh: "lemari" → {"le", "em", "ma", "ar", "ri"}
//
// Dice Coefficient = (2 × |irisan bigram|) / (|bigram A| + |bigram B|)
// Nilainya antara 0 (sama sekali berbeda) dan 1 (identik).
//
// Mengapa bigram? Karena:
//   - Menangkap typo: "lemari" vs "lmari" → skor ~0.6 (masih mirip)
//   - Menangkap singkatan: "kursi krj" vs "kursi kerja" → skor lumayan
//   - Tidak sensitif terhadap urutan kata yang mirip

function hitungBigram(str) {
    // Buat Set bigram dari string yang diberikan
    // Set digunakan agar tidak ada duplikat
    const bigrams = new Set();
    for (let i = 0; i < str.length - 1; i++) {
        bigrams.add(str.slice(i, i + 2)); // Ambil 2 karakter dari posisi i
    }
    return bigrams;
}

function skorBigram(str1, str2) {
    // Hitung bigram untuk kedua string
    const b1 = hitungBigram(str1.toLowerCase());
    const b2 = hitungBigram(str2.toLowerCase());

    if (b1.size === 0 || b2.size === 0) return 0;

    // Hitung irisan (bigram yang ada di KEDUA string)
    let irisan = 0;
    b1.forEach(bg => { if (b2.has(bg)) irisan++; });

    // Dice Coefficient: (2 × irisan) / (total bigram keduanya)
    return (2 * irisan) / (b1.size + b2.size);
}

// -----------------------------------------------------------------------
// FUNGSI UTAMA: CARI DATA DI FIRESTORE (3 Layer)
// -----------------------------------------------------------------------

/**
 * Mencari produk referensi di Firestore dengan sistem 3 lapisan pencarian.
 *
 * SCORING SYSTEM:
 *   +3.0  per kata kunci yang EXACT MATCH di nama produk
 *   +2.0  per kata sinonim yang exact match
 *   +skor bigram × 2  jika skor bigram nama produk > 0.35
 *   +1.0  jika kategori utama (kata pertama) cocok
 *
 * @param {string} namaBarang - Nama barang dari ekstraksi Gemini
 * @returns {{ hasil: Array, mode: string }} hasil produk + mode pencarian
 */
async function cariDataDariFirestore(namaBarang) {
    if (!db) return { hasil: [], mode: 'kosong' };

    try {
        const queryLower = namaBarang.toLowerCase().trim();

        // --- LAYER 3: Ekspansi Sinonim ---
        // Cek apakah query atau bagian dari query ada di kamus sinonim
        // Hasilkan daftar kata tambahan untuk dicari
        const kataTambahan = new Set();
        Object.entries(SINONIM_MEBEL).forEach(([kunci, sinonim]) => {
            // Jika query mengandung kata kunci sinonim
            if (queryLower.includes(kunci)) {
                sinonim.forEach(s => {
                    // Tambahkan setiap kata dari sinonim ke pencarian
                    s.toLowerCase().split(/\s+/).forEach(k => { if (k.length > 2) kataTambahan.add(k); });
                });
            }
            // Cek arah sebaliknya: jika sinonim mengandung query
            sinonim.forEach(s => {
                if (queryLower.includes(s.toLowerCase())) {
                    kunci.split(/\s+/).forEach(k => { if (k.length > 2) kataTambahan.add(k); });
                }
            });
        });

        // --- LAYER 1: Kata kunci dari query asli ---
        const kataKunci = queryLower
            .split(/\s+/)
            .filter(k => k.length > 2);

        // Gabungkan kata kunci asli + sinonim
        const semuaKata = [...new Set([...kataKunci, ...kataTambahan])];
        const kataUtama = kataKunci[0]; // Kata pertama = kategori utama produk

        console.log('🔍 Mencari:', queryLower);
        console.log('📚 Kata kunci:', kataKunci);
        console.log('🔀 Sinonim:', [...kataTambahan]);

        // Ambil semua dokumen dari Firestore
        const snap = await getDocs(collection(db, 'produk_referensi'));
        if (snap.empty) return { hasil: [], mode: 'kosong' };

        const hasilPencarian = [];

        snap.forEach(docSnap => {
            const data     = docSnap.data();
            const namaDB   = (data.nama_barang_lower || data.nama_barang.toLowerCase());

            let skor        = 0;
            let adaExact    = false; // Flag: apakah ada keyword yang persis cocok
            let adaSinonim  = false; // Flag: apakah cocok hanya karena sinonim

            // --- LAYER 1: Keyword exact match (bobot paling tinggi: +3 per kata) ---
            kataKunci.forEach(kata => {
                if (namaDB.includes(kata)) {
                    skor += 3;
                    adaExact = true;
                }
            });

            // --- LAYER 3: Sinonim match (bobot medium: +2 per kata sinonim) ---
            kataTambahan.forEach(kata => {
                if (namaDB.includes(kata)) {
                    skor += 2;
                    adaSinonim = true;
                }
            });

            // --- LAYER 2: Bigram Similarity ---
            // Hitung kemiripan karakter antara query dan nama produk di DB
            // Hanya jalankan jika belum ada exact/sinonim match (efisiensi)
            // atau untuk membonus produk yang sangat mirip
            const skorBig = skorBigram(queryLower, namaDB);
            if (skorBig > 0.35) {
                // Tambah skor proporsional dengan kemiripan bigram
                // Max tambahan dari bigram = 2.0 (saat skor = 1.0)
                skor += skorBig * 2;
            }

            // --- Bonus: Kategori utama (kata pertama) cocok ---
            // Contoh: query "kursi" → produk "Kursi Tamu" dapat bonus +1
            if (kataUtama && namaDB.startsWith(kataUtama)) {
                skor += 1;
            }

            // Masukkan ke hasil jika skor minimal 1
            // (berarti ada setidaknya 1 keyword/sinonim yang cocok, atau bigram sangat mirip)
            if (skor >= 1) {
                hasilPencarian.push({
                    id:          docSnap.id,
                    skor,
                    adaExact,    // Dipakai untuk menentukan label di UI
                    adaSinonim,
                    ...data
                });
            }
        });

        // Urutkan: skor tertinggi di atas
        hasilPencarian.sort((a, b) => b.skor - a.skor);

        // Tentukan "mode" pencarian untuk ditampilkan di UI
        let mode = 'tidak_ada';
        if (hasilPencarian.length > 0) {
            const adaYangExact = hasilPencarian.some(p => p.adaExact);
            mode = adaYangExact ? 'exact' : 'mirip'; // exact = cocok persis, mirip = produk serupa
        }

        return { hasil: hasilPencarian, mode };

    } catch (err) {
        console.error('❌ Gagal mencari di Firestore:', err);
        return { hasil: [], mode: 'error' };
    }
}

/**
 * Membuat HTML daftar produk referensi dengan label mode pencarian.
 * Menampilkan label berbeda untuk "Cocok Persis" vs "Produk Serupa".
 *
 * @param {Array}  produkList - Hasil dari cariDataDariFirestore().hasil
 * @param {string} namaBarang - Nama yang dicari
 * @param {string} mode       - 'exact' | 'mirip'
 */
function buatHtmlDaftarReferensi(produkList, namaBarang, mode = 'exact') {
    // Label header berbeda tergantung mode pencarian
    const labelMode  = mode === 'exact'
        ? `<span style="color:#34d399">✅ ${produkList.length} produk cocok</span>`
        : `<span style="color:#fbbf24">🔀 ${produkList.length} produk serupa (tidak ada yang persis)</span>`;

    const pesanMode = mode === 'exact'
        ? 'Saya menemukan produk yang cocok di database. Klik untuk langsung menghitung HPP!'
        : `Produk "<strong>${namaBarang}</strong>" tidak ditemukan persis, tapi ini yang paling mirip. Klik untuk estimasi berdasarkan dimensi produk serupa.`;

    const barisProduk = produkList.slice(0, 6).map((p, i) => {
        // Badge kualitas
        const kBadge = p.kualitas_bahan === 'Premium'  ? 'badge-gold'  :
                       p.kualitas_bahan === 'Menengah' ? 'badge-blue'  : 'badge-green';

        // Badge relevansi: apakah cocok persis atau hanya mirip?
        const relBadge = p.adaExact
            ? '<span style="font-size:10px; color:#34d399; background:rgba(52,211,153,0.12); padding:1px 6px; border-radius:4px;">Cocok</span>'
            : '<span style="font-size:10px; color:#fbbf24; background:rgba(251,191,36,0.12); padding:1px 6px; border-radius:4px;">Mirip</span>';

        const hppAktual = p.hpp_aktual ? formatRupiah(p.hpp_aktual) : '-';
        const vol       = Math.round(p.panjang * p.lebar * p.tinggi);

        return `
            <tr class="ref-row" data-index="${i}"
                data-panjang="${p.panjang}" data-lebar="${p.lebar}"
                data-tinggi="${p.tinggi}"  data-kualitas="${p.kualitas_bahan}"
                data-nama="${p.nama_barang}" onclick="pilihProdukReferensi(${i})">
                <td>${relBadge}</td>
                <td><strong>${p.nama_barang}</strong></td>
                <td>${p.panjang}×${p.lebar}×${p.tinggi} cm</td>
                <td>${vol.toLocaleString('id-ID')} cm³</td>
                <td><span class="badge ${kBadge}">${p.kualitas_bahan}</span></td>
                <td style="color:var(--text-success)">${hppAktual}</td>
                <td><button class="pilih-btn">✅ Pilih</button></td>
            </tr>`;
    }).join('');

    return `
        <div class="response-header">
            <span class="icon">${mode === 'exact' ? '🔍' : '🔀'}</span>
            <strong>Pencarian: "${namaBarang}"</strong>
        </div>
        <p style="font-size:12px; margin-bottom:6px;">${labelMode}</p>
        <p style="font-size:13px; color:var(--text-secondary); margin-bottom:10px;">${pesanMode}</p>
        <div class="table-wrapper">
            <table class="rules-table" style="cursor:pointer">
                <thead><tr>
                    <th>Relevansi</th><th>Nama Produk</th><th>Dimensi</th>
                    <th>Volume</th><th>Kualitas</th><th>HPP Aktual</th><th>Aksi</th>
                </tr></thead>
                <tbody>${barisProduk}</tbody>
            </table>
        </div>
        <p style="font-size:12px; color:var(--text-secondary); margin-top:8px;">
            💡 Dimensi hanya <em>referensi</em>. Ketik ukuran spesifik Anda untuk hasil lebih akurat.
        </p>
        <style>
            .ref-row:hover td { background: rgba(99,102,241,0.08); }
            .pilih-btn {
                background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3);
                color: var(--text-accent); padding: 4px 10px; border-radius: 6px;
                font-size: 12px; cursor: pointer; transition: all 0.2s;
            }
            .pilih-btn:hover { background: rgba(99,102,241,0.3); }
        </style>
    `;
}


/**
 * Membuat konten HTML untuk bubble respon bot yang berisi:
 * - Ringkasan barang yang dipesan
 * - Detail perhitungan Fuzzy Tsukamoto (transparan)
 * - Hasil estimasi HPP akhir
 * @param {string} namaBarang - Nama mebel.
 * @param {object} hasilFuzzy - Objek hasil dari hitungFuzzyTsukamoto().
 * @returns {string} String HTML yang siap ditampilkan di bubble bot.
 */
function buatHtmlResponBot(namaBarang, hasilFuzzy) {
    const { input, fuzzifikasi, detailRules, totalAlpha, totalAlphaZ, hpp } = hasilFuzzy;

    // --- Bangun baris tabel detail aturan ---
    // Filter hanya aturan yang aktif (alpha > 0) untuk tampilan yang bersih
    const aturanAktif = detailRules.filter(r => r.aktif);
    let barisTabelAturan = "";
    aturanAktif.forEach(rule => {
        barisTabelAturan += `
            <tr>
                <td><strong>${rule.kode}</strong></td>
                <td>${rule.alpha}</td>
                <td>${rule.output.toUpperCase()}</td>
                <td>${formatRupiah(rule.z)}</td>
            </tr>`;
    });

    // --- Template HTML respon bot ---
    // Menggunakan template literal (backtick) untuk membuat HTML multi-baris dengan mudah
    return `
        <div class="response-header">
            <span class="icon">🪑</span>
            <strong>Estimasi HPP: ${namaBarang}</strong>
        </div>

        <div class="detail-section">
            <p class="section-label">📐 Dimensi & Volume</p>
            <div class="detail-grid">
                <span>Panjang</span><span>${input.panjang} cm</span>
                <span>Lebar</span><span>${input.lebar} cm</span>
                <span>Tinggi</span><span>${input.tinggi} cm</span>
                <span>Volume</span><span>${input.volume.toLocaleString("id-ID")} cm³</span>
                <span>Kualitas Bahan</span><span>${input.kualitas_bahan}</span>
            </div>
        </div>

        <div class="detail-section">
            <p class="section-label">🔢 Fuzzifikasi Volume</p>
            <div class="detail-grid">
                <span>μ Volume Kecil</span><span>${fuzzifikasi.muKecil}</span>
                <span>μ Volume Sedang</span><span>${fuzzifikasi.muSedang}</span>
                <span>μ Volume Besar</span><span>${fuzzifikasi.muBesar}</span>
            </div>
        </div>

        <div class="detail-section">
            <p class="section-label">📋 Evaluasi Aturan Aktif</p>
            <div class="table-wrapper">
                <table class="rules-table">
                    <thead><tr><th>Aturan</th><th>α (Alpha)</th><th>Output</th><th>z (Crisp)</th></tr></thead>
                    <tbody>${barisTabelAturan}</tbody>
                </table>
            </div>
        </div>

        <div class="detail-section">
            <p class="section-label">⚖️ Defuzzifikasi (Weighted Average)</p>
            <div class="formula-box">
                Z* = Σ(αᵢ·zᵢ) / Σ(αᵢ) = ${totalAlphaZ.toLocaleString("id-ID")} / ${totalAlpha} = <strong>${formatRupiah(hpp)}</strong>
            </div>
        </div>

        <div class="result-box">
            <span class="result-label">💰 ESTIMASI HPP</span>
            <span class="result-value">${formatRupiah(hpp)}</span>
        </div>
        <p class="disclaimer">*Estimasi ini telah disimpan ke riwayat. Harga dapat berbeda sesuai kondisi aktual.</p>
    `;
}


// =============================================================================
// BAGIAN 8: HANDLER UTAMA - MEMPROSES PESAN USER
// =============================================================================

/**
 * Fungsi inti yang dipanggil setiap kali user mengirim pesan.
 * Mengorkestrasi seluruh alur: UI -> Gemini -> Fuzzy -> Firebase -> UI.
 */
async function prosesPesanUser() {
    // Ambil teks dari input dan hilangkan spasi di awal/akhir
    const teksUser = userInput.value.trim();

    // Jika input kosong, jangan lakukan apapun
    if (!teksUser) return;

    // --- Tampilkan pesan user di chat ---
    appendMessage("user", teksUser);

    // --- Reset input dan nonaktifkan selama pemrosesan ---
    userInput.value = ""; // Kosongkan kotak input
    setInputDisabled(true); // Nonaktifkan input agar user tidak bisa kirim ganda
    setTypingIndicator(true); // Tampilkan "Bot sedang mengetik..."

    try {
        // ======================================================================
        // FASE 1: EKSTRAKSI VARIABEL VIA GEMINI API
        // ======================================================================
        // Kirim teks user ke Gemini untuk diekstrak variabel-variabelnya
        const dataEkstrak = await ekstrakVariabelDenganGemini(teksUser);

        // Cek apakah semua variabel penting berhasil diekstrak
        const { nama_barang, kualitas_bahan } = dataEkstrak;
        let { panjang, lebar, tinggi } = dataEkstrak;

        // ======================================================================
        // FASE 1b: CARI DATA REFERENSI DI FIREBASE (jika dimensi tidak lengkap)
        // ======================================================================
        // Jika nama barang ada TAPI dimensi (panjang/lebar/tinggi) tidak lengkap,
        // coba cari di database produk_referensi yang sudah diupload via upload.html.
        // Ini membuat chatbot jauh lebih cerdas: tidak selalu meminta ukuran ke user.

        const dimensiLengkap = panjang != null && lebar != null && tinggi != null;

        if (nama_barang && !dimensiLengkap) {
            // Tampilkan status bahwa bot sedang mencari di database
            document.getElementById('typing-indicator').querySelector('span:last-child').textContent =
                'Mencari referensi di database...';

            // Fungsi ini sekarang mengembalikan { hasil: Array, mode: string }
            // mode: 'exact' = ada yang cocok persis, 'mirip' = hanya serupa, 'tidak_ada' = tidak ada
            const { hasil: hasilDB, mode: modeDB } = await cariDataDariFirestore(nama_barang);

            // Reset teks indikator mengetik ke default
            document.getElementById('typing-indicator').querySelector('span:last-child').textContent =
                'Asisten sedang berpikir...';

            if (hasilDB.length > 0) {
                // ✅ Data ditemukan! Tampilkan pilihan ke user dengan label mode pencarian.
                // Mode 'exact' = produk persis; mode 'mirip' = produk serupa via bigram/sinonim
                setTypingIndicator(false);
                const htmlReferensi = buatHtmlDaftarReferensi(hasilDB, nama_barang, modeDB);
                appendMessage('bot', htmlReferensi);

                // Simpan data referensi ke window agar bisa diakses oleh pilihProdukReferensi()
                window._dataReferensiTerakhir = hasilDB;
                window._namaBarangTerakhir    = nama_barang;

                setInputDisabled(false);
                return; // Tunggu user memilih produk
            }
            // Tidak ada hasil sama sekali → lanjut ke pesan minta dimensi
        }

        // Jika dimensi tidak lengkap DAN tidak ada di database → minta ke user
        if (!nama_barang || !dimensiLengkap || !kualitas_bahan) {
            const kurang = [];
            if (!nama_barang)   kurang.push('nama barang');
            if (panjang == null) kurang.push('ukuran panjang (cm)');
            if (lebar   == null) kurang.push('ukuran lebar (cm)');
            if (tinggi  == null) kurang.push('ukuran tinggi (cm)');
            if (!kualitas_bahan) kurang.push('kualitas bahan (Standar/Menengah/Premium)');

            setTypingIndicator(false);
            appendMessage('bot', `
                <p>Saya tidak menemukan data produk "<strong>${nama_barang || 'ini'}</strong>" di database referensi.</p>
                <p>Mohon lengkapi informasi berikut:</p>
                <ul>${kurang.map(k => `<li><strong>${k}</strong></li>`).join('')}</ul>
                <p>Contoh: <em>"${nama_barang || 'Asbak'} kayu standar ukuran 15cm x 15cm x 5cm"</em></p>
            `);
            setInputDisabled(false);
            return;
        }

        // ======================================================================
        // FASE 2: VALIDASI BISNIS & PERHITUNGAN FUZZY TSUKAMOTO
        // ======================================================================
        // Pastikan tidak ada dimensi 0 atau minus yang lolos dari AI
        if (panjang <= 0 || lebar <= 0 || tinggi <= 0) {
            setTypingIndicator(false);
            appendMessage('bot', `<p>⚠️ Maaf, perhitungan gagal karena ada dimensi yang bernilai 0 atau minus. Silakan periksa kembali ukuran untuk "<strong>${nama_barang}</strong>".</p>`);
            setInputDisabled(false);
            return;
        }

        // Panggil fungsi dari fuzzy.js dengan variabel yang sudah diekstrak
        const hasilFuzzy = hitungFuzzyTsukamoto(panjang, lebar, tinggi, kualitas_bahan);

        // ======================================================================
        // FASE 3: TAMPILKAN HASIL KE UI
        // ======================================================================
        setTypingIndicator(false); // Sembunyikan indikator mengetik
        const htmlResponBot = buatHtmlResponBot(nama_barang, hasilFuzzy);
        appendMessage("bot", htmlResponBot); // Tampilkan respon di chat

        // ======================================================================
        // FASE 4: SIMPAN KE FIREBASE FIRESTORE
        // ======================================================================
        // Jalankan penyimpanan di background - tidak perlu menunggu selesai
        // Ini agar UI tidak terasa lambat hanya karena proses simpan
        simpanKeFirestore({
            teks_user:      teksUser,
            nama_barang:    nama_barang,
            panjang:        panjang,
            lebar:          lebar,
            tinggi:         tinggi,
            volume:         hasilFuzzy.input.volume,
            kualitas_bahan: kualitas_bahan,
            estimasi_hpp:   hasilFuzzy.hpp
        });

    } catch (error) {
        // Tangani semua jenis error (network error, parse error, dll)
        console.error("❌ Error saat memproses pesan:", error);
        setTypingIndicator(false);
        appendMessage("bot", `
            <p>⚠️ Terjadi kesalahan saat memproses permintaan Anda:</p>
            <p><em>${error.message}</em></p>
            <p>Pastikan API Key Gemini sudah benar dan koneksi internet Anda stabil, lalu coba lagi.</p>
        `);
    } finally {
        // "finally" selalu dijalankan, baik sukses maupun error
        // Pastikan input selalu diaktifkan kembali setelah proses selesai
        setInputDisabled(false);
        userInput.focus(); // Fokuskan kursor ke input agar user bisa langsung mengetik lagi
    }
}


// =============================================================================
// BAGIAN 9: EVENT LISTENERS - MENGHUBUNGKAN UI DENGAN LOGIKA
// =============================================================================

// Event listener untuk tombol "Kirim"
// Akan memanggil prosesPesanUser() setiap kali tombol diklik
sendButton.addEventListener("click", prosesPesanUser);

// Event listener untuk kotak input
// Menangkap penekanan tombol keyboard, khususnya "Enter"
userInput.addEventListener("keydown", (event) => {
    // Cek apakah tombol yang ditekan adalah "Enter" DAN bukan bersamaan dengan "Shift"
    // "Shift+Enter" biasanya untuk baris baru, sementara "Enter" saja untuk kirim
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault(); // Cegah perilaku default (pindah baris)
        prosesPesanUser();       // Proses pesan
    }
});


// =============================================================================
// BAGIAN 10: PESAN SAMBUTAN - DITAMPILKAN SAAT APLIKASI PERTAMA KALI DIBUKA
// =============================================================================

// Fungsi ini dipanggil langsung saat skrip dimuat (Immediately Invoked)
(function tampilkanPesanSelamatDatang() {
    // Tambahkan pesan sambutan dari bot sebagai pesan pertama di chat
    appendMessage("bot", `
        <div class="welcome-message">
            <p>👋 Selamat datang di <strong>Chatbot Estimasi HPP Mebel Kustom</strong>!</p>
            <p>Saya menggunakan <strong>AI (Google Gemini)</strong> dan <strong>Logika Fuzzy Tsukamoto</strong> untuk mengestimasi Harga Pokok Produksi mebel Anda.</p>
            <p>Ceritakan mebel yang ingin Anda buat, misalnya:</p>
            <div class="example-prompts">
                <button class="example-btn" onclick="document.getElementById('user-input').value=this.textContent">
                    Saya ingin membuat meja kerja dari kayu mahoni ukuran 120cm x 60cm x 75cm
                </button>
                <button class="example-btn" onclick="document.getElementById('user-input').value=this.textContent">
                    Tolong estimasikan HPP untuk lemari baju kayu jati premium 2m x 0.6m x 2.1m
                </button>
                <button class="example-btn" onclick="document.getElementById('user-input').value=this.textContent">
                    Buatkan kursi kayu biasa panjang 50cm lebar 50cm tinggi 90cm
                </button>
            </div>
            <p style="font-size:12px; margin-top:12px; color:var(--text-secondary);">
                📊 Punya data produk di Excel? <a href="upload.html" target="_blank" style="color:var(--text-accent)">Upload ke database</a> agar bot bisa mencari otomatis!
            </p>
        </div>
    `);
})();


// =============================================================================
// BAGIAN 11: FUNGSI PILIH PRODUK DARI TABEL REFERENSI
// =============================================================================
// Fungsi ini dipanggil ketika user mengklik baris/tombol "Pilih" di tabel
// produk referensi yang ditampilkan bot setelah mencari di database Firestore.
// Fungsi ini harus di-assign ke window agar bisa dipanggil dari onclick di HTML.

/**
 * Memproses produk referensi yang dipilih user dari tabel pencarian database.
 * Langsung menjalankan kalkulasi Fuzzy Tsukamoto tanpa perlu input ulang.
 * @param {number} index - Index produk di array window._dataReferensiTerakhir
 */
window.pilihProdukReferensi = async function(index) {
    // Ambil data produk yang dipilih dari variabel global
    const produk     = window._dataReferensiTerakhir?.[index];
    const namaBarang = window._namaBarangTerakhir || produk?.nama_barang;

    if (!produk) {
        appendMessage('bot', '<p>⚠️ Terjadi kesalahan: data produk tidak ditemukan.</p>');
        return;
    }

    // Tampilkan konfirmasi pilihan user sebagai pesan
    appendMessage('user', `✅ Pilih: ${produk.nama_barang} (${produk.panjang}×${produk.lebar}×${produk.tinggi} cm, ${produk.kualitas_bahan})`);

    setInputDisabled(true);
    setTypingIndicator(true);

    // Beri sedikit jeda agar UI terasa natural
    await new Promise(r => setTimeout(r, 600));

    try {
        // Jalankan kalkulasi Fuzzy Tsukamoto dengan data dari database
        let hasilFuzzy = hitungFuzzyTsukamoto(
            produk.panjang,
            produk.lebar,
            produk.tinggi,
            produk.kualitas_bahan
        );

        // (Fitur Kalibrasi AI dinonaktifkan khusus untuk pengujian dari Database 
        // agar tidak merusak P, L, T asli dari file Excel Anda)

        setTypingIndicator(false);

        // Buat dan tampilkan HTML respon
        // Jika ada HPP aktual dari database, tampilkan perbandingan
        let tambahanInfo = '';
        let selisih = 0, persen = 0, arah = '';
        if (produk.hpp_aktual) {
            selisih  = hasilFuzzy.hpp - produk.hpp_aktual;
            persen   = ((Math.abs(selisih) / produk.hpp_aktual) * 100).toFixed(2);
            arah     = selisih > 0 ? '↑ lebih tinggi' : '↓ lebih rendah';
            tambahanInfo   = `
                <div class="detail-section">
                    <p class="section-label">📊 Perbandingan dengan Data Aktual</p>
                    <div class="detail-grid">
                        <span>HPP Aktual (data)</span><span style="color:var(--text-success)">${formatRupiah(produk.hpp_aktual)}</span>
                        <span>HPP Estimasi (Fuzzy)</span><span style="color:#a5b4fc">${formatRupiah(hasilFuzzy.hpp)}</span>
                        <span>Selisih</span><span style="color:${selisih > 0 ? '#f87171' : '#34d399'}">${arah} ${persen}%</span>
                        ${produk.harga_jual ? `<span>Harga Jual (data)</span><span style="color:#fbbf24">${formatRupiah(produk.harga_jual)}</span>` : ''}
                    </div>
                </div>`;
        }

        // ======================================================================
        // TAMBAHKAN TOMBOL SIMPAN KE REKAP PENGUJIAN BAB 4
        // ======================================================================
        let tombolSimpan = '';
        if (produk.hpp_aktual) {
            const testId = Date.now();
            const dataRekap = {
                id: testId,
                nama: produk.nama_barang,
                p: produk.panjang,
                l: produk.lebar,
                t: produk.tinggi,
                kualitas: produk.kualitas_bahan,
                aktual: produk.hpp_aktual,
                fuzzy: hasilFuzzy.hpp,
                persen: persen,
                arah: selisih > 0 ? 'tinggi' : 'rendah'
            };
            const strData = JSON.stringify(dataRekap).replace(/"/g, '&quot;');
            
            tombolSimpan = `
                <div style="margin-top: 12px; text-align: right;">
                    <button id="btn-rekap-${testId}" onclick="window.simpanKeRekap('${strData}', 'btn-rekap-${testId}')" 
                            style="background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: bold; box-shadow: 0 2px 10px rgba(16,185,129,0.2);">
                        💾 Simpan Data Ini ke Tabel Rekap
                    </button>
                </div>
            `;
        }

        // Gabungkan respon standar dengan info perbandingan dan tombol simpan
        const htmlRespon = buatHtmlResponBot(produk.nama_barang, hasilFuzzy)
            .replace('<div class="result-box">', tambahanInfo + '<div class="result-box">')
            + tombolSimpan;

        appendMessage('bot', htmlRespon);

        // Simpan ke riwayat_pesanan di Firestore
        simpanKeFirestore({
            teks_user:      `[DB] ${produk.nama_barang}`,
            nama_barang:    produk.nama_barang,
            panjang:        produk.panjang,
            lebar:          produk.lebar,
            tinggi:         produk.tinggi,
            volume:         hasilFuzzy.input.volume,
            kualitas_bahan: produk.kualitas_bahan,
            estimasi_hpp:   hasilFuzzy.hpp
        });


    } catch (err) {
        setTypingIndicator(false);
        appendMessage('bot', `<p>⚠️ Gagal menghitung: ${err.message}</p>`);
    } finally {
        setInputDisabled(false);
        userInput.focus();
    }
};

