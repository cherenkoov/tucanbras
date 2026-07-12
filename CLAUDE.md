# TucanBRAS — Monorepo

Онлайн-школа бразильского португальского языка. Монорепо с четырьмя проектами.

## Структура

```
TucanBRAS/
├── landing/      # Next.js лендинг (CLAUDE.md внутри)
├── bot-main/     # Telegram-бот + REST API (CLAUDE.md внутри)
├── mini-app/     # Telegram Mini App — React (Create React App)
└── Assets/       # Дизайн-ассеты (фото, логотипы, референсы)
```

## Архитектура

```
        Hetzner VPS (nginx 1.28)
  ┌───────────────┬───────────────────┐
  │ tucanbras.com │ api.tucanbras.com │
  │ landing       │ tucan-bot         │
  │ (next start,  │ (Express+Telegram,│
  │  pm2:         │  pm2: tucan-bot,  │
  │  tucanbras-   │  порт 9000)       │
  │  landing)     │                   │
  └───────┬───────┴─────────┬─────────┘
          └── локальный PostgreSQL `tukan` (общая БД)
```

- **Notion** — административный хаб: управление анкетами учителей
- **PostgreSQL `tukan`** — локальная БД на VPS, общая для бота и лендинга
  (лендинг переехал с временной внешней БД; таблицы `TeacherAnketas`, `leads`)
- **tucan-bot** — Telegram-бот + Express API (порт 9000, отдельный репозиторий
  `Raison231/tucan-bot`, локально `c:\active-projects\tucan-bot`); backend для mini-app.
  На старте делает `sequelize.sync({ alter: { drop: false } })` — все колонки,
  которые читает лендинг, ОБЯЗАНЫ быть объявлены в моделях бота
- **landing** — продающий лендинг, `next start` за nginx на VPS
- **mini-app** — Telegram Mini App, открывается из бота через Web App кнопку

> Каталоги `bot-main/` и `mini-app/` остались на диске, но выведены из-под git
> этого репозитория (.gitignore) — актуальный код бота живёт в `tucan-bot`.

## Общие переменные окружения

Каждый проект имеет свой `.env` / `.env.local`. Общие значения:

| Переменная | Проекты | Назначение |
|---|---|---|
| `DB_HOST`/`DB_NAME`/`DB_USER`/`DB_PASSWORD` | tucan-bot, landing | локальный PostgreSQL `tukan` на VPS (лендинг: ветка без TLS в `lib/db.ts`) |
| `DATABASE_URL` | landing (legacy) | внешняя БД с TLS-проверкой — временная, выведена из использования |
| `NOTION_TOKEN` | tucan-bot, landing | Notion integration token |
| `NOTION_TEACHERS_DB_ID` | tucan-bot, landing | ID базы учителей в Notion |
| `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` | landing | уведомления о лидах: бот-отправитель и чат-получатель |
| `BOT_BASE_URL` | landing | база для фото учителей (`/static/...`), обычно `https://api.tucanbras.com` |

**Важно:** `.env` файлы не коммитятся в git. Секреты живут в `.env` на VPS.

## Деплой

Всё крутится на одном Hetzner VPS (135.181.145.252, Ubuntu, nginx, pm2).

| Проект | Как деплоить |
|---|---|
| landing | `cd /var/www/tucanbras-landing && git pull origin main && cd landing && npm ci && npm run build && pm2 restart tucanbras-landing` |
| tucan-bot | `cd /var/www/tucan-bot && git pull && npm install && pm2 restart tucan-bot` |
| mini-app | статика: `npm run build` в `mini-app/tucan/`, раздаётся ботом или отдельным хостингом |

Security-заголовки лендинга (CSP, HSTS и т.д.) отдаёт `headers()` в `landing/next.config.ts`.

## Подробная документация

- `landing/CLAUDE.md` — Next.js лендинг: стек, секции, Notion CMS, анимации
- `bot-main/CLAUDE.md` — бот: Express API, Sequelize, Telegram-команды, Notion интеграция
- `mini-app/` — CLAUDE.md отсутствует, см. ниже

## Mini-app (краткая справка)

React (Create React App) + React Router + Axios + `@telegram-apps/sdk-react`.

Telegram Mini App, открывается внутри Telegram. Backend — `bot-main` API на порту 9000.

Основные разделы: Авторизация, Профиль (студент/учитель), Уроки, Календарь, Материалы, Тарифы, Онбординг.

Конфиг: `REACT_APP_API_URL` в `.env` (`mini-app/tucan/.env`).

> CLAUDE.md для mini-app ещё не написан.
