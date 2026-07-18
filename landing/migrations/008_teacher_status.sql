-- 008: статус модерации анкеты учителя (Фаза 1 отказа от Notion)
-- ВЫПОЛНИТЬ НА VPS ДО деплоя бота с новой моделью:
-- бот на старте делает sync({alter}) и добавил бы колонку с дефолтом 'draft',
-- из-за чего до ручного UPDATE лендинг и выбор преподавателя опустели бы.
-- Тип и колонка названы так, как их создал бы Sequelize.

DO $$ BEGIN
  CREATE TYPE "enum_TeacherAnketas_status" AS ENUM ('draft', 'pending', 'approved');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "TeacherAnketas"
  ADD COLUMN IF NOT EXISTS status "enum_TeacherAnketas_status" NOT NULL DEFAULT 'draft';

-- Все анкеты, существовавшие до модерации, считаются одобренными:
-- именно они сейчас показываются на лендинге и в выборе преподавателя.
UPDATE "TeacherAnketas" SET status = 'approved';
