const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const TeacherAnketa = sequelize.define('TeacherAnketa', {
  id:       { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId:   { type: DataTypes.INTEGER, allowNull: true, references: { model: 'Users', key: 'id' } },
  notionPageId: { type: DataTypes.STRING, allowNull: true, unique: true },
  fullName: { type: DataTypes.STRING, allowNull: false },
  fullName_en: { type: DataTypes.STRING, allowNull: true },
  fullName_pt: { type: DataTypes.STRING, allowNull: true },
  image:    { type: DataTypes.STRING, allowNull: true },
  imageUrl: { type: DataTypes.STRING, allowNull: true },
  languages:       { type: DataTypes.JSON, allowNull: true },
  quote:           { type: DataTypes.TEXT, allowNull: true },
  quote_en:        { type: DataTypes.TEXT, allowNull: true },
  quote_pt:        { type: DataTypes.TEXT, allowNull: true },
  specializations:    { type: DataTypes.JSON, allowNull: true },
  specializations_en: { type: DataTypes.JSON, allowNull: true },
  specializations_pt: { type: DataTypes.JSON, allowNull: true },
  interests:    { type: DataTypes.JSON, allowNull: true },
  interests_en: { type: DataTypes.JSON, allowNull: true },
  interests_pt: { type: DataTypes.JSON, allowNull: true },
  experience: { type: DataTypes.INTEGER, allowNull: true },
  levels:   { type: DataTypes.JSON, allowNull: true },
  contacts: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
  gender:   { type: DataTypes.STRING, allowNull: true },
  age:      { type: DataTypes.INTEGER, allowNull: true },
  timezone: { type: DataTypes.STRING, allowNull: true },
  nativeLanguage: { type: DataTypes.STRING, allowNull: true },
});

module.exports = { TeacherAnketa };
