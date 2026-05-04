// models/user.js
const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../db');

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  fullName: { type: DataTypes.STRING, allowNull: false },
  gmail: { type: DataTypes.STRING, unique: true, allowNull: false },
  userName: { type: DataTypes.STRING, unique: true, allowNull: true },
  password: { type: DataTypes.STRING, allowNull: false },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'USER',
    allowNull: false
  },
  avatar: { type: DataTypes.STRING, allowNull: true },
  timezone: { type: DataTypes.STRING, allowNull: false },
  telegramId: { type: DataTypes.BIGINT, allowNull: true },
  hasCompletedOnboarding: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },

  // ← НОВЫЕ ПОЛЯ ИЗ ОНБОРДИНГА
  level: {               // Уровень португальского: A0, A1, A2, B1, B2, C1, C2, unknown
    type: DataTypes.STRING,
    allowNull: true
  },
  purpose: {             // Цели: массив, сохраним как JSON или строку через запятую
    type: DataTypes.JSON, // Лучше всего JSON (Sequelize поддерживает)
    allowNull: true
  },
  preferredTime: {       // Удобное время: morning, day, evening
    type: DataTypes.STRING,
    allowNull: true
  },
});

module.exports = { User };