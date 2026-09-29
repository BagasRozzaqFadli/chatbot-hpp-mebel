# 📘 Panduan Lengkap: Chatbot Estimasi HPP Mebel (Fuzzy Tsukamoto + Gemini AI)

Dokumen ini adalah panduan komprehensif dari nol sampai sistem *online* untuk membangun Chatbot Estimasi Harga Pokok Produksi (HPP) Mebel. Panduan ini dirancang untuk pemula dengan bahasa yang mudah dipahami.

---

## 🚀 BAGIAN 1: PENDAHULUAN

### 1.1 Apa itu Sistem Chatbot HPP Mebel Ini?

Sistem ini adalah asisten virtual cerdas yang dapat memperkirakan Harga Pokok Produksi (HPP) sebuah produk mebel (seperti meja, kursi, lemari) berdasarkan spesifikasi yang diketik oleh pengguna. Sistem menggunakan **Gemini AI** untuk memahami bahasa manusia dan **Logika Fuzzy Tsukamoto** untuk menghitung estimasi harga berdasarkan aturan pakar.

### 1.2 Apa Manfaatnya?

- **Otomatisasi:** Tidak perlu menghitung manual dengan rumus yang rumit.
- **Kemudahan Penggunaan:** Pengguna cukup mengetik deskripsi seperti mengobrol biasa (contoh: "Tolong hitungkan HPP meja belajar ukuran 100x50x80 kayu jati").
- **Akurasi:** Menggunakan logika fuzzy yang meniru cara berpikir manusia dalam menentukan kategori (Kecil, Sedang, Besar).

### 1.3 Teknologi yang Digunakan

- **HTML, CSS, JavaScript:** Tiga pilar utama web. HTML untuk kerangka, CSS untuk tampilan, dan JavaScript (JS) untuk logika aplikasi di browser.
- **Google Gemini AI:** Kecerdasan buatan dari Google untuk mengekstrak informasi penting (panjang, lebar, tinggi, bahan) dari kalimat pengguna.
- **Firebase (Firestore):** Database awan (*cloud*) dari Google untuk menyimpan data produk referensi dan riwayat pesanan.
- **Netlify:** Layanan hosting gratis untuk meng-online-kan website kita agar bisa diakses siapa saja lewat internet.

### 1.4 Gambaran Alur Kerja Sistem

1. **User Ketik:** User mengetik pesan di aplikasi (contoh: "Berapa HPP lemari 200x50x150 standar?").
2. **Gemini Baca:** Pesan dikirim ke Gemini AI. Gemini mengubah teks menjadi data terstruktur: P=200, L=50, T=150, Kualitas=Standar.
3. **Fuzzy Hitung:** Data tersebut dimasukkan ke algoritma Fuzzy Tsukamoto untuk dihitung estimasi HPP-nya berdasarkan aturan yang sudah ditentukan.
4. **Tampil Hasil:** Hasil estimasi dan rincian perhitungannya ditampilkan kembali kepada user di layar obrolan.

### 1.5 Struktur File Proyek

- `index.html`: Halaman utama aplikasi obrolan.
- `style.css`: File untuk mengatur desain dan tata letak (warna, ukuran, dll).
- `app.js`: Otak dari aplikasi (mengatur UI, memanggil API, menyimpan data).
- `fuzzy.js`: Berisi logika matematika Fuzzy Tsukamoto.
- `upload.html` & `upload_uji.html`: Halaman admin untuk memasukkan data referensi mebel ke database.
- `netlify.toml` & folder `netlify/functions`: Konfigurasi untuk men-deploy aplikasi secara aman di internet.

---

## 🛠️ BAGIAN 2: PERSIAPAN AWAL (PREREQUISITES)

Sebelum coding, kita perlu menyiapkan beberapa alat bengkel digital.

### 2.1 Cara Install Node.js

Node.js dibutuhkan untuk menjalankan server lokal dan alat pendukung lainnya.

1. Buka [nodejs.org](https://nodejs.org/).
2. Download versi **LTS (Long Term Support)** (biasanya tombol sebelah kiri).
3. Jalankan file yang di-download, klik *Next* terus sampai *Finish*.
4. **Verifikasi:** Buka Command Prompt (CMD), ketik `node -v` dan tekan Enter. Jika muncul angka versi (misal `v18.16.0`), berarti berhasil.

### 2.2 Cara Install Git

Git digunakan untuk melacak perubahan kode dan mengirimnya ke Netlify.

1. Buka [git-scm.com](https://git-scm.com/downloads).
2. Download untuk Windows.
3. Install seperti biasa (Next terus sampai selesai).

### 2.3 Pilihan Text Editor

Direkomendasikan menggunakan **Visual Studio Code (VS Code)** karena gratis dan fiturnya lengkap.

- Download dari [code.visualstudio.com](https://code.visualstudio.com/).
- Install. Sangat disarankan untuk menginstal ekstensi **Live Server** di dalam VS Code.

### 2.4 Akun yang Dibutuhkan

Pastikan Anda memiliki/membuat:

1. Akun **Google** (untuk Firebase dan Google AI Studio).
2. Akun **GitHub** (untuk menyimpan kode sumber).
3. Akun **Netlify** (untuk hosting website).

---

## 🔥 BAGIAN 3: SETUP FIREBASE (Database Cloud)

Firebase Firestore adalah tempat kita menyimpan daftar harga referensi dan riwayat chat.

### 3.1 Penjelasan Singkat

Bayangkan Firestore seperti lemari arsip digital di internet. Data disimpan dalam bentuk dokumen (mirip kertas form) di dalam koleksi (mirip laci).

### 3.2 Langkah A: Buat Proyek Firebase

1. Buka [console.firebase.google.com](https://console.firebase.google.com/).
2. Klik **Add Project** (Tambah Proyek).
3. Beri nama proyek (misal: `Chatbot-HPP-Mebel`). Klik Continue.
4. Matikan (disable) Google Analytics (tidak perlu untuk sekarang). Klik **Create Project**.
5. Tunggu selesai, klik **Continue**.

### 3.3 Langkah B: Aktifkan Firestore Database

1. Di menu kiri, pilih **Build** > **Firestore Database**.
2. Klik **Create Database**.
3. Pilih lokasi server terdekat (misal: `asia-southeast2` Jakarta). Klik Next.
4. Pilih **Start in test mode** sementara. Klik **Create**.

### 3.4 Langkah C: Ubah Security Rules

Agar aplikasi kita tetap bisa menulis ke database tanpa batas waktu (karena test mode biasanya expired 30 hari), ubah aturannya:

1. Buka tab **Rules** di Firestore.
2. Hapus semua kode, ganti dengan kode berikut:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; 
      // PERHATIAN: Ini untuk mode skripsi/belajar. 
      // Di dunia nyata, gunakan sistem login agar lebih aman.
    }
  }
}
```

3. Klik **Publish**.

### 3.5 Langkah D: Ambil Konfigurasi Firebase

Aplikasi kita butuh "kunci" untuk masuk ke database ini.

1. Klik ikon **Gear (Settings)** di menu kiri atas > **Project settings**.
2. Scroll ke bawah ke bagian "Your apps". Klik icon web `</>`.
3. Beri nama aplikasi (misal: `Web-App-HPP`). Klik **Register app**.
4. Anda akan melihat kode `const firebaseConfig = { ... }`. Salin bagian di dalam kurung kurawal `{ ... }` ini. Kita akan membutuhkannya nanti.

### 3.6 Koleksi yang Digunakan

Kita akan membuat 2 "laci" (koleksi):

- `produk_referensi`: Menyimpan daftar mebel yang sudah ada HPP aslinya (dari pabrik/tukang).
- `riwayat_pesanan`: Menyimpan hasil obrolan bot dan user.

---

## 🧠 BAGIAN 4: SETUP GOOGLE GEMINI API

Gemini akan menjadi "otak bahasa" chatbot kita.

### 4.1 Apa itu Gemini AI?

Kecerdasan buatan dari Google (pesaing ChatGPT). Kita menggunakannya untuk mengubah teks berantakan dari manusia menjadi angka baku.

### 4.2 Mendapatkan API Key

1. Buka [aistudio.google.com](https://aistudio.google.com/).
2. Login dengan akun Google.
3. Di menu kiri, klik **Get API key**.
4. Klik **Create API key** > Pilih proyek Firebase yang dibuat di Bagian 3 > Create API key in existing project.
5. Salin kode rahasia yang muncul (huruf dan angka acak panjang).

### 4.3 Menyimpan API Key dengan Aman

**JANGAN PERNAH** membagikan API Key ini atau menaruhnya di kode publik (seperti di GitHub). Nanti di Bagian 10 kita akan bahas cara menyimpannya dengan aman di Netlify. Untuk sementara di komputer lokal, kita simpan di file lokal saja.

### 4.4 Model yang Digunakan

Kita pakai `gemini-1.5-flash`. Alasannya: Cepat merespon dan sangat pintar dalam memproses teks (murah atau gratis untuk penggunaan wajar).

---

## 🧮 BAGIAN 5: MEMBANGUN fuzzy.js (Algoritma Fuzzy Tsukamoto)

Ini adalah jantung akademis skripsi.

### 5.1 Konsep Dasar Logika Fuzzy

- **Logika Biasa (Tegas/Crisp):** Kipas angin mati (0) atau menyala penuh (1).
- **Logika Fuzzy:** Kipas angin bisa berputar pelan (0.3), sedang (0.7), atau penuh (1.0). Fuzzy berurusan dengan "derajat" bukan cuma hitam-putih.
- **Contoh Meja Sedang:** Meja ukuran 90cm menurut orang dewasa mungkin "Kecil", tapi bagi anak-anak "Besar". Komputer biasa sulit mendefinisikan batas tegas. Fuzzy memodelkan hal ini dalam bentuk matematika keanggotaan derajat.

### 5.2 Variabel Input: Volume

Volume mebel (Panjang × Lebar × Tinggi) sangat menentukan jumlah bahan dan biaya.

- **Himpunan:** Kecil, Sedang, Besar.
- **Batas (Domain):** Dalam cm³.
  - Kecil: < 100.000 (maks 1.000.000)
  - Sedang: 500.000 - 3.000.000 (puncak 1.500.000)
  - Besar: > 2.000.000 (mulai naik dari sini ke 5.000.000)
- **Ilustrasi Grafik:** Kurva Kecil turun dari kiri ke kanan. Sedang berbentuk segitiga. Besar naik dari kiri ke kanan.

### 5.3 Variabel Input: Kualitas Bahan

Ditentukan dari jenis bahan utama.

- **Standar:** Jati Belanda, Triplek biasa, MDF.
- **Menengah:** Mahoni, Teakblock.
- **Premium:** Kayu Jati Perhutani asli.

### 5.4 Variabel Output: HPP

Hasil akhir berupa Harga Pokok Produksi (Rp).

- **Himpunan:** Rendah, Sedang, Tinggi.
- **Batas Harga:**
  - Rendah: Rp 25.000 - Rp 2.500.000
  - Sedang: Rp 500.000 - Rp 6.000.000 (puncak 4.000.000)
  - Tinggi: Rp 3.000.000 - Rp 6.000.000+

### 5.5 Basis Aturan (Rule Base)

Ada 9 aturan pakar:

| Aturan | IF Volume | AND Kualitas | THEN HPP | Penjelasan Pakar                                       |
| ------ | --------- | ------------ | -------- | ------------------------------------------------------ |
| R1     | Kecil     | Standar      | Rendah   | Barang kecil bahan murah pasti sangat murah.           |
| R2     | Kecil     | Menengah     | Rendah   | Volume kecil menekan biaya walau bahan cukup bagus.    |
| R3     | Kecil     | Premium      | Sedang   | Bahan mahal, walau ukurannya kecil harganya lumayan.   |
| R4     | Sedang    | Standar      | Rendah   | Bahan standar menjaga harga tetap terjangkau.          |
| R5     | Sedang    | Menengah     | Sedang   | Keseimbangan antara ukuran dan bahan standar industri. |
| R6     | Sedang    | Premium      | Tinggi   | Kayu jati ukuran sedang sudah butuh biaya tinggi.      |
| R7     | Besar     | Standar      | Sedang   | Barang besar butuh tenaga besar walau bahan biasa.     |
| R8     | Besar     | Menengah     | Tinggi   | Barang besar bahan lumayan mahal memakan modal besar.  |
| R9     | Besar     | Premium      | Tinggi   | Kombinasi ukuran raksasa dengan kayu paling mahal.     |

### 5.6 Kode Lengkap fuzzy.js

```javascript
// Batas Volume (cm³)
const VOL_KECIL_BWH = 100000;
const VOL_KECIL_ATS = 1000000;
const VOL_SDG_BWH = 500000;
const VOL_SDG_PUNCAK = 1500000;
const VOL_SDG_ATS = 3000000;
const VOL_BSR_BWH = 2000000;
const VOL_BSR_ATS = 5000000;

// Batas HPP (Rupiah)
const HPP_RNDH_BWH = 25000;
const HPP_RNDH_ATS = 2500000;
const HPP_SDG_BWH = 500000;
const HPP_SDG_PUNCAK = 4000000;
const HPP_SDG_ATS = 6000000;
const HPP_TGG_BWH = 3000000;
const HPP_TGG_ATS = 6000000;

// Fungsi Keanggotaan Volume
function getUVolumeKecil(x) {
    if (x <= VOL_KECIL_BWH) return 1;
    if (x >= VOL_KECIL_ATS) return 0;
    return (VOL_KECIL_ATS - x) / (VOL_KECIL_ATS - VOL_KECIL_BWH);
}
function getUVolumeSedang(x) {
    if (x <= VOL_SDG_BWH || x >= VOL_SDG_ATS) return 0;
    if (x <= VOL_SDG_PUNCAK) return (x - VOL_SDG_BWH) / (VOL_SDG_PUNCAK - VOL_SDG_BWH);
    return (VOL_SDG_ATS - x) / (VOL_SDG_ATS - VOL_SDG_PUNCAK);
}
function getUVolumeBesar(x) {
    if (x <= VOL_BSR_BWH) return 0;
    if (x >= VOL_BSR_ATS) return 1;
    return (x - VOL_BSR_BWH) / (VOL_BSR_ATS - VOL_BSR_BWH);
}

function hitungFuzzyTsukamoto(volume, kualitas) {
    // 1. Fuzzifikasi
    const uk = getUVolumeKecil(volume);
    const us = getUVolumeSedang(volume);
    const ub = getUVolumeBesar(volume);

    // Kualitas (crisp value diubah ke derajat)
    const qStandar = (kualitas === "Standar") ? 1 : 0;
    const qMenengah = (kualitas === "Menengah") ? 1 : 0;
    const qPremium = (kualitas === "Premium") ? 1 : 0;

    // 2. Evaluasi Aturan & Hitung z (Nilai HPP tiap aturan)
    let totalAlphaZ = 0;
    let totalAlpha = 0;

    // R1: IF Volume Kecil AND Kualitas Standar THEN HPP Rendah
    let alpha1 = Math.min(uk, qStandar);
    if (alpha1 > 0) {
        let z1 = HPP_RNDH_ATS - (alpha1 * (HPP_RNDH_ATS - HPP_RNDH_BWH));
        totalAlphaZ += alpha1 * z1;
        totalAlpha += alpha1;
    }
  
    // ... [Tambahkan perhitungan alpha dan z untuk aturan R2 sampai R9 di sini] ...

    // 3. Defuzzifikasi (Rata-rata berbobot)
    if (totalAlpha === 0) return 0;
    return Math.round(totalAlphaZ / totalAlpha);
}
```

### 5.7 Contoh Perhitungan Manual Lengkap

- **Soal:** Meja Belajar Anak: P=100, L=59, T=81. Kualitas=Standar.
- **Hitung Volume:** 100 × 59 × 81 = 477.900 cm³.
- **Fuzzifikasi:**
  - `getUVolumeKecil(477.900)` -> `(1.000.000 - 477.900) / 900.000` = 0.58.
  - `getUVolumeSedang(477.900)` -> 0 (karena 477.900 < 500.000 batas bawah).
  - `getUVolumeBesar(477.900)` -> 0.
- **Evaluasi Aturan:** Hanya `uk` dan `qStandar` yang aktif, jadi R1 aktif. `alpha1 = min(0.58, 1) = 0.58`.
- **Nilai z crisp (R1 - Rendah):** `z1 = 2.500.000 - (0.58 * 2.475.000)` = Rp 1.064.500.
- **Defuzzifikasi:** Karena hanya 1 aturan yang aktif, WA adalah z1 itu sendiri.
- **Kesimpulan:** Hasil Fuzzy adalah ~ Rp 1.064.500. HPP Aktual dari pengerajin adalah Rp 1.059.600. MAPE hanya ~0.46% (Sangat akurat!).

---

## 🤖 BAGIAN 6: MEMBANGUN app.js (Logika Utama)

### 6.1 Penjelasan Arsitektur app.js

File ini menghubungkan semua komponen:

- Mengonfigurasi kredensial Firebase dan Gemini.
- Menangani event klik pengguna.
- Memanggil `ekstrakVariabelDenganGemini()`.
- Menghitung matematika lewat fungsi-fungsi di `fuzzy.js`.
- Membaca/menulis ke database `firestore`.

### 6.2 Alur Kerja Saat User Kirim Pesan

1. User -> Ketik "Meja tamu jati panjang 1 meter"
2. UI -> Tampilkan pesan user ke layar.
3. Gemini -> Proses teks jadi JSON: `{"p": 100, "l": 50, "t": 50, "bahan": "jati"}`
4. Fuzzy -> Hitung volumetrik, ekstrak kualitas, keluar angka HPP `850000`
5. Firestore -> Cari nama "Meja tamu", ambil HPP Aktual jika ada.
6. UI -> Buat elemen HTML kartu hasil yang estetik dan tambahkan ke layar obrolan.

### 6.3 Bagian Konfigurasi

Anda akan menaruh kredensial yang didapat.

- `GEMINI_API_KEY`: Didapat dari Google AI Studio.
- `FIREBASE_CONFIG`: Objek konfigurasi yang memuat `apiKey`, `authDomain`, `projectId` dari console Firebase. Ini penting agar JS tahu database mana yang mau diakses.

### 6.4 Fungsi Utama: ekstrakVariabelDenganGemini()

- **System Prompt:** Kita memberi peran. "Kamu adalah ahli ekstraksi JSON dari teks. Output WAJIB JSON yang berisi p, l, t, bahan, jenis".
- **Few-Shot Prompting:** Gemini butuh contoh. Kita beri contoh seperti "meja 50x50x50 standar" => `{"p":50,"l":50,"t":50,"bahan":"standar","jenis":"meja"}`. Ini mencegah halusinasi AI.
- **Temperature (0.1):** AI LLM punya sifat "kreatif" (suhu tinggi). Kita setel hampir 0 (sangat dingin) agar AI ini deterministik, tidak mengarang, konsisten seperti program robotik.

### 6.5 Fungsi Pencarian: cariDataDariFirestore()

- Firestore sulit melakukan text-search murni (seperti `LIKE %meja%` di SQL).
- Solusi kita adalah "Fuzzy Search" secara aplikasi: Kita query koleksi `produk_referensi` lalu gunakan javascript `string.includes()` atau memecah kata kunci dari input, kemudian ambil hasil yang paling mendekati kata kunci produk user.

### 6.6 Fungsi Rekap Pengujian Bab 4

- `simpanKeRekap(data)`: Menyimpan hasil ke panel HTML. Ada fitur Regex otomatis mengekstrak nomor `[1]`, `[2]` agar ketika hasil tes masuk, dia mengurutkan data tidak berantakan.
- `hapusDariRekap()` dan `kosongkanRekap()`: Memanipulasi DOM untuk menghapus elemen HTML baris dan update array.
- `jalankanAutoTest()`: Fungsi pamungkas. Membaca daftar produk uji dari Firestore, melakukan *looping* untuk setiap produk dan mengirim deskripsinya *seolah-olah* diketik user, dan otomatis mencatat ke rekap tabel. Menghemat ratusan jam waktu mahasiswa.

### 6.7 Fungsi Firebase: simpanKeFirestore()

Berjalan asinkron (menggunakan `async/await`), menggunakan SDK Firebase `addDoc` untuk memasukkan struktur JSON riwayat chat (user prompt, dimensi, hpp hitung) ke dalam koleksi `riwayat_pesanan`.

---

## 🎨 BAGIAN 7: MEMBANGUN TAMPILAN (index.html + style.css)

### 7.1 Struktur HTML Utama

- **Sidebar Kiri (`#sidebar`)**: Tempat menaruh panel tabel pengujian untuk skripsi. Di dunia nyata mungkin berisi menu riwayat chat.
- **Area Chat Kanan (`#chat-container`)**: Memiliki kotak scroll (`#chat-box`) dan form input melayang di bawah (`#input-area`).
- **Importmap**: Menggunakan tag `<script type="importmap">` untuk memanggil library modular SDK Firebase tanpa melalui npm build bundler, sangat berguna untuk project vanilla HTML.

### 7.2 Sistem Desain Dark Mode

- Kita menggunakan CSS variabel `:root` seperti `--bg-app: #121212`, `--bg-panel: #1e1e1e`.
- **Mengapa Dark Mode?** Kesannya sangat teknikal, AI banget, modern, premium (Wow Effect).
- **Google Fonts:** Menambahkan font keluarga modern seperti 'Inter' di HTML head: `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">`.

### 7.3 Komponen UI Penting

- **Bubble Pesan:** Pesan user di kanan berwarna hijau/biru cerah. Pesan bot (error/sapaan) di kiri.
- **Kartu HPP:** Desain div custom dengan bayangan (*box-shadow*) dan tata letak Grid/Flexbox rapi untuk mendisplay Tabel Dimensi, Progress Bar Volume, dan nilai harga yang diformat dengan pemisah ribuan.
- **Tombol Simpan:** Memiliki efek :hover (*micro-animations*) yang responsif.

---

## 📤 BAGIAN 8: HALAMAN UPLOAD DATA

### 8.1 upload.html — Upload Biasa

- Fitur seret-lepas (Drag & Drop) untuk CSV file.
- Pemetaan Bahan: Jika kolom CSV bilang "Jati Belanda", maka JS akan memetakan "Kualitas" = "Standar". Jika bilang "Jati Perhutani", masuk ke "Premium".
- *Batch Write Firebase:* Karena database cloud bisa error kalau dimasukkan 100 data serentak, kita gunakan Firebase `writeBatch` atau men-delay commit tiap beberapa ms untuk menjaga performa.

### 8.2 upload_uji.html — Upload Data Uji Bab 4

- Modifikasi dari `upload.html`. Saat diunggah, data akan otomatis diberikan imbuhan seperti `[1] Meja Makan`, `[2] Kursi`.
- Tag angka ini sangat fundamental untuk `jalankanAutoTest()` di `app.js` agar AI bisa mencocokkan hasil test ini dengan urutan baris di laporan Word / Excel Bab 4 Anda.
- Mendukung file berformat `.csv` (koma terpisah) yang diexport dari Excel.

---

## 💻 BAGIAN 9: MENJALANKAN APLIKASI SECARA LOKAL

### 9.1 Mengapa Perlu Server Lokal (bukan double-click HTML)

Membuka file HTML langsung di Windows akan membuatnya memiliki address `file:///C:/...`. Sistem sekuriti browser memblokir JavaScript (terutama Import Firebase ES Modules) dari jalur `file:///`. Ini dinamakan Error CORS.
**Analogi:** Kantor pemerintahan hanya melayani tamu yang lewat pintu depan resmi (Protokol HTTP, `http://`), bukan dari gorong-gorong (jalur `file:///`).

### 9.2 Cara 1: Gunakan file Jalankan_Aplikasi.bat

- Buka Notepad, tulis: `npx serve .`
- Simpan dengan nama `Jalankan_Aplikasi.bat` di folder utama aplikasi Anda (pilih Save as type: All Files).
- Klik dua kali file BAT tersebut.

### 9.3 Cara 2: Manual via Command Prompt

- Buka terminal/CMD di folder Anda.
- Ketik `npx serve .` atau `python -m http.server 8000` (jika punya Python).
- Buka web browser, ke alamat `http://localhost:3000` atau `http://localhost:8000`.

---

## 🌐 BAGIAN 10: DEPLOY KE NETLIFY (Versi Online)

### 10.1 Perbedaan Versi Lokal vs Netlify

| Fitur              | Lokal                  | Netlify Online                                     |
| ------------------ | ---------------------- | -------------------------------------------------- |
| Domain             | `localhost:3000`     | `nama-aplikasi.netlify.app`                      |
| Pemanggilan Gemini | Langsung via`app.js` | Via file Serverless`netlify/functions/gemini.js` |
| API Key Google     | Hardcode teks          | Environment Variables (Rahasia)                    |

### 10.2 Konsep Serverless Function

- API Key TIDAK BOLEH ditaruh di kode browser (GitHub/Netlify umum), bisa dicuri dan kuota disedot.
- **Analogi:** Pembeli (Browser) tidak tahu resep rahasia masakan. Mereka hanya minta ke Pelayan (Netlify Function). Pelayan yang pergi ke dapur khusus melihat resep (API Key) dan memasakkan.
- Folder `netlify/functions` yang dijalankan di Netlify bertindak sebagai Pelayan ini.

### 10.3 Isi netlify.toml

```toml
[[redirects]]
  from = "/api/gemini"
  to = "/.netlify/functions/gemini"
  status = 200
```

Menjelaskan kepada server Netlify: "Jika browser meminta akses ke URL `/api/gemini`, tolong alihkan prosesnya ke *file* `gemini.js` di dalam folder functions".

### 10.4 Langkah Install Git

Download Git di https://git-scm.com/ dan install biasa di Windows (Next terus).

### 10.5 Langkah Buat Repository GitHub

- Buka github.com, klik tombol `+` di kanan atas, pilih "New repository".
- Beri nama, set jadi "Private", lalu klik Create.

### 10.6 Langkah Push ke GitHub

Buka CMD di folder proyek, jalankan:

- `git init` (Inisiasi git)
- `git add .` (Menambahkan semua file ke pelacakan)
- `git commit -m "Upload sistem"` (Menyimpan versi)
- `git branch -M main` (Nama cabang utama)
- `git remote add origin URL_GITHUB_ANDA` (Sambungkan ke repo online)
- `git push -u origin main` (Unggah file ke internet)

### 10.7 Langkah Deploy di Netlify

- Login Netlify.com.
- Pilih `Add new site` > `Import an existing project`.
- Hubungkan akun GitHub, pilih repository tadi.
- Biarkan pengaturan Build command kosong jika HTML murni.

### 10.8 Langkah Set Environment Variable (PALING KRITIS)

Sebelum klik *Deploy*, klik tulisan "Add environment variables" di menu Netlify.

- Key isi dengan: `GEMINI_API_KEY`
- Value isi dengan API Key Google AI Studio Anda.
  Klik **Deploy Site**.

### 10.9 Langkah Update Firestore Rules

Pastikan kembali di Firebase console, rules Anda `allow read, write: if true;` dan tidak ada batasan `timestamp` expired (seperti `< timestamp.date(...)`) agar aplikasi online tidak tiba-tiba gagal menyimpan data.

### 10.10 Verifikasi Setelah Deploy

- Buka URL Netlify (contoh: `my-bot.netlify.app`).
- Coba ketik "Meja tamu".
- Apakah ada hasil kalkulasi muncul? (Berarti Gemini sukses dipanggil via functions).
- Buka console firebase, apakah chat tercatat di Firestore? (Berarti koneksi database sukses).

---

## 📖 BAGIAN 11: MANUAL BOOK — PANDUAN PENGGUNA

### 11.1 Cara Menggunakan Chatbot

Buka aplikasi, di kotak teks bagian bawah ketik prompt alami:

- "Bang, hitung harga meja sekolah bahan jati ukuran panjang 100 lebar 50 tinggi 80"
- "Lemari baju premium 2mx1mx2m"
- "Berapa modal kursi baso kecil kayu mahoni 30x30x40"
- "Tolong estimasi HPP rak tv jati belanda 150x40x50"
- "Hitungkan nakas tempat tidur standar p40 l40 t60"

**Cara Membaca Kartu Hasil:**

- **Box Atas:** Menunjukkan interpretasi AI terhadap ukuran dan kualitas Anda.
- **HPP Estimasi (Fuzzy):** Hasil kalkulasi algoritma murni kita.
- **HPP Aktual:** (Opsional) Jika sistem menemukan barang sejenis di database referensi, nilai asli pabrik akan dimunculkan sebagai pembanding.

### 11.2 Cara Upload Data Produk

- Buka tautan tersembunyi `upload.html` di server Anda.
- Siapkan file `.csv` dari Excel. Kolom wajib: `nama_produk`, `panjang`, `lebar`, `tinggi`, `bahan`, `hpp_aktual`.
- Seret (drag) file tersebut ke kotak upload di website, data akan masuk database secara massal.
- Untuk data khusus tabel skripsi Bab 4, gunakan `upload_uji.html`.

### 11.3 Panduan Rekap Pengujian Bab 4

- **Metode Auto-Test (Sangat Disarankan):** Di aplikasi chat utama, buka sidebar, klik tombol "Mulai Auto-Test 50 Data". Sistem akan running otomatis selama beberapa detik/menit. Tabel akan penuh terisi dan sudah menghitung MAPE.
- **Metode Manual:** Chat bot manual satu-satu dengan contoh data uji, lalu pada setiap kartu hasil klik "Simpan ke Rekap".
- Setelah tabel lengkap, scroll ke paling bawah tabel, block/drag dan copy-paste langsung ke Microsoft Word (atau di-screenshot) untuk lampiran Skripsi.

---

## 📊 BAGIAN 12: PENJELASAN MAPE DAN ANALISIS HASIL

### 12.1 Rumus MAPE

Mean Absolute Percentage Error adalah persentase simpangan error absolut.

```
MAPE = ( | Aktual - Prediksi | / Aktual ) * 100%
```

Sistem sudah menghitung ini secara otomatis dan ditaruh di tabel.

### 12.2 Tabel Interpretasi Lewis (1982)

- **0% - 10%:** Tingkat akurasi pemodelan sangat baik (*Highly Accurate*).
- **11% - 20%:** Tingkat akurasi baik (*Good/Reasonable*).
- **21% - 50%:** Akurasi wajar/cukup.
- **> 50%:** Tidak akurat (*Inaccurate*).

### 12.3 Contoh Analisis untuk Bab 4 Skripsi

*Bisa di-copy-paste dan dimodifikasi untuk bab 4 Anda:*

> Berdasarkan pengujian 50 data produk sampel menggunakan metode Blackbox dan perhitungan akurasi sistem, didapatkan rata-rata kumulatif MAPE sebesar 12.4%. Merujuk pada skala akurasi peramalan Lewis, nilai ini jatuh pada rentang 11-20% yang berarti "Tingkat Akurasi Baik".
>
> Analisis lebih mendalam menunjukkan bahwa penyimpangan terbesar (error MAPE > 20%) terjadi mayoritas pada himpunan Kualitas Premium untuk ukuran Besar. Hal ini wajar terjadi karena di dalam algoritma *Rule Base* sistem, nilai batas maksimum HPP Tinggi disetel pada titik statis Rp 6.000.000. Sementara, harga aktual di lapangan untuk mebel kayu jati kelas satu berdimensi masif dapat berfluktuasi bebas hingga belasan juta tanpa batas atas yang pasti (efek *ceiling* pada kurva fungsi keanggotaan linier naik).
>
> Secara keseluruhan, arsitektur Fuzzy Tsukamoto yang dibantu NLP dari Gemini AI terbukti andal dalam memperkirakan Harga Pokok Produksi secara cepat dan semi-otomatis dengan nilai kesalahan yang masih dapat ditoleransi oleh industri UMKM mebel.

---

## 🛠️ BAGIAN 13: TROUBLESHOOTING

Berikut 8 masalah umum dan solusinya:

1. **Error: CORS Policy block saat membuka HTML lokal**

   - *Solusi:* Jangan buka HTML dengan double-click (alamat URL jadi file://). Gunakan terminal `npx serve .` atau ekstensi VS Code Live Server.
2. **Repository GitHub Not Found di Netlify**

   - *Solusi:* Netlify belum punya izin. Buka Profil GitHub -> Settings -> Applications -> Netlify. Berikan akses ke repo Anda, lalu ulangi di Netlify.
3. **Teks Rusak (Simbol Ã— muncul di tampilan web)**

   - *Solusi:* File HTML/JS Anda tersimpan dengan encoding ANSI. Buka di VS Code, klik teks di pojok kanan bawah, ubah jadi "Save with Encoding -> UTF-8". Pastikan `<meta charset="UTF-8">` ada di `<head>`.
4. **Error Gemini: 400 Bad Request atau API Key Invalid**

   - *Solusi:* Cek file `app.js` (jika lokal) apakah API Key Anda benar. Jika di Netlify, cek tab *Site configuration > Environment variables* dan pastikan nama Key huruf besar semua `GEMINI_API_KEY`.
5. **Error Firebase: Missing or insufficient permissions.**

   - *Solusi:* Buka Firebase Console -> Firestore -> Rules. Pastikan berbunyi `allow read, write: if true;` dan HAPUS baris timestamp expired yang mungkin ada dari bawaan Firebase test-mode.
6. **Error 404 Function Not Found di Netlify**

   - *Solusi:* Pastikan folder `netlify` yang di dalamnya ada `functions` dan `gemini.js` berada di *root* direktori GitHub Anda, tidak masuk ke dalam folder lain lagi. Pastikan file `netlify.toml` ditulis dengan ekstensi yang benar, bukan `.toml.txt`.
7. **Database Kosong / Produk aktual tidak ditemukan (HPP Aktual Rp 0)**

   - *Solusi:* Koleksi `produk_referensi` masih kosong atau salah huruf besar/kecil. Buka halaman `upload.html` untuk memompa data awal referensi.
8. **Kartu UI Pecah atau Warna Tidak Berubah (CSS Cached)**

   - *Solusi:* Browser menyimpan cache CSS lama. Lakukan Hard Reload (CTRL+F5 atau CTRL+SHIFT+R pada browser) untuk memuat ulang `style.css` terbaru.

---

*Selesai. Selamat mengerjakan sistem Skripsi Anda!* 🚀
