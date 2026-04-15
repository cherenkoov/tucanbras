-- Initial schema for TucanBRAS landing
-- Run BEFORE 001_tutor_locale_columns.sql (already includes those columns)

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
