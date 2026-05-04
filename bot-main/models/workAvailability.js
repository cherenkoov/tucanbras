// models/workAvailability.js
const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../db');

const WorkAvailability = sequelize.define('WorkAvailability', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  date: {
    type: DataTypes.DATEONLY, // Только дата: '2025-12-20'
    allowNull: false,
  },
  hour: {
    type: DataTypes.INTEGER, // 0–23
    allowNull: false,
  },
}, {
  indexes: [
    { unique: true, fields: ['userId', 'date', 'hour'] }
  ]
});

module.exports = { WorkAvailability };