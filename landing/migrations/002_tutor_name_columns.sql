-- Add locale-specific name columns to TeacherAnketas
-- Fallback: if _en/_pt is NULL, app falls back to fullName (RU transliteration)

ALTER TABLE "TeacherAnketas"
  ADD COLUMN IF NOT EXISTS "fullName_en" TEXT,
  ADD COLUMN IF NOT EXISTS "fullName_pt" TEXT;
