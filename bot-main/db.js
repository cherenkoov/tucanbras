const { Sequelize } = require('sequelize');
const { Client } = require('pg');

const dbName     = process.env.DB_NAME;
const dbUser     = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbHost     = process.env.DB_HOST || 'localhost';
const dbPort     = parseInt(process.env.DB_PORT) || 5432;
const dbUrl      = process.env.DATABASE_URL;

async function createDatabaseIfNotExists() {
  if (dbUrl) return; // Neon — база уже существует
  const client = new Client({
    user: dbUser, password: dbPassword,
    host: dbHost, port: dbPort,
    database: 'postgres',
  });
  try {
    await client.connect();
    const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
    if (res.rowCount === 0) {
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`База "${dbName}" создана`);
    }
  } catch (err) {
    console.error('Ошибка создания базы:', err.message);
  } finally {
    await client.end();
  }
}

const sequelize = dbUrl
  ? new Sequelize(dbUrl, {
      dialect: 'postgres',
      dialectOptions: { ssl: { rejectUnauthorized: false } },
      logging: false,
    })
  : new Sequelize(dbName, dbUser, dbPassword, {
      dialect: 'postgres',
      host: dbHost,
      port: dbPort,
      logging: false,
    });

module.exports = sequelize;
module.exports.createDatabaseIfNotExists = createDatabaseIfNotExists;
