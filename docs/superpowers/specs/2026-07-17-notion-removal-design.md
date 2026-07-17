# Отказ от Notion: модерация и CMS в приложении, форма лендинга → онбординг

**Дата:** 2026-07-17 · **Статус:** дизайн утверждён владельцем
**Затронутые репозитории:** `tucanbras` (landing), `Raison231/tucan-bot`, `Raison231/tucan`

## Контекст

Notion выполняет в проекте три роли, и все три упраздняются:

1. **Админка учителей.** Notion-база учителей синкалась в Postgres Netlify-функцией
   (`landing/netlify/functions/sync-teachers.ts`, cron `*/5`). После переезда лендинга
   на VPS Netlify-краны не запускаются — **синк уже мёртв в проде**. При этом анкеты
   из приложения лендинг показывает без модерации: `landing/lib/tutors.ts` выбирает
   все строки `TeacherAnketas`.
2. **CMS текстов лендинга.** Все тексты секций тянутся из Notion при рендере
   (`landing/lib/notion.ts`). Live-запросы глотают ошибки (`catch → []`), и при
   транзиентном отказе Notion во время ISR-ревалидации страница на час запекается
   с пустыми текстами. Фолбэк уже есть: `landing/lib/notionSnapshot.json` (все
   секции × ru/en/pt) подхватывается в `app/[locale]/page.tsx` при пустом ответе.
3. **Лиды.** `/api/free-lesson` опционально дублирует лид в Notion
   (`NOTION_LEADS_DB_ID`); основное хранилище — Postgres + Telegram + Resend.

В приложении tucan уже есть админка (`src/pages/Profile/AdminOwnerProfile/`:
`AnketsList.jsx` со списком и редактированием анкет через `GET /teacher-anketa/all`
и `PUT /teacher-anketa/admin-update/:id`, `TeacherModerationPage.jsx` для заявок
на роль учителя), а в боте — полный CRUD анкет с ролевыми guard'ами ADMIN/OWNER.

**Решение владельца (2026-07-17):** Notion убрать отовсюду. Админ-функции — в
админке приложения tucan. Дополнительно: форма лендинга становится первым шагом
регистрации в приложении (лендинг = вход в приложение).

## Целевая архитектура

Единственный источник данных — Postgres `tukan` на VPS. Единственный API — tucan-bot.
Лендинг читает контент и учителей напрямую из БД (как уже читает `TeacherAnketas`),
пишет лиды в БД. Админка tucan управляет анкетами и контентом лендинга. Никаких
внешних синхронизаций.

Пайплайн учителя: онбординг в приложении → анкета → «Отправить на проверку» →
одобрение в админке → карточка появляется на лендинге и в списке «выбери
преподавателя».

Пайплайн посетителя лендинга: форма (имя, контакт, выбор учителя **или** «Хочу
стать преподавателем») → лид сохранён → редирект в онбординг приложения с
предзаполнением.

## Фаза 1 — Модерация учителей в приложении

Замена админ-звена Notion. По бэкенд-зависимостям спеки онбординга Costa
(`tucan/docs/superpowers/specs/2026-07-10-onboarding-redesign-design.md`).

**tucan-bot:**
- `TeacherAnketa.status: ENUM('draft','pending','approved')`, дефолт `'draft'`
  (модель `models/teacherAnketa.js`; колонку добавит `sync({alter})` при деплое).
  Одноразовый SQL на VPS: существующие строки → `'approved'`, чтобы лендинг и
  список учителей не опустели.
- `POST /teacher-anketa/submit-for-review` (роли TEACHER/ADMIN/OWNER):
  `draft → pending`, уведомление админам через существующий `sendTgAnketaNotify`
  (SUPPORT_GROUP_ID).
- `PUT /teacher-anketa/:id/status` (ADMIN/OWNER): `{ status: 'approved' | 'draft' }`
  — одобрить или вернуть на доработку; уведомление учителю в Telegram (telegramId
  есть в `User`).
- `publicGetAll` (выбор преподавателя студентом) фильтрует `status = 'approved'`.
- `adminUpdate` принимает поля переводов: `fullName_en/pt`, `quote_en/pt`,
  `specializations_en/pt`, `interests_en/pt` (колонки уже в модели — их читает
  лендинг).

**tucan (админка):**
- `AnketsList.jsx`: бейдж статуса (draft/pending/approved), кнопки
  «Одобрить» / «Вернуть на доработку», в форме редактирования — поля переводов
  en/pt. Лендинг фолбэкает на ru, поэтому переводы заполняются постепенно.
- UX учителя (баннер «допишите анкету», экран «на проверке», кнопка «Отправить
  на проверку») — по спеке Costa, отдельный трек; здесь только админ-сторона.

**landing:**
- `lib/tutors.ts`: `WHERE status = 'approved'`.
- Удалить мёртвый синк: `netlify/functions/sync-teachers.ts`,
  `scripts/create-notion-teachers-db.mjs`, `scripts/setup-notion-teachers-schema.mjs`,
  `scripts/test-sync-teachers.mjs`.

## Фаза 2 — CMS лендинга в админке tucan

**Хранение.** Новая модель бота `LandingContent`:
`{ section: STRING, locale: ENUM('ru','en','pt'), data: JSONB }`,
уникальный индекс `(section, locale)`. Секции — те же 9 ключей, что в снапшоте:
`header, hero, about, comparison, tutors, celpeBras, plans, footer, modal`
(FAQ живёт внутри `footer.faqGroups`, как сейчас в типах лендинга). `data`
хранит объект ровно в форме TypeScript-типов лендинга (`landing/types/index.ts`)
— лендинг потребляет без маппинга.

**Сидинг.** Одноразовый скрипт: `notionSnapshot.json` → 27 строк (9 секций × 3 локали).

**tucan-bot:** `GET /landing-content?locale=` и
`PUT /landing-content/:section/:locale` (ADMIN/OWNER; section/locale по вайтлисту,
`data` — объект). После сохранения бот дёргает revalidate-hook лендинга (ниже).

**tucan (админка):** новый раздел «Лендинг»: выбор секции и локали, форма по
известной схеме секции (текстовые поля, массивы с добавлением/удалением — тарифы,
FAQ-группы, буллеты). Без произвольного JSON-редактора.

**landing:**
- `lib/notion.ts` → `lib/content.ts`: те же геттеры-сигнатуры, но чтение из
  Postgres (`LandingContents`) через существующий `lib/db.ts`; при ошибке БД или
  отсутствии строки — фолбэк на запечённый снапшот
  (`notionSnapshot.json` → переименовать в `lib/contentSnapshot.json`).
  `NotionRetry.tsx` и логика `notionFailed` в `page.tsx` удаляются — источник
  всегда разрешается (БД или снапшот).
- `POST /api/revalidate` с секретом (`REVALIDATE_SECRET`) — `revalidatePath` всех
  локалей, чтобы правки контента появлялись сразу, а не через час ISR.
- `/api/free-lesson`: убрать `saveToNotion` и `NOTION_LEADS_DB_ID`; остаются
  Postgres + Telegram + Resend.
- Удалить `@notionhq/client`, `scripts/snapshot-notion.ts`.

## Фаза 3 — Форма лендинга = вход в онбординг

- В селекте учителя обеих форм (`FreeLessonModal`, `FooterForm`) первым пунктом —
  **«Хочу стать преподавателем»** (локализованная строка — новое поле в контенте
  секций `modal`/`footer`), дальше список approved-учителей.
- `POST /api/free-lesson` сохраняет лид как сейчас (+ Telegram, + welcome email)
  и дополнительно выдаёт **одноразовый prefill-токен**: колонки в `leads`
  (`prefill_token UUID`, `prefill_expires`, `prefill_consumed`), TTL 30 минут.
  Ответ формы содержит URL онбординга: `<APP_ONBOARDING_URL>?lead=<token>`;
  фронт после успешной отправки редиректит туда.
- `GET /api/lead-prefill?token=` (Next-роут лендинга; данные в его же таблице
  `leads`, бот не трогаем): по валидному токену — одноразово `{ name, telegram,
  email, tutorId | wantsTeacher, locale }`, токен гасится. Rate-limit как у
  `/api/free-lesson`. В URL — только токен, без PII.
- Онбординг tucan: при `?lead=` забирает предзаполнение, подставляет имя/контакт;
  `wantsTeacher` → ветка учителя (выбор роли по спеке Costa), иначе — ученик с
  предвыбранным преподавателем. Реализуется в треке Costa-онбординга; здесь
  фиксируется контракт.
- URL онбординга — env `NEXT_PUBLIC_APP_ONBOARDING_URL` (значение подставим при
  деплое приложения на tucanbras.com).

## Фаза 4 — Зачистка

- Перед дропом: на VPS посмотреть содержимое `TeacherAnketas` (строки с
  `notionPageId`, без `userId`) — понять, откуда сейчас карточки на лендинге,
  и вычистить осиротевшие.
- Миграция: `DROP COLUMN "notionPageId"` (колонки `gender/age/timezone/
  nativeLanguage` из синка модель бота не объявляет — дропнуть заодно).
- Убрать `NOTION_*` из env на VPS и из документации.
- CLAUDE.md (корень + landing): архитектура без Notion, env-таблица, раздел
  «Notion как CMS» → «Контент из БД (LandingContents)», пайплайн лидов,
  удалить справочные Notion-ссылки.

## Порядок работ

Каждая фаза — отдельный план реализации и свои PR:

1. Фаза 1: tucan-bot → tucan → landing (модерация; после неё Notion-админка не нужна).
2. Фаза 2: tucan-bot → tucan → landing (CMS; после неё `NOTION_TOKEN` не нужен).
3. Фаза 3: landing (+ контракт для трека Costa-онбординга).
4. Фаза 4: зачистка (частично в хвосте фаз 1–2, финал после фазы 2).

## Вне рамок (YAGNI)

- Просмотр/управление лидами в админке tucan (лиды сохраняются в Postgres; UI — позже).
- Автоперевод анкет и контента (переводы вручную через админку).
- Миграция исторических лидов из Notion.
- Teacher-UX онбординга и ветка ролей — спека Costa 2026-07-10.
- Markdown/rich-text в контенте — тексты остаются plain, как в Notion-полях сейчас.

## Верификация

- **Фаза 1:** draft-анкета не видна на лендинге и в выборе преподавателя;
  «Отправить на проверку» → TG-уведомление; «Одобрить» в AnketsList → карточка
  на лендинге (в Фазе 1 — при следующей ISR-ревалидации, до 1 ч; мгновенный
  revalidate-hook приезжает в Фазе 2); «Вернуть» → пропадает; переводы en/pt
  из админки видны на en/pt-лендинге.
- **Фаза 2:** `npm run build` лендинга без `NOTION_*` в env проходит; ru/en/pt
  визуально идентичны текущему проду; правка текста в админке → на лендинге
  после revalidate-hook; при остановленном Postgres лендинг собирается на
  снапшоте.
- **Фаза 3:** отправка формы → лид в БД + TG + email + редирект с токеном;
  повторный `GET /api/lead-prefill` с тем же токеном → 410; просроченный → 410;
  «Хочу стать преподавателем» первым пунктом на всех трёх локалях.
