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
Notion (admin hub)
  └── Netlify cron (*/5 min) ──► Neon PostgreSQL
                                      │
                           ┌──────────┼──────────┐
                        bot-main   landing    mini-app
                       (порт 9000)
```

- **Notion** — административный хаб: управление анкетами учителей
- **Neon PostgreSQL** — единая боевая база данных для всех проектов
- **bot-main** — Telegram-бот + Express API (порт 9000); используется как backend для mini-app
- **landing** — продающий лендинг, деплой на Netlify
- **mini-app** — Telegram Mini App, открывается из бота через Web App кнопку

## Общие переменные окружения

Каждый проект имеет свой `.env` / `.env.local`. Общие значения:

| Переменная | Проекты | Назначение |
|---|---|---|
| `DATABASE_URL` | bot-main, landing | Neon PostgreSQL (единая БД) |
| `NOTION_TOKEN` | bot-main, landing | Notion integration token |
| `NOTION_TEACHERS_DB_ID` | bot-main, landing | ID базы учителей в Notion |
| `BOT_TOKEN` / `TELEGRAM_BOT_TOKEN` | bot-main, landing | Telegram bot token |

**Важно:** `.env` файлы не коммитятся в git. Секреты хранятся локально и в Netlify Environment Variables.

## Деплой

| Проект | Хостинг | Конфиг |
|---|---|---|
| landing | Netlify | `landing/netlify.toml`, base dir: `landing/` |
| bot-main | VPS / Railway | запуск: `npm start` в `bot-main/` |
| mini-app | статика | `npm run build` в `mini-app/tucan/`, раздаётся ботом или отдельным хостингом |

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
