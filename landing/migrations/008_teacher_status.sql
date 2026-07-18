-- 008: статус модерации анкеты учителя (Фаза 1 отказа от Notion)
-- ВЫПОЛНИТЬ НА VPS ДО деплоя бота с новой моделью:
-- бот на старте делает sync({alter}) и добавил бы колонку с дефолтом 'draft',
-- из-за чего до ручного UPDATE лендинг и выбор преподавателя опустели бы.
-- Тип и колонка названы так, как их создал бы Sequelize.

DO $$ BEGIN
  CREATE TYPE "enum_TeacherAnketas_status" AS ENUM ('draft', 'pending', 'approved');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Добавление колонки и backfill — только при ПЕРВОМ прогоне (колонки ещё нет).
-- Повторный запуск файла ничего не делает и не трогает реальные draft/pending.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'TeacherAnketas' AND column_name = 'status'
  ) THEN
    ALTER TABLE "TeacherAnketas"
      ADD COLUMN status "enum_TeacherAnketas_status" NOT NULL DEFAULT 'draft';
    -- Все анкеты, существовавшие до модерации, считаются одобренными:
    -- именно они сейчас показываются на лендинге и в выборе преподавателя.
    UPDATE "TeacherAnketas" SET status = 'approved';
  END IF;
END $$;
