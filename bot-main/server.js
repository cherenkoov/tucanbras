require('dotenv').config();
const PORT = process.env.PORT || 9000;

const startServer = async () => {
  const express = require('express');
  const sequelize = require('./db');
  const { createDatabaseIfNotExists } = require('./db');
  const cors = require('cors');
  const router = require('./routes/index');
  const errorHandler = require('./middleware/ErrorHandlingMiddleware');
  const path = require('path');
  const fs = require('fs');

  const app = express();

  // CORS — специально под Telegram + Netlify
  app.use(cors({
    origin: [
      'https://tucanbras.netlify.app',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      '*'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  app.use(express.json());

  // Static files
  const staticPath = path.resolve(__dirname, 'static');
  console.log('🔍 Backend root:', __dirname);
  console.log('🔍 Static path:', staticPath);

  if (!fs.existsSync(staticPath)) {
    fs.mkdirSync(staticPath, { recursive: true });
    console.log('📁 Папка static создана');
  }

  app.use('/static', express.static(staticPath, {
    setHeaders: (res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  }));

  app.use('/api', router);
  app.use(errorHandler);

  app.get('/test-static', (req, res) => {
    res.json({ success: true, port: PORT, message: 'Backend работает!' });
  });

  try {
    await createDatabaseIfNotExists();     // ← создаёт базу автоматически
    await sequelize.authenticate();
    console.log('✅ База данных подключена успешно');

    await sequelize.sync({ alter: true });
    console.log('✅ Таблицы синхронизированы (alter: true)');

    app.listen(PORT, () => {
      console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
      console.log(`🌐 API: http://localhost:${PORT}/api`);
      console.log(`📸 Static: http://localhost:${PORT}/static/...`);
    });
  } catch (e) {
    console.error('❌ Ошибка запуска сервера:', e);
    process.exit(1);
  }
};

// Запуск бота
const { startBot } = require('./bot/start');

Promise.all([startServer(), startBot()])
    .then(() => console.log('🎉 Всё запущено успешно!'))
    .catch(err => console.error('💥 Ошибка запуска:', err));