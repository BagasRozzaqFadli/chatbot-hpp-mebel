// =============================================================================
// FILE: netlify/functions/gemini.js
// DESKRIPSI: Serverless Function milik Netlify.
//
// MENGAPA ADA FILE INI?
// API Key Gemini TIDAK BOLEH ditaruh di kode JavaScript yang dibuka di browser
// (app.js), karena siapa pun bisa melihatnya lewat DevTools dan menyalahgunakannya.
//
// File ini berjalan di SERVER NETLIFY (bukan di browser pengguna).
// app.js memanggil /.netlify/functions/gemini → file ini yang meneruskan
// request ke Google Gemini API menggunakan API Key dari Environment Variable.
// Dengan cara ini, API Key TIDAK PERNAH terlihat oleh pengguna.
// =============================================================================

exports.handler = async function (event, context) {

    // Hanya izinkan metode POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    // Ambil API Key dari Environment Variable Netlify (AMAN - tidak terlihat publik)
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'GEMINI_API_KEY belum dikonfigurasi di Environment Variables Netlify.' })
        };
    }

    const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest';
    const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    try {
        // Ambil body request dari app.js (berisi system prompt & pesan user)
        const requestBody = JSON.parse(event.body);

        // Teruskan request ke Google Gemini API
        const response = await fetch(GEMINI_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        // Kembalikan respons dari Gemini ke browser pengguna
        return {
            statusCode: response.status,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(data)
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Gagal menghubungi Gemini API: ' + error.message })
        };
    }
};
