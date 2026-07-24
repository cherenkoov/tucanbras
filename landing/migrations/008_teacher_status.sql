-- 008: статус модерации анкеты учителя (Фаза 1 отказа от Notion)
-- Реальная таблица бота — "TeacherAnketa" (ЕД.ч., владелец схемы — Sequelize),
-- НЕ "TeacherAnketas". На проде (2026-07-24) колонку status фактически добавил
-- sync({alter, drop:false}) бота, а существующие анкеты помечены approved вручную.
-- Этот файл — идемпотентный бэкстоп/документация: на уже мигрированной БД он
-- no-op (колонка есть → блок пропускается); для чистой БД добавит колонку и
-- пометит существующих approved. Тип/имя — как их создаёт Sequelize.

DO $$ BEGIN
  CREATE TYPE "enum_TeacherAnketa_status" AS ENUM ('draft', 'pending', 'approved');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Добавление колонки и backfill — только при ПЕРВОМ прогоне (колонки ещё нет).
-- Повторный запуск файла ничего не делает и не трогает реальные draft/pending.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'TeacherAnketa' AND column_name = 'status'
  ) THEN
    ALTER TABLE "TeacherAnketa"
      ADD COLUMN status "enum_TeacherAnketa_status" NOT NULL DEFAULT 'draft';
    -- Все анкеты, существовавшие до модерации, считаются одобренными:
    -- именно они сейчас показываются на лендинге и в выборе преподавателя.
    UPDATE "TeacherAnketa" SET status = 'approved';
  END IF;
END $$;
