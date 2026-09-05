-- 007: лендинг переезжает на БД бота (с 2026-09-05 она называется tucandb).
-- Запускать ОДИН раз против БД бота:  psql -U <user> -d tucandb -f 007_leads_in_bot_db.sql
--
-- Таблица лидов (та же схема, что 003+004 в временной БД). Локализованные колонки
-- TeacherAnketas здесь НЕ создаются — их добавляет сам бот через модель
-- (models/teacherAnketa.js) при старте: sync({alter}) с ручными колонками не дружит,
-- всё, что читает лендинг, обязано быть объявлено в модели бота.

CREATE TABLE IF NOT EXISTS leads (
  id         SERIAL PRIMARY KEY,
  name       TEXT        NOT NULL,
  telegram   TEXT,
  email      TEXT,
  tutor_id   INTEGER     REFERENCES "TeacherAnketas"(id) ON DELETE SET NULL,
  plan       TEXT,
  locale     TEXT        NOT NULL DEFAULT 'ru',
  source     TEXT        NOT NULL DEFAULT 'free_lesson',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
