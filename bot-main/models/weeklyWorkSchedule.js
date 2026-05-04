// models/weeklyWorkSchedule.js
const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../db');

const WeeklyWorkSchedule = sequelize.define('WeeklyWorkSchedule', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true, // Один пользователь — одно расписание
  },
  schedule: {
    type: DataTypes.JSON, // { "Пн": [{from:9,to:12}, ...], "Вт": "unavailable", ... }
    allowNull: false,
  },
});

module.exports = { WeeklyWorkSchedule };