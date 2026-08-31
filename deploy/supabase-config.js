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
    console.warn('[EcbookCloud] Belum terhubung ke Supabase -- isi ECBOOK_SUPABASE_URL & ECBOOK_SUPABASE_ANON_KEY di supabase-config.js (lalu redeploy). Sementara ini data hanya tersimpan lokal (localStorage).');
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
        email: record.email || null,
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
    if (!ready()) { console.warn('[EcbookCloud] Kredensial belum diisi/redeploy.'); return false; }
    const testNim = '__selftest__';
    const ok1 = await push(testNim, { name: 'Self Test', updated: Date.now() });
    console.log('[EcbookCloud] selfTest push:', ok1);
    const rec = await pull(testNim);
    console.log('[EcbookCloud] selfTest pull:', rec);
    if (ok1 && rec) await deleteOne(testNim);
    return !!(ok1 && rec);
  }


  // ================= AUTENTIKASI (Supabase Auth) =================
  const SESSION_KEY = 'ecbook:authToken';

  function saveToken(obj) {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(obj || null)); } catch (e) {}
  }
  function loadToken() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { return null; }
  }
  function clearToken() {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
  }
  function redirectBase() {
    // Halaman tujuan setelah mahasiswa/dosen mengeklik tautan pada email
    return baseUrl() ? (window.location.origin + window.location.pathname) : window.location.href;
  }
  async function authFetch(path, opts) {
    const res = await fetch(baseUrl() + '/auth/v1' + path, Object.assign({ headers: headers() }, opts || {}));
    let body = null;
    try { body = await res.json(); } catch (e) {}
    if (!res.ok) {
      const msg = (body && (body.msg || body.error_description || body.message || body.error)) || ('HTTP ' + res.status);
      return { ok: false, error: translateErr(msg), raw: body };
    }
    return { ok: true, data: body };
  }
  function translateErr(m) {
    const s = String(m || '').toLowerCase();
    if (s.indexOf('already registered') > -1 || s.indexOf('already been registered') > -1) return 'Email ini sudah terdaftar. Silakan pilih Masuk atau gunakan Lupa Kata Sandi.';
    if (s.indexOf('invalid login') > -1 || s.indexOf('invalid credentials') > -1) return 'Email atau kata sandi salah.';
    if (s.indexOf('email not confirmed') > -1) return 'Email Anda belum dikonfirmasi. Buka tautan konfirmasi yang kami kirim ke email Anda.';
    if (s.indexOf('password should be at least') > -1) return 'Kata sandi minimal 6 karakter.';
    if (s.indexOf('unable to validate email') > -1 || s.indexOf('invalid email') > -1) return 'Format email tidak valid.';
    if (s.indexOf('rate limit') > -1 || s.indexOf('too many') > -1) return 'Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.';
    if (s.indexOf('same as the old') > -1) return 'Kata sandi baru tidak boleh sama dengan yang lama.';
    return m;
  }

  // Daftar akun baru; Supabase mengirim email konfirmasi otomatis
  async function signUp(email, password, meta) {
    if (!ready()) return { ok: false, error: 'Server belum terhubung. Hubungi pengelola.' };
    const r = await authFetch('/signup', {
      method: 'POST',
      body: JSON.stringify({ email: email, password: password, data: meta || {},
        gotrue_meta_security: {}, options: { emailRedirectTo: redirectBase() } })
    });
    if (!r.ok) return r;
    const d = r.data || {};
    // Bila konfirmasi email diaktifkan, access_token belum diberikan
    const needConfirm = !d.access_token;
    if (d.access_token) saveToken({ access_token: d.access_token, refresh_token: d.refresh_token, user: d.user });
    return { ok: true, needConfirm: needConfirm, user: d.user || (d.id ? d : null) };
  }

  async function signIn(email, password) {
    if (!ready()) return { ok: false, error: 'Server belum terhubung. Hubungi pengelola.' };
    const r = await authFetch('/token?grant_type=password', {
      method: 'POST', body: JSON.stringify({ email: email, password: password })
    });
    if (!r.ok) return r;
    const d = r.data || {};
    saveToken({ access_token: d.access_token, refresh_token: d.refresh_token, user: d.user });
    return { ok: true, user: d.user };
  }

  async function resendConfirm(email) {
    if (!ready()) return { ok: false, error: 'Server belum terhubung.' };
    return authFetch('/resend', { method: 'POST', body: JSON.stringify({ type: 'signup', email: email, options: { emailRedirectTo: redirectBase() } }) });
  }

  // Kirim email tautan atur ulang kata sandi
  async function requestReset(email) {
    if (!ready()) return { ok: false, error: 'Server belum terhubung. Hubungi pengelola.' };
    return authFetch('/recover', { method: 'POST', body: JSON.stringify({ email: email, options: { redirectTo: redirectBase() } }) });
  }

  // Ubah kata sandi; token dari sesi aktif atau dari tautan email
  async function updatePassword(newPassword, tokenOverride) {
    if (!ready()) return { ok: false, error: 'Server belum terhubung.' };
    const t = tokenOverride || (loadToken() || {}).access_token;
    if (!t) return { ok: false, error: 'Sesi tidak ditemukan. Masuk kembali atau gunakan tautan dari email.' };
    return authFetch('/user', {
      method: 'PUT',
      headers: headers({ Authorization: 'Bearer ' + t }),
      body: JSON.stringify({ password: newPassword })
    });
  }

  async function updateMeta(meta) {
    if (!ready()) return { ok: false, error: 'Server belum terhubung.' };
    const t = (loadToken() || {}).access_token;
    if (!t) return { ok: false, error: 'Sesi tidak ditemukan.' };
    return authFetch('/user', { method: 'PUT', headers: headers({ Authorization: 'Bearer ' + t }), body: JSON.stringify({ data: meta }) });
  }

  async function currentUser() {
    if (!ready()) return null;
    const t = (loadToken() || {}).access_token;
    if (!t) return null;
    const r = await authFetch('/user', { headers: headers({ Authorization: 'Bearer ' + t }) });
    return r.ok ? r.data : null;
  }

  async function signOut() {
    const t = (loadToken() || {}).access_token;
    clearToken();
    if (!ready() || !t) return { ok: true };
    try { await authFetch('/logout', { method: 'POST', headers: headers({ Authorization: 'Bearer ' + t }) }); } catch (e) {}
    return { ok: true };
  }

  // Tangkap token dari tautan email (konfirmasi / atur ulang sandi)
  function readUrlToken() {
    const h = (window.location.hash || '').replace(/^#/, '');
    if (!h) return null;
    const p = new URLSearchParams(h);
    const at = p.get('access_token'), type = p.get('type'), err = p.get('error_description') || p.get('error');
    if (!at && !err) return null;
    try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch (e) {}
    if (err) return { error: translateErr(decodeURIComponent(err.replace(/\+/g, ' '))) };
    return { access_token: at, refresh_token: p.get('refresh_token'), type: type };
  }

  return { ready, pull, push, pullAll, deleteOne, deleteAll, pullGates, pushGates, selfTest,
    signUp, signIn, signOut, requestReset, updatePassword, updateMeta, currentUser, resendConfirm,
    loadToken, saveToken, clearToken, readUrlToken, translateErr };
})();
