-- TucanBRAS — all migrations in order
-- Paste this into Neon SQL Editor and run

-- 000_create_teacher_anketas
CREATE TABLE IF NOT EXISTS "TeacherAnketas" (
  id                   SERIAL PRIMARY KEY,
  "fullName"           TEXT        NOT NULL,
  "fullName_en"        TEXT,
  "fullName_pt"        TEXT,
  image                TEXT,
  languages            JSONB,
  quote                TEXT,
  quote_en             TEXT,
  quote_pt             TEXT,
  specializations      TEXT[],
  specializations_en   TEXT[],
  specializations_pt   TEXT[],
  interests            TEXT[],
  interests_en         TEXT[],
  interests_pt         TEXT[]
);

-- 001_tutor_locale_columns (safe to re-run)
ALTER TABLE "TeacherAnketas"
  ADD COLUMN IF NOT EXISTS quote_en           TEXT,
  ADD COLUMN IF NOT EXISTS quote_pt           TEXT,
  ADD COLUMN IF NOT EXISTS specializations_en TEXT[],
  ADD COLUMN IF NOT EXISTS specializations_pt TEXT[],
  ADD COLUMN IF NOT EXISTS interests_en       TEXT[],
  ADD COLUMN IF NOT EXISTS interests_pt       TEXT[];

-- 002_tutor_name_columns (safe to re-run)
ALTER TABLE "TeacherAnketas"
  ADD COLUMN IF NOT EXISTS "fullName_en" TEXT,
  ADD COLUMN IF NOT EXISTS "fullName_pt" TEXT;

-- 003_create_leads
CREATE TABLE IF NOT EXISTS leads (
  id         SERIAL PRIMARY KEY,
  name       TEXT        NOT NULL,
  email      TEXT,
  tutor_id   INTEGER     REFERENCES "TeacherAnketas"(id) ON DELETE SET NULL,
  source     TEXT        NOT NULL DEFAULT 'free_lesson',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 004_add_leads_columns (safe to re-run)
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS telegram TEXT,
  ADD COLUMN IF NOT EXISTS plan     TEXT,
  ADD COLUMN IF NOT EXISTS locale   TEXT NOT NULL DEFAULT 'ru';
