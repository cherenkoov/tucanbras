-- 005: add Notion sync columns to TeacherAnketas
ALTER TABLE "TeacherAnketas"
  ADD COLUMN IF NOT EXISTS "notionPageId"  TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS "imageUrl"      TEXT,
  ADD COLUMN IF NOT EXISTS gender          TEXT,
  ADD COLUMN IF NOT EXISTS age             INTEGER,
  ADD COLUMN IF NOT EXISTS timezone        TEXT,
  ADD COLUMN IF NOT EXISTS "nativeLanguage" TEXT;
