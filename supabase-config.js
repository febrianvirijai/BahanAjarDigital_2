// ============================================================================
// Konfigurasi Supabase untuk Bahan Ajar Digital Elektrokoagulasi STEM-ESD
// ============================================================================
// 1. Buat project baru di https://supabase.com (gratis).
// 2. Buka SQL Editor project Anda, jalankan skrip di "supabase-schema.sql"
//    (ada di folder yang sama) untuk membuat tabel & kebijakan akses.
// 3. Buka Project Settings -> API, salin "Project URL" dan "anon public key"
//    ke dua baris di bawah ini.
// 4. Deploy folder ini ke Vercel (situs statis biasa, tidak perlu server
//    tambahan -- semua panggilan database terjadi langsung dari browser).
//
// CATATAN KEAMANAN: anon key ini publik/terlihat oleh siapa pun yang membuka
// halaman. Kebijakan akses (RLS) pada skema yang disediakan mengizinkan
// baca/tulis terbuka pada tabel jawaban mahasiswa -- cukup untuk kebutuhan
// kelas, tapi JANGAN simpan data sensitif (nama asli tanpa izin, dsb.) tanpa
// mempertimbangkan hal ini.
// ============================================================================

window.ECBOOK_SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co'; // <-- ganti
window.ECBOOK_SUPABASE_ANON_KEY = 'YOUR-ANON-PUBLIC-KEY'; // <-- ganti

window.EcbookCloud = (function () {
  function baseUrl() {
    return (window.ECBOOK_SUPABASE_URL || '').trim().replace(/\/+$/, '');
  }
  function ready() {
    const url = baseUrl();
    const key = (window.ECBOOK_SUPABASE_ANON_KEY || '').trim();
    return !!(url && key && url.indexOf('YOUR-PROJECT') === -1 && key.indexOf('YOUR-ANON') === -1);
  }
  function headers(extra) {
    return Object.assign(
      {
        apikey: (window.ECBOOK_SUPABASE_ANON_KEY || '').trim(),
        Authorization: 'Bearer ' + (window.ECBOOK_SUPABASE_ANON_KEY || '').trim(),
        'Content-Type': 'application/json',
      },
      extra || {}
    );
  }
  async function logIfError(res, label) {
    if (!res.ok) {
      let body = '';
      try { body = await res.text(); } catch (e) {}
      console.error('[EcbookCloud] ' + label + ' failed: HTTP ' + res.status + ' ' + res.statusText + ' -- ' + body);
    }
    return res;
  }
  if (!ready()) {
    console.warn('%c[EcbookCloud] MODE LURING%c\nKredensial Supabase belum diisi, sehingga data hanya tersimpan di peramban ini dan dosen tidak dapat memantau dari perangkat lain.\n\nLangkah: buka supabase-config.js, isi ECBOOK_SUPABASE_URL dan ECBOOK_SUPABASE_ANON_KEY dari Supabase (Project Settings > API), jalankan supabase-schema.sql di SQL Editor, lalu terbitkan ulang ke Vercel.\nRincian lengkap ada di README.md.', 'font-weight:bold;color:#c47f22', 'color:inherit');
  } else {
    console.log('[EcbookCloud] Terhubung ke', baseUrl());
  }

  // ---- data mahasiswa (per NIM) ----
  async function pull(nim) {
    if (!ready()) return null;
    try {
      const res = await fetch(
        baseUrl() + '/rest/v1/ecbook_students?nim=eq.' + encodeURIComponent(nim) + '&select=record',
        { headers: headers() }
      );
      await logIfError(res, 'pull(' + nim + ')');
      if (!res.ok) return null;
      const rows = await res.json();
      return rows && rows[0] ? rows[0].record : null;
    } catch (e) {
      console.error('[EcbookCloud] pull(' + nim + ') exception:', e);
      return null;
    }
  }

  async function push(nim, record, keepalive) {
    if (!ready()) return false;
    const body = JSON.stringify([
      {
        nim,
        name: record.name || null,
        kelas: record.kelas || null,
        record,
        updated_at: new Date().toISOString(),
      },
    ]);
    try {
      const res = await fetch(baseUrl() + '/rest/v1/ecbook_students', {
        method: 'POST',
        headers: headers({ Prefer: 'resolution=merge-duplicates' }),
        body,
        keepalive: !!keepalive,
      });
      await logIfError(res, 'push(' + nim + ')');
      return res.ok;
    } catch (e) {
      console.error('[EcbookCloud] push(' + nim + ') exception:', e);
      return false;
    }
  }

  async function pullAll() {
    if (!ready()) return {};
    try {
      const res = await fetch(baseUrl() + '/rest/v1/ecbook_students?select=nim,record', {
        headers: headers(),
      });
      await logIfError(res, 'pullAll()');
      if (!res.ok) return {};
      const rows = await res.json();
      const db = {};
      (rows || []).forEach((r) => {
        db[r.nim] = r.record;
      });
      return db;
    } catch (e) {
      console.error('[EcbookCloud] pullAll() exception:', e);
      return {};
    }
  }

  async function deleteOne(nim) {
    if (!ready()) return false;
    try {
      const res = await fetch(
        baseUrl() + '/rest/v1/ecbook_students?nim=eq.' + encodeURIComponent(nim),
        { method: 'DELETE', headers: headers() }
      );
      await logIfError(res, 'deleteOne(' + nim + ')');
      return res.ok;
    } catch (e) {
      console.error('[EcbookCloud] deleteOne(' + nim + ') exception:', e);
      return false;
    }
  }

  async function deleteAll() {
    if (!ready()) return false;
    try {
      const res = await fetch(baseUrl() + '/rest/v1/ecbook_students?nim=not.is.null', {
        method: 'DELETE',
        headers: headers(),
      });
      await logIfError(res, 'deleteAll()');
      return res.ok;
    } catch (e) {
      console.error('[EcbookCloud] deleteAll() exception:', e);
      return false;
    }
  }

  // ---- gate pretest/posttest (satu baris global) ----
  async function pullGates() {
    if (!ready()) return null;
    try {
      const res = await fetch(baseUrl() + '/rest/v1/ecbook_meta?key=eq.gates&select=value', {
        headers: headers(),
      });
      await logIfError(res, 'pullGates()');
      if (!res.ok) return null;
      const rows = await res.json();
      return rows && rows[0] ? rows[0].value : null;
    } catch (e) {
      console.error('[EcbookCloud] pullGates() exception:', e);
      return null;
    }
  }

  async function pushGates(gates) {
    if (!ready()) return false;
    const body = JSON.stringify([{ key: 'gates', value: gates }]);
    try {
      const res = await fetch(baseUrl() + '/rest/v1/ecbook_meta', {
        method: 'POST',
        headers: headers({ Prefer: 'resolution=merge-duplicates' }),
        body,
      });
      await logIfError(res, 'pushGates()');
      return res.ok;
    } catch (e) {
      console.error('[EcbookCloud] pushGates() exception:', e);
      return false;
    }
  }

  // Uji koneksi cepat -- panggil dari console browser: EcbookCloud.selfTest()
  async function selfTest() {
    console.log('[EcbookCloud] selfTest() -- ready:', ready(), 'url:', baseUrl());
    if (!ready()) { console.warn('[EcbookCloud] Kredensial belum diisi. Lihat README.md langkah 2.'); return false; }
    // periksa ketiga tabel dapat diakses
    for (const t of ['ecbook_students', 'ecbook_dosen', 'ecbook_meta']) {
      try {
        const r = await fetch(baseUrl() + '/rest/v1/' + t + '?select=*&limit=1', { headers: headers() });
        if (!r.ok) {
          let d = ''; try { d = (await r.json()).message || ''; } catch (e) {}
          console.error('[EcbookCloud] Tabel "' + t + '" tidak dapat diakses (HTTP ' + r.status + ')' + (d ? ': ' + d : '') + '. Jalankan supabase-schema.sql di SQL Editor.');
          return false;
        }
        console.log('[EcbookCloud] tabel ' + t + ': OK');
      } catch (e) { console.error('[EcbookCloud] Tidak dapat menghubungi server saat memeriksa ' + t); return false; }
    }
    const testNim = '__selftest__';
    const ok1 = await push(testNim, { name: 'Self Test', updated: Date.now() });
    console.log('[EcbookCloud] selfTest push:', ok1);
    const rec = await pull(testNim);
    console.log('[EcbookCloud] selfTest pull:', rec);
    if (ok1 && rec) await deleteOne(testNim);
    return !!(ok1 && rec);
  }


  // ================= AUTENTIKASI (tabel akun, tanpa email) =================

  // ---- utilitas kata sandi (SHA-256, tanpa email) ----
  async function hashPass(pass) {
    const enc = new TextEncoder().encode('ecbook:' + pass);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  function normName(name) {
    return (name || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }
  const SESSION_KEY = 'ecbook:session';

  // ---- akun MAHASISWA (kunci: NIM) ----
  async function mhsSignUp(nim, name, kelas, pass) {
    if (!ready()) return { ok: false, error: 'Server belum tersambung. Pendaftaran dibatalkan.' };
    const DUP = 'NIM <b>' + nim + '</b> sudah terdaftar. Satu NIM hanya dapat didaftarkan sekali &mdash; silakan pilih <b>Masuk</b>, atau minta dosen menyetel ulang kata sandi Anda.';
    try {
      const ph = await hashPass(pass);
      // periksa lebih dahulu: baris mungkin sudah ada dari sinkronisasi rekaman (tanpa kata sandi)
      const cek = await fetch(baseUrl() + '/rest/v1/ecbook_students?nim=eq.' + encodeURIComponent(nim) + '&select=nim,password_hash', { headers: headers() });
      if (!cek.ok) return { ok: false, error: 'Tidak dapat memeriksa data NIM (HTTP ' + cek.status + '). Coba lagi.' };
      const rows = await cek.json();
      const ada = rows && rows[0];
      if (ada && ada.password_hash) return { ok: false, error: DUP };

      let res, mode;
      if (ada) {
        // baris rekaman sudah ada tetapi belum punya akun -> lengkapi, jangan buat baris kedua
        mode = 'PATCH';
        res = await fetch(baseUrl() + '/rest/v1/ecbook_students?nim=eq.' + encodeURIComponent(nim) + '&password_hash=is.null', {
          method: 'PATCH',
          headers: headers({ Prefer: 'return=representation' }),
          body: JSON.stringify({ name: name, kelas: kelas || null, password_hash: ph, registered_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        });
      } else {
        // INSERT ketat: tanpa merge-duplicates, sehingga kunci utama menolak NIM ganda
        mode = 'INSERT';
        res = await fetch(baseUrl() + '/rest/v1/ecbook_students', {
          method: 'POST',
          headers: headers({ Prefer: 'return=representation' }),
          body: JSON.stringify([{ nim: nim, name: name, kelas: kelas || null, password_hash: ph, record: {}, updated_at: new Date().toISOString() }])
        });
      }
      if (res.status === 409) return { ok: false, error: DUP };
      await logIfError(res, 'mhsSignUp/' + mode);
      if (!res.ok) {
        let d = ''; try { d = (await res.json()).message || ''; } catch (e) {}
        return { ok: false, error: 'Pendaftaran gagal disimpan ke database (HTTP ' + res.status + ')' + (d ? ': ' + d : '') + '. Data Anda belum tersimpan.' };
      }
      // pastikan baris benar-benar tertulis
      let saved = null;
      try { const j = await res.json(); saved = Array.isArray(j) ? j[0] : j; } catch (e) {}
      if (!saved || !saved.nim) {
        const ulang = await fetch(baseUrl() + '/rest/v1/ecbook_students?nim=eq.' + encodeURIComponent(nim) + '&select=nim,password_hash', { headers: headers() });
        const r2 = ulang.ok ? await ulang.json() : [];
        if (!(r2 && r2[0] && r2[0].password_hash)) return { ok: false, error: 'Database tidak mengonfirmasi penyimpanan. Coba daftar ulang.' };
      }
      return { ok: true, user: { nim: nim, name: name, kelas: kelas || '' } };
    } catch (e) { return { ok: false, error: 'Tidak dapat menghubungi server. Pendaftaran dibatalkan.' }; }
  }

  async function mhsSignIn(nim, pass) {
    if (!ready()) return { ok: false, error: 'Server belum tersambung.' };
    try {
      const res = await fetch(baseUrl() + '/rest/v1/ecbook_students?nim=eq.' + encodeURIComponent(nim) + '&select=nim,name,kelas,password_hash', { headers: headers() });
      if (!res.ok) return { ok: false, error: 'Tidak dapat menghubungi server.' };
      const rows = await res.json();
      const r = rows && rows[0];
      if (!r || !r.password_hash) return { ok: false, error: 'NIM belum terdaftar. Silakan pilih <b>Daftar Baru</b>.' };
      const ph = await hashPass(pass);
      if (ph !== r.password_hash) return { ok: false, error: 'Kata sandi salah.' };
      return { ok: true, user: { nim: r.nim, name: r.name || nim, kelas: r.kelas || '' } };
    } catch (e) { return { ok: false, error: 'Tidak dapat menghubungi server.' }; }
  }

  async function mhsSetPass(nim, pass) {
    if (!ready()) return { ok: false, error: 'Server belum tersambung.' };
    try {
      const ph = await hashPass(pass);
      const res = await fetch(baseUrl() + '/rest/v1/ecbook_students?nim=eq.' + encodeURIComponent(nim), {
        method: 'PATCH', headers: headers(), body: JSON.stringify({ password_hash: ph })
      });
      await logIfError(res, 'mhsSetPass');
      return res.ok ? { ok: true } : { ok: false, error: 'Gagal memperbarui kata sandi.' };
    } catch (e) { return { ok: false, error: 'Tidak dapat menghubungi server.' }; }
  }

  // ---- akun DOSEN (kunci: nama dinormalkan) ----
  async function dosenSignUp(name, pass) {
    if (!ready()) return { ok: false, error: 'Server belum tersambung. Pendaftaran dibatalkan.' };
    const uname = normName(name);
    const DUP = 'Nama dosen <b>' + name.trim() + '</b> sudah terdaftar. Silakan pilih <b>Masuk</b>.';
    try {
      const cek = await fetch(baseUrl() + '/rest/v1/ecbook_dosen?uname=eq.' + encodeURIComponent(uname) + '&select=uname', { headers: headers() });
      if (!cek.ok) return { ok: false, error: 'Tidak dapat memeriksa data dosen (HTTP ' + cek.status + '). Coba lagi.' };
      const rows = await cek.json();
      if (rows && rows[0]) return { ok: false, error: DUP };
      const ph = await hashPass(pass);
      // INSERT ketat: kunci utama uname menolak nama ganda
      const res = await fetch(baseUrl() + '/rest/v1/ecbook_dosen', {
        method: 'POST', headers: headers({ Prefer: 'return=representation' }),
        body: JSON.stringify([{ uname: uname, name: name.trim(), password_hash: ph, last_login: new Date().toISOString() }])
      });
      if (res.status === 409) return { ok: false, error: DUP };
      await logIfError(res, 'dosenSignUp');
      if (!res.ok) {
        let d = ''; try { d = (await res.json()).message || ''; } catch (e) {}
        return { ok: false, error: 'Pendaftaran gagal disimpan ke database (HTTP ' + res.status + ')' + (d ? ': ' + d : '') + '.' };
      }
      let saved = null;
      try { const j = await res.json(); saved = Array.isArray(j) ? j[0] : j; } catch (e) {}
      if (!saved || !saved.uname) {
        const ulang = await fetch(baseUrl() + '/rest/v1/ecbook_dosen?uname=eq.' + encodeURIComponent(uname) + '&select=uname', { headers: headers() });
        const r2 = ulang.ok ? await ulang.json() : [];
        if (!(r2 && r2[0])) return { ok: false, error: 'Database tidak mengonfirmasi penyimpanan. Coba daftar ulang.' };
      }
      return { ok: true, user: { name: name.trim(), uname: uname } };
    } catch (e) { return { ok: false, error: 'Tidak dapat menghubungi server. Pendaftaran dibatalkan.' }; }
  }

  async function dosenSignIn(name, pass) {
    if (!ready()) return { ok: false, error: 'Server belum tersambung.' };
    const uname = normName(name);
    try {
      const res = await fetch(baseUrl() + '/rest/v1/ecbook_dosen?uname=eq.' + encodeURIComponent(uname) + '&select=uname,name,password_hash', { headers: headers() });
      if (!res.ok) return { ok: false, error: 'Tidak dapat menghubungi server.' };
      const rows = await res.json();
      const r = rows && rows[0];
      if (!r) return { ok: false, error: 'Nama dosen belum terdaftar. Silakan pilih <b>Daftar Baru</b>.' };
      const ph = await hashPass(pass);
      if (ph !== r.password_hash) return { ok: false, error: 'Kata sandi salah.' };
      fetch(baseUrl() + '/rest/v1/ecbook_dosen?uname=eq.' + encodeURIComponent(uname), {
        method: 'PATCH', headers: headers(), body: JSON.stringify({ last_login: new Date().toISOString() })
      }).catch(() => {});
      return { ok: true, user: { name: r.name || name.trim(), uname: r.uname } };
    } catch (e) { return { ok: false, error: 'Tidak dapat menghubungi server.' }; }
  }

  async function dosenSetPass(name, pass) {
    if (!ready()) return { ok: false, error: 'Server belum tersambung.' };
    const uname = normName(name);
    try {
      const ph = await hashPass(pass);
      const res = await fetch(baseUrl() + '/rest/v1/ecbook_dosen?uname=eq.' + encodeURIComponent(uname), {
        method: 'PATCH', headers: headers(), body: JSON.stringify({ password_hash: ph })
      });
      await logIfError(res, 'dosenSetPass');
      return res.ok ? { ok: true } : { ok: false, error: 'Gagal memperbarui kata sandi.' };
    } catch (e) { return { ok: false, error: 'Tidak dapat menghubungi server.' }; }
  }

  async function dosenList() {
    if (!ready()) return [];
    try {
      const res = await fetch(baseUrl() + '/rest/v1/ecbook_dosen?select=uname,name,registered_at,last_login&order=registered_at.asc', { headers: headers() });
      return res.ok ? (await res.json()) : [];
    } catch (e) { return []; }
  }

  function signOut() { try { localStorage.removeItem(SESSION_KEY); } catch (e) {} }

  return { ready, pull, push, pullAll, deleteOne, deleteAll, pullGates, pushGates, selfTest,
    hashPass, normName,
    mhsSignUp, mhsSignIn, mhsSetPass,
    dosenSignUp, dosenSignIn, dosenSetPass, dosenList,
    signOut };
})();
