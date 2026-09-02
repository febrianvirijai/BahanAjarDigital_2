-- ============================================================================
-- Skema Supabase — Bahan Ajar Digital Elektrokoagulasi STEM-ESD
-- Jalankan seluruh skrip ini di: Project Anda → SQL Editor → New query
-- Aman dijalankan berulang (idempoten).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. TABEL MAHASISWA
--    Kunci utama NIM. Kolom "record" memuat seluruh jawaban, kuis, angket,
--    skor rubrik, dan waktu pengerjaan dalam satu objek JSON.
-- ---------------------------------------------------------------------------
create table if not exists ecbook_students (
  nim           text primary key,
  name          text,
  kelas         text,
  password_hash text,
  record        jsonb not null default '{}'::jsonb,
  registered_at timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Kolom tambahan bagi basis data yang dibuat sebelum revisi ini
alter table ecbook_students add column if not exists password_hash text;
alter table ecbook_students add column if not exists registered_at timestamptz not null default now();

-- ---------------------------------------------------------------------------
-- 2. TABEL DOSEN
--    Kunci utama "uname" = nama dosen yang dinormalkan (huruf kecil, spasi
--    tunggal). Nama asli tetap disimpan pada kolom "name" untuk ditampilkan.
-- ---------------------------------------------------------------------------
create table if not exists ecbook_dosen (
  uname         text primary key,
  name          text not null,
  password_hash text not null,
  registered_at timestamptz not null default now(),
  last_login    timestamptz
);

-- ---------------------------------------------------------------------------
-- 3. TABEL META
--    Menyimpan status buka/tutup Pretest, Posttest, dan tiap pertemuan.
-- ---------------------------------------------------------------------------
create table if not exists ecbook_meta (
  key   text primary key,
  value jsonb not null default '{}'::jsonb
);

insert into ecbook_meta (key, value)
values ('gates', '{"pretest": false, "posttest": false, "bab1": false, "bab2": false, "bab3": false, "bab4": false, "bab5": false, "bab6": false, "bab7": false, "bab8": false}'::jsonb)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 4. INDEKS BANTU
-- ---------------------------------------------------------------------------
create index if not exists ecbook_students_updated_idx on ecbook_students (updated_at desc);
create index if not exists ecbook_students_kelas_idx   on ecbook_students (kelas);

-- ---------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
--    Aplikasi ini tidak memakai Supabase Auth (mahasiswa masuk dengan NIM,
--    dosen dengan nama + kode registrasi), sehingga anon key perlu dapat
--    membaca dan menulis ketiga tabel. Kata sandi disimpan sebagai hash
--    SHA-256, bukan teks terbuka.
--
--    CATATAN KEAMANAN: pola ini memadai untuk kebutuhan kelas, tetapi bukan
--    autentikasi tingkat produksi. Jangan simpan data pribadi sensitif.
-- ---------------------------------------------------------------------------
alter table ecbook_students enable row level security;
alter table ecbook_dosen    enable row level security;
alter table ecbook_meta     enable row level security;

drop policy if exists "anon full access students" on ecbook_students;
create policy "anon full access students" on ecbook_students
  for all using (true) with check (true);

drop policy if exists "anon full access dosen" on ecbook_dosen;
create policy "anon full access dosen" on ecbook_dosen
  for all using (true) with check (true);

drop policy if exists "anon full access meta" on ecbook_meta;
create policy "anon full access meta" on ecbook_meta
  for all using (true) with check (true);

-- ---------------------------------------------------------------------------
-- 6. PEMERIKSAAN
-- ---------------------------------------------------------------------------
-- select nim, name, kelas, updated_at from ecbook_students order by updated_at desc;
-- select uname, name, registered_at, last_login from ecbook_dosen;
-- select * from ecbook_meta where key = 'gates';
