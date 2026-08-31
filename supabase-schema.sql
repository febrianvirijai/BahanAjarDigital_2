-- ============================================================================
-- Skema Supabase untuk Bahan Ajar Digital Elektrokoagulasi STEM-ESD
-- Jalankan seluruh skrip ini sekali di: Project Anda -> SQL Editor -> New query
-- ============================================================================

create table if not exists ecbook_students (
  nim text primary key,
  name text,
  kelas text,
  email text,
  record jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists ecbook_meta (
  key text primary key,
  value jsonb not null default '{}'::jsonb
);

-- Baris default untuk gate pretest/posttest (tertutup secara default)
insert into ecbook_meta (key, value)
values ('gates', '{"pretest": false, "posttest": false}'::jsonb)
on conflict (key) do nothing;

-- Aktifkan Row Level Security
alter table ecbook_students enable row level security;
alter table ecbook_meta enable row level security;

-- Kebijakan terbuka: aplikasi ini tidak punya login server-side (identitas
-- mahasiswa/dosen hanya diverifikasi di klien), jadi anon key perlu bisa
-- baca & tulis kedua tabel ini. Cukup untuk kebutuhan kelas -- JANGAN
-- gunakan pola ini untuk data sensitif tanpa autentikasi Supabase yang
-- sesungguhnya (auth.uid()).
drop policy if exists "anon full access students" on ecbook_students;
create policy "anon full access students" on ecbook_students
  for all using (true) with check (true);

drop policy if exists "anon full access meta" on ecbook_meta;
create policy "anon full access meta" on ecbook_meta
  for all using (true) with check (true);

-- ============================================================================
-- AUTENTIKASI & EMAIL
-- ============================================================================
-- Akun mahasiswa dan dosen memakai Supabase Auth (tabel auth.users), sehingga
-- email konfirmasi, tautan lupa kata sandi, dan penggantian kata sandi
-- ditangani Supabase. Tidak ada tabel tambahan yang perlu dibuat.
--
-- YANG WAJIB DIATUR DI DASBOR SUPABASE:
--
-- 1. Authentication -> Providers -> Email
--    - Aktifkan "Email".
--    - Aktifkan "Confirm email" agar email konfirmasi dikirim saat pendaftaran.
--
-- 2. Authentication -> URL Configuration
--    - Site URL: alamat situs Vercel Anda, mis. https://namaproyek.vercel.app
--    - Redirect URLs: tambahkan pola berikut agar tautan email dapat kembali
--      ke halaman mana pun:
--          https://namaproyek.vercel.app/**
--
-- 3. Authentication -> Emails (opsional, untuk menyesuaikan bahasa)
--    Ubah templat "Confirm signup" dan "Reset password" ke bahasa Indonesia.
--    Biarkan variabel {{ .ConfirmationURL }} tetap ada pada templat.
--
-- 4. Kirim email lewat SMTP sendiri (SANGAT DISARANKAN untuk kelas nyata)
--    Project Settings -> Authentication -> SMTP Settings.
--    Tanpa SMTP sendiri, Supabase membatasi pengiriman email percobaan
--    (beberapa email per jam) sehingga tidak cukup untuk satu kelas.
--
-- CATATAN: role (mhs/dosen), nama, NIM, dan kelas disimpan pada
-- user_metadata akun Supabase, lalu dicerminkan ke tabel ecbook_students
-- agar dasbor dosen dapat memantaunya.

-- Tambahkan kolom email bila tabel sudah dibuat sebelumnya
alter table ecbook_students add column if not exists email text;
