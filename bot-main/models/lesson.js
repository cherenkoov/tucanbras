const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../db');

const Lesson = sequelize.define('Lesson', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  teacherId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  studentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  hour: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  indexes: [
    { unique: true, fields: ['teacherId', 'date', 'hour'] } // один студент на слот у учителя
  ]
});

module.exports = { Lesson };