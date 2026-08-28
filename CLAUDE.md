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

- **админка tucan** — административный хаб на VPS (`tucanbras.com/tukanapp/`, CRA-статика
  за nginx, pm2-процесса нет): модерация анкет учителей и раздел «Контент лендинга»,
  где правятся тексты всех секций сайта. Заменила Notion, от которого отказались
  решением владельца 2026-07-17 (Фазы 1–2 в проде с 2026-08-28)
- **PostgreSQL `tukan`** — локальная БД на VPS, общая для бота и лендинга
  (лендинг переехал с временной внешней БД; таблицы `TeacherAnketas`, `leads`,
  `LandingContents` — тексты секций лендинга, 8 секций × 3 локали)
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
| `REVALIDATE_SECRET` | tucan-bot, landing | общий секрет хука ревалидации; на лендинге без него роут отвечает 401 всегда |
| `LANDING_REVALIDATE_URL` | tucan-bot | куда бот стучится после сохранения контента. На VPS локальный `http://127.0.0.1:3001/api/revalidate` — лендинг живёт соседним процессом, ходить наружу через nginx и TLS незачем. Публичный `https://tucanbras.com/api/revalidate` — на случай переезда лендинга на другой хост |
| `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` | landing | уведомления о лидах: бот-отправитель и чат-получатель |
| `BOT_BASE_URL` | landing | база для фото учителей (`/static/...`), обычно `https://api.tucanbras.com` |
| `NEXT_PUBLIC_ONBOARDING_URL` | landing | база URL онбординга приложения; кнопка «Continue» в футере ведёт сюда с `?tutor&plan&locale` (build-time inline, `NEXT_PUBLIC_`) |

**Важно:** `.env` файлы не коммитятся в git. Секреты живут в `.env` на VPS.

> **Грабля админки:** в `/var/www/tucan` незакоммичены `package.json` (там дописан
> `"homepage": "/tukanapp"` — именно он сажает приложение на подпуть) и `package-lock.json`
> (его переписывает каждый `npm install`). Перед `git pull` откатывать **только лок**:
> тронешь `package.json` — сборка уедет в корень и админка на `/tukanapp/` отвалится.
> `npm ci` там падает: лок на `main` протух.

## Деплой

Всё крутится на одном Hetzner VPS (135.181.145.252, Ubuntu, nginx, pm2).

| Проект | Как деплоить |
|---|---|
| landing | `cd /var/www/tucanbras-landing && git pull origin main && cd landing && npm ci && npm run build && pm2 restart tucanbras-landing` |
| tucan-bot | `cd /var/www/tucan-bot && git pull && npm install && pm2 restart tucan-bot` |
| tucan (админка) | `cd /var/www/tucan && git checkout -- package-lock.json && git pull && npm install && npm run build` — статику подхватит nginx, pm2-процесса нет |
| mini-app | статика: `npm run build` в `mini-app/tucan/`, раздаётся ботом или отдельным хостингом |

Security-заголовки лендинга (CSP, HSTS и т.д.) отдаёт `headers()` в `landing/next.config.ts`.

## Подробная документация

- `landing/CLAUDE.md` — Next.js лендинг: стек, секции, контент из БД, анимации
- `bot-main/CLAUDE.md` — бот: Express API, Sequelize, Telegram-команды, Notion интеграция
- `mini-app/` — CLAUDE.md отсутствует, см. ниже

## Mini-app (краткая справка)

React (Create React App) + React Router + Axios + `@telegram-apps/sdk-react`.

Telegram Mini App, открывается внутри Telegram. Backend — `bot-main` API на порту 9000.

Основные разделы: Авторизация, Профиль (студент/учитель), Уроки, Календарь, Материалы, Тарифы, Онбординг.

Конфиг: `REACT_APP_API_URL` в `.env` (`mini-app/tucan/.env`).

> CLAUDE.md для mini-app ещё не написан.
