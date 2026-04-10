-- Add locale-specific columns to TeacherAnketas
-- Fallback: if _en/_pt value is NULL or empty, the app falls back to the base column (RU)

ALTER TABLE "TeacherAnketas"
  ADD COLUMN IF NOT EXISTS quote_en           TEXT,
  ADD COLUMN IF NOT EXISTS quote_pt           TEXT,
  ADD COLUMN IF NOT EXISTS specializations_en TEXT[],
  ADD COLUMN IF NOT EXISTS specializations_pt TEXT[],
  ADD COLUMN IF NOT EXISTS interests_en       TEXT[],
  ADD COLUMN IF NOT EXISTS interests_pt       TEXT[];
