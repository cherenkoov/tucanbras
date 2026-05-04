# TucanBRAS Bot — CLAUDE.md

## Project Overview

Node.js Express API + Telegram bot for TucanBRAS (language school). The server handles two things at once: an HTTP REST API (consumed by the Telegram Mini App / landing) and a Telegram bot — both start via `Promise.all()` in `server.js`.

## Running the Project

```bash
npm start          # nodemon bot/bot.js
```

The bot entry point is `bot/bot.js`, the Express server is `server.js`.

## Environment Variables

Required in `.env` (see `.env` for current values):

| Variable | Purpose |
|---|---|
| `PORT` | Express port (default 9000) |
| `DATABASE_URL` | Neon PostgreSQL connection string (production) |
| `DB_*` | Local PostgreSQL fallback (used when `DATABASE_URL` not set) |
| `SECRET_KEY` | JWT signing secret |
| `BOT_TOKEN` | Telegram bot token |
| `SUPPORT_GROUP_ID` | Telegram group for support tickets |
| `NOTION_TOKEN` | Notion integration token |
| `NOTION_TEACHERS_DB_ID` | Notion Teachers database ID |

**Production DB**: Both the bot and the landing page share the same Neon PostgreSQL instance (`DATABASE_URL`). Do not use separate databases.

## Architecture

```
server.js               ← Express app + sequelize.sync({ alter: true }) + bot start
bot/
  bot.js                ← Telegram bot (node-telegram-bot-api)
controllers/            ← Business logic, one file per resource
routes/                 ← Express route definitions
models/                 ← Sequelize models
middleware/
  authMiddleware.js     ← JWT validation → req.user
  checkRoleMiddleware.js← Role guard factory
  ErrorHandlingMiddleware.js
services/
  notionTeacherService.js ← Notion API writes (create/update teacher pages)
db.js                   ← Sequelize instance (DATABASE_URL preferred, local fallback)
error/ApiError.js       ← ApiError.badRequest(msg) / .internal(msg) / .forbidden(msg)
static/                 ← Uploaded teacher images served at /static/:filename
```

## Database

Sequelize with PostgreSQL. Schema is managed via `sequelize.sync({ alter: true })` on startup — no separate migration runner needed for development.

For production Neon DB, schema migrations live in `Landing/tucanbras/migrations/`.

### Models

- **User** — students and teachers; roles: `USER`, `TEACHER`, `ADMIN`, `OWNER`
- **TeacherAnketa** — teacher profile (1:1 with User, but `userId` is nullable for Notion-created teachers)
- **Application** — booking request from student to teacher
- **WorkAvailability** — available time slots (1:many per teacher)
- **WeeklyWorkSchedule** — recurring weekly schedule (1:1 per teacher)
- **Lesson** — confirmed lesson between student and teacher

Key field: `TeacherAnketa.notionPageId` — stores the Notion page ID for teachers created/managed via Notion. Used by the cron sync to track and delete stale records.

## API Routes

| Prefix | Controller |
|---|---|
| `/user` | userController |
| `/teacher-anketa` | teacherAnketaController |
| `/application` | applicationController |
| `/work-availability` | workAvailabilityController |
| `/weekly-schedule` | weeklyWorkScheduleController |
| `/lesson` | lessonController |

Static files: `GET /static/:filename`

## Auth Pattern

```javascript
// Protect a route:
router.get('/endpoint', authMiddleware, checkRole(['ADMIN']), controller.method)

// In controller, access authenticated user:
req.user  // { id, role, ... } decoded from JWT
```

Roles in ascending order: `USER` < `TEACHER` < `ADMIN` < `OWNER`

## Error Handling

Always use `ApiError` — never `res.status().json()` directly in controllers:

```javascript
const ApiError = require('../error/ApiError')

// In controller:
if (!data) return next(ApiError.badRequest('Not found'))
if (!authorized) return next(ApiError.forbidden('No access'))
// unhandled errors bubble to ErrorHandlingMiddleware
```

`ErrorHandlingMiddleware` converts `ApiError` instances to `{ message }` JSON responses.

## Notion Integration

Teachers created via the bot are also written to Notion (non-blocking):

```javascript
// In teacherAnketaController — after DB save:
try {
  const pageId = await createTeacherPage(anketa)
  anketa.notionPageId = pageId
  await anketa.save()
} catch (e) {
  console.error('Notion sync failed:', e.message)
  // continue — DB record is source of truth
}
```

The Netlify cron (`Landing/tucanbras/netlify/functions/sync-teachers.ts`) runs every 5 minutes, pulling published teachers from Notion and upserting into PostgreSQL. Notion is the admin hub; PostgreSQL is the operational layer.

## Telegram Bot Commands

**User-facing:**
- `/start` — welcome message + sticker + inline keyboard
- `/profile` — opens Mini App via Web App button

**Admin-only:**
- `/help` — admin command list
- `/debug_id` — show chat/user ID
- `/ankety` — list pending teacher applications
- `/broadcast` — send message to audience (students/teachers/all)
- `/cancel` — cancel active broadcast
- `/stats` — usage statistics

**Callbacks handled:** `view_anketa_*`, `broadcast_audience_*`, `about`, `support`, `myinfo`, `howto`, `faq`, `contacts`, `desktop_version`, `broadcast_send`, `broadcast_cancel`

## Image Handling

- `TeacherAnketa.image` — filename of image uploaded to bot server, served at `/static/:filename`
- `TeacherAnketa.imageUrl` — external URL (set by Notion sync for Notion-managed teachers)
- Consumers should prefer `imageUrl`, fall back to `${BOT_BASE_URL}/static/${image}`

## Key Conventions

- Controllers are classes with static async methods; routes call `Controller.method` directly (not via `new`)
- All async controller methods should be wrapped in try/catch and call `next(err)` on failure
- Notion writes are always non-blocking (wrapped in try/catch, errors logged but not thrown)
- `sequelize.sync({ alter: true })` runs on every startup — safe for development, but avoid destructive model changes without a migration in production
