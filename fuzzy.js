// =============================================================================
// FILE: fuzzy.js
// DESKRIPSI: File ini KHUSUS berisi semua logika matematika Fuzzy Tsukamoto.
//            Dipisahkan dari app.js agar kode lebih rapi, mudah dibaca,
//            dan mudah diuji secara mandiri (prinsip "Separation of Concerns").
// REFERENSI: Algoritma Fuzzy Tsukamoto - Kusumadewi & Purnomo (2004)
// =============================================================================


// =============================================================================
// KONFIGURASI BATAS (BOUNDARIES) HIMPUNAN FUZZY
// Diperbarui berdasarkan distribusi data riil dari dataset mebel Jepara
// =============================================================================

// Batas Volume (cm³)
const VOL_KECIL_BWH = 100000;    // <= 100k dipastikan Kecil (1)
const VOL_KECIL_ATS = 1000000;   // > 1M dipastikan bukan Kecil (0)

const VOL_SDG_BWH = 500000;      // Titik awal himpunan Sedang
const VOL_SDG_PUNCAK = 1500000;  // Titik puncak (1) himpunan Sedang
const VOL_SDG_ATS = 3000000;     // Titik akhir himpunan Sedang

const VOL_BSR_BWH = 2000000;     // Titik awal himpunan Besar
const VOL_BSR_ATS = 5000000;     // >= 5M dipastikan Besar (1)

// Batas Harga HPP (Rupiah)
const HPP_RNDH_BWH = 25000;      // HPP Minimal (Bawah)
const HPP_RNDH_ATS = 2500000;    // Batas atas HPP Rendah

const HPP_SDG_BWH = 500000;      // Batas bawah HPP Sedang (Diturunkan agar transisi lebih mulus)
const HPP_SDG_PUNCAK = 4000000;  // Puncak HPP Sedang
const HPP_SDG_ATS = 6000000;     // Batas atas HPP Sedang

const HPP_TGG_BWH = 3000000;     // Batas bawah HPP Tinggi (Lebih rendah agar mencakup barang mewah ukuran sedang)
const HPP_TGG_ATS = 6000000;    // DIKALIBRASI: Berdasarkan data, harga maksimal meja jepara sekitar 5-6 juta, bukan 15 juta.

// =============================================================================
// BAGIAN 1: FUNGSI KEANGGOTAAN (MEMBERSHIP FUNCTIONS) - INPUT: VOLUME
// =============================================================================

function mfVolumeKecil(volume) {
    if (volume <= VOL_KECIL_BWH) return 1;
    if (volume >= VOL_KECIL_ATS) return 0;
    return (VOL_KECIL_ATS - volume) / (VOL_KECIL_ATS - VOL_KECIL_BWH);
}

function mfVolumeSedang(volume) {
    if (volume >= VOL_SDG_BWH && volume <= VOL_SDG_PUNCAK) {
        return (volume - VOL_SDG_BWH) / (VOL_SDG_PUNCAK - VOL_SDG_BWH);
    }
    if (volume > VOL_SDG_PUNCAK && volume <= VOL_SDG_ATS) {
        return (VOL_SDG_ATS - volume) / (VOL_SDG_ATS - VOL_SDG_PUNCAK);
    }
    return 0;
}

function mfVolumeBesar(volume) {
    if (volume <= VOL_BSR_BWH) return 0;
    if (volume >= VOL_BSR_ATS) return 1;
    return (volume - VOL_BSR_BWH) / (VOL_BSR_ATS - VOL_BSR_BWH);
}


// =============================================================================
// BAGIAN 2: FUNGSI INVERS OUTPUT (INVERSE MEMBERSHIP FUNCTIONS) - OUTPUT: HPP
// =============================================================================

function inversHPPRendah(alpha) {
    // mu(z) = (max - z) / (max - min) --> z = max - alpha * (max - min)
    return HPP_RNDH_ATS - (alpha * (HPP_RNDH_ATS - HPP_RNDH_BWH));
}

function inversHPPSedang(alpha) {
    // Sisi Kiri: z = min + alpha * (puncak - min)
    const zKiri  = HPP_SDG_BWH + (alpha * (HPP_SDG_PUNCAK - HPP_SDG_BWH));
    // Sisi Kanan: z = max - alpha * (max - puncak)
    const zKanan = HPP_SDG_ATS - (alpha * (HPP_SDG_ATS - HPP_SDG_PUNCAK));
    return (zKiri + zKanan) / 2;
}

function inversHPPTinggi(alpha) {
    // mu(z) = (z - min) / (max - min) --> z = min + alpha * (max - min)
    return HPP_TGG_BWH + (alpha * (HPP_TGG_ATS - HPP_TGG_BWH));
}


// =============================================================================
// BAGIAN 3: FUNGSI UTAMA FUZZY TSUKAMOTO
// =============================================================================

/**
 * Menjalankan SELURUH proses Fuzzy Tsukamoto.
 * Langkah: Fuzzifikasi -> Evaluasi Aturan -> Invers Output -> Defuzzifikasi
 *
 * @param {number} panjang - Panjang mebel dalam cm.
 * @param {number} lebar   - Lebar mebel dalam cm.
 * @param {number} tinggi  - Tinggi mebel dalam cm.
 * @param {string} kualitas_bahan - "Standar", "Menengah", atau "Premium".
 * @returns {object} Objek berisi HPP final dan detail setiap langkah perhitungan.
 */
function hitungFuzzyTsukamoto(panjang, lebar, tinggi, kualitas_bahan) {

    // --- LANGKAH 1: HITUNG VOLUME ---
    const volume = panjang * lebar * tinggi;

    // --- LANGKAH 2: FUZZIFIKASI INPUT VOLUME ---
    // Mengubah nilai crisp volume menjadi derajat keanggotaan (0-1)
    const muKecil  = mfVolumeKecil(volume);
    const muSedang = mfVolumeSedang(volume);
    const muBesar  = mfVolumeBesar(volume);

    // --- LANGKAH 3 & 4: EVALUASI RULE BASE ---
    // Evaluasi semua 9 aturan sekaligus dalam satu array aturan.
    // Hanya aturan yang bahan-nya cocok yang akan memiliki alpha > 0.
    // Operator AND diimplementasikan dengan MIN antara mu_volume dan mu_bahan.
    // Karena bahan kategorik: mu_bahan = 1 jika cocok, 0 jika tidak.
    // Sehingga: alpha = min(mu_volume, 1) = mu_volume jika cocok; atau min(mu_volume, 0) = 0.
    const semuaAturan = [
        // [R1] IF Volume Kecil AND Bahan Standar THEN HPP Rendah
        { kode:"R1", alpha: kualitas_bahan==="Standar"   ? muKecil  : 0, output:"rendah" },
        // [R2] IF Volume Kecil AND Bahan Menengah THEN HPP Rendah
        { kode:"R2", alpha: kualitas_bahan==="Menengah"  ? muKecil  : 0, output:"rendah" },
        // [R3] IF Volume Kecil AND Bahan Premium THEN HPP Sedang
        { kode:"R3", alpha: kualitas_bahan==="Premium"   ? muKecil  : 0, output:"sedang" },
        // [R4] IF Volume Sedang AND Bahan Standar THEN HPP Sedang
        { kode:"R4", alpha: kualitas_bahan==="Standar"   ? muSedang : 0, output:"sedang" },
        // [R5] IF Volume Sedang AND Bahan Menengah THEN HPP Sedang
        { kode:"R5", alpha: kualitas_bahan==="Menengah"  ? muSedang : 0, output:"sedang" },
        // [R6] IF Volume Sedang AND Bahan Premium THEN HPP Tinggi
        { kode:"R6", alpha: kualitas_bahan==="Premium"   ? muSedang : 0, output:"tinggi" },
        // [R7] IF Volume Besar AND Bahan Standar THEN HPP Sedang
        { kode:"R7", alpha: kualitas_bahan==="Standar"   ? muBesar  : 0, output:"sedang" },
        // [R8] IF Volume Besar AND Bahan Menengah THEN HPP Tinggi
        { kode:"R8", alpha: kualitas_bahan==="Menengah"  ? muBesar  : 0, output:"tinggi" },
        // [R9] IF Volume Besar AND Bahan Premium THEN HPP Tinggi
        { kode:"R9", alpha: kualitas_bahan==="Premium"   ? muBesar  : 0, output:"tinggi" },
    ];

    // --- LANGKAH 5: HITUNG NILAI CRISP z UNTUK SETIAP ATURAN AKTIF ---
    let totalAlpha  = 0;
    let totalAlphaZ = 0;
    const detailRules = [];

    semuaAturan.forEach(rule => {
        let z = 0;
        let aktif = rule.alpha > 0;

        if (aktif) {
            // Panggil fungsi invers yang sesuai untuk mendapatkan nilai z crisp
            if (rule.output === "rendah") z = inversHPPRendah(rule.alpha);
            if (rule.output === "sedang") z = inversHPPSedang(rule.alpha);
            if (rule.output === "tinggi") z = inversHPPTinggi(rule.alpha);

            // Akumulasi untuk rumus Weighted Average
            totalAlpha  += rule.alpha;
            totalAlphaZ += rule.alpha * z;
        }

        // Simpan detail setiap aturan untuk ditampilkan di UI
        detailRules.push({
            kode:       rule.kode,
            alpha:      rule.alpha.toFixed(4),
            z:          Math.round(z),
            output:     rule.output,
            aktif:      aktif
        });
    });

    // --- LANGKAH 6: DEFUZZIFIKASI (Weighted Average Tsukamoto) ---
    // Rumus: Z* = Sigma(alpha_i * z_i) / Sigma(alpha_i)
    // Hindari pembagian dengan nol jika semua aturan tidak aktif
    const hpp = totalAlpha > 0 ? (totalAlphaZ / totalAlpha) : 0;

    // --- LANGKAH 7: KEMBALIKAN HASIL LENGKAP ---
    return {
        input: { panjang, lebar, tinggi, volume: Math.round(volume), kualitas_bahan },
        fuzzifikasi: {
            muKecil:  muKecil.toFixed(4),
            muSedang: muSedang.toFixed(4),
            muBesar:  muBesar.toFixed(4)
        },
        detailRules,
        totalAlpha:  totalAlpha.toFixed(4),
        totalAlphaZ: Math.round(totalAlphaZ),
        hpp:         Math.round(hpp)
    };
}
