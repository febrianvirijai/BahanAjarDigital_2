# Bahan Ajar Digital Elektrokoagulasi STEM-ESD — Panduan Penerbitan

Folder ini sudah siap diunggah ke **Vercel** apa adanya. Tidak ada proses *build*, tidak perlu Node.js, tidak perlu Next.js — seluruhnya situs statis yang memanggil **Supabase** langsung dari peramban.

---

## Langkah 1 — Siapkan Supabase

1. Buat proyek baru di [supabase.com](https://supabase.com) (paket gratis memadai).
2. Buka **SQL Editor → New query**, tempelkan seluruh isi `supabase-schema.sql`, lalu **Run**.
   Skrip ini membuat tiga tabel dan aman dijalankan berulang:
   - `ecbook_students` — data & jawaban mahasiswa (kunci utama `nim`)
   - `ecbook_dosen` — akun dosen (kunci utama `uname`)
   - `ecbook_meta` — status buka/tutup Pretest, Posttest, dan tiap pertemuan
3. Buka **Project Settings → API**, salin dua nilai:
   - **Project URL** (mis. `https://abcdefgh.supabase.co`)
   - **anon public key** (kunci panjang berawalan `eyJ...`)

## Langkah 2 — Isi kredensial

Buka `supabase-config.js`, ubah **dua baris pertama**:

```js
window.ECBOOK_SUPABASE_URL = 'https://abcdefgh.supabase.co';   // Project URL Anda
window.ECBOOK_SUPABASE_ANON_KEY = 'eyJhbGciOi...';             // anon public key Anda
```

Selama kedua baris ini masih berisi `YOUR-PROJECT` / `YOUR-ANON-PUBLIC-KEY`, aplikasi tetap
berjalan namun data **hanya tersimpan di peramban masing-masing** (mode luring), sehingga dosen
tidak dapat memantau pekerjaan mahasiswa dari perangkat lain.

## Langkah 3 — Ganti kode registrasi dosen

Kode bawaannya `dosen2024`. Ganti di **seluruh 12 berkas HTML** agar tidak sembarang orang dapat
mendaftar sebagai dosen. Cari dan ganti:

```
this.DOSEN_SECRET = 'dosen2024'
```

## Langkah 4 — Unggah ke Vercel

**Cara termudah (tanpa Git):**
1. Buka [vercel.com/new](https://vercel.com/new) → **Deploy** → pilih *Browse* / seret folder ini.
2. Biarkan Framework Preset = **Other**, Build Command dan Output Directory **kosong**.
3. Klik **Deploy**.

**Lewat CLI:**
```bash
cd deploy
npx vercel --prod
```

**Lewat GitHub:** unggah isi folder ini ke repositori, lalu impor di Vercel dengan
*Root Directory* = folder tempat `index.html` berada.

---

## Isi folder

| Berkas | Keterangan |
|---|---|
| `index.html` | Sampul, kata pengantar, panduan, alur, daftar simbol, SOP keselamatan |
| `bab-1.html` … `bab-8.html` | Delapan pertemuan |
| `pretest.html`, `posttest.html` | Instrumen CPSS (7 esai), PCK (5 esai), EA (30 angket + 3 esai terbuka) |
| `lampiran.html` | Glosarium, kunci, daftar pustaka |
| `support.js` | Runtime penyaji halaman |
| `supabase-config.js` | **Kredensial & seluruh panggilan database** |
| `supabase-schema.sql` | Skrip pembuat tabel |
| `vercel.json` | Konfigurasi penerbitan |
| `assets/` | Gambar bab dan foto soal |

## Catatan keamanan

- `anon public key` memang terlihat oleh siapa pun yang membuka halaman — itu wajar dan sesuai
  rancangan Supabase. Yang **tidak boleh** dipasang di sini adalah `service_role key`.
- Kata sandi disimpan sebagai *hash* SHA-256, bukan teks terbuka, sehingga tidak dapat dibaca
  siapa pun termasuk dosen. Bila mahasiswa lupa, dosen menyetel ulang dari tab **Akun**.
- Kebijakan RLS pada skema mengizinkan baca-tulis melalui anon key. Ini memadai untuk kebutuhan
  kelas, namun bukan autentikasi tingkat produksi — jangan menyimpan data pribadi sensitif.

## Memeriksa sambungan

Setelah terbit, buka salah satu halaman → tekan **F12** → tab **Console** → jalankan:

```js
EcbookCloud.selfTest()
```

Hasil `true` berarti baca-tulis ke Supabase berhasil. Bila gagal, pesan galat akan menyebutkan
kode HTTP dan penyebabnya (kredensial salah, tabel belum dibuat, atau RLS belum diterapkan).
