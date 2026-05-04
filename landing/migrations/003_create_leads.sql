-- Leads from the "free lesson" form (and future forms)
CREATE TABLE IF NOT EXISTS leads (
  id         SERIAL PRIMARY KEY,
  name       TEXT        NOT NULL,
  email      TEXT,
  tutor_id   INTEGER     REFERENCES "TeacherAnketas"(id) ON DELETE SET NULL,
  source     TEXT        NOT NULL DEFAULT 'free_lesson',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
