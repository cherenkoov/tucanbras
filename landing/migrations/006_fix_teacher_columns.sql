-- 006: add missing columns and fix column types for Notion sync
-- specializations/interests were TEXT[] but sync inserts JSON strings → change to JSONB
-- experience and contacts were never added in migrations 000-005

-- Add missing columns
ALTER TABLE "TeacherAnketas"
  ADD COLUMN IF NOT EXISTS experience  INTEGER,
  ADD COLUMN IF NOT EXISTS contacts    JSONB,
  ADD COLUMN IF NOT EXISTS "userId"    INTEGER;

-- Fix TEXT[] → JSONB (columns are empty; safe to retype)
-- Using NULL as USING expression since PostgreSQL array literal format ({a,b})
-- cannot be cast to JSONB, and there is no data to preserve.
ALTER TABLE "TeacherAnketas"
  ALTER COLUMN specializations    TYPE JSONB USING NULL,
  ALTER COLUMN specializations_en TYPE JSONB USING NULL,
  ALTER COLUMN specializations_pt TYPE JSONB USING NULL,
  ALTER COLUMN interests           TYPE JSONB USING NULL,
  ALTER COLUMN interests_en        TYPE JSONB USING NULL,
  ALTER COLUMN interests_pt        TYPE JSONB USING NULL;
