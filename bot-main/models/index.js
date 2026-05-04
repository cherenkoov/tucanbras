// models/index.js

const { User } = require('./user');
const { TeacherAnketa } = require('./teacherAnketa');
const { Application } = require('./application');
const { WorkAvailability } = require('./workAvailability');
const { WeeklyWorkSchedule } = require('./weeklyWorkSchedule');
const { Lesson } = require('./lesson'); // ← Импортируем модель

// Экспортируем все модели в одном объекте
const db = {
  User,
  TeacherAnketa,
  Application,
  WorkAvailability,
  WeeklyWorkSchedule,
  Lesson, // ← ОБЯЗАТЕЛЬНО ДОБАВЛЯЕМ В ЭКСПОРТ!
};

// ← ВСЕ АССОЦИАЦИИ ТОЛЬКО ЗДЕСЬ, И ТОЛЬКО ЧЕРЕЗ db
db.TeacherAnketa.belongsTo(db.User, { foreignKey: 'userId' });
db.User.hasOne(db.TeacherAnketa, { foreignKey: 'userId' });

db.WorkAvailability.belongsTo(db.User, { foreignKey: 'userId' });
db.User.hasMany(db.WorkAvailability, { foreignKey: 'userId' });

db.WeeklyWorkSchedule.belongsTo(db.User, { foreignKey: 'userId' });
db.User.hasOne(db.WeeklyWorkSchedule, { foreignKey: 'userId' });

db.Application.belongsTo(db.User, { as: 'Student', foreignKey: 'studentId' });
db.Application.belongsTo(db.User, { as: 'Teacher', foreignKey: 'teacherId' });
db.User.hasMany(db.Application, { as: 'SubmittedApplications', foreignKey: 'studentId' });
db.User.hasMany(db.Application, { as: 'ReceivedApplications', foreignKey: 'teacherId' });

// ← АССОЦИАЦИИ ДЛЯ LESSON — ТОЛЬКО ЧЕРЕЗ db.Lesson!
db.Lesson.belongsTo(db.User, { as: 'Student', foreignKey: 'studentId' });
db.Lesson.belongsTo(db.User, { as : 'Teacher', foreignKey: 'teacherId' });

db.User.hasMany(db.Lesson, { as: 'LessonsAsTeacher', foreignKey: 'teacherId' });
db.User.hasMany(db.Lesson, { as: 'LessonsAsStudent', foreignKey: 'studentId' });

module.exports = db;