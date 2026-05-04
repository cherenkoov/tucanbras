'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Шаг 1: Обнови старые данные
    await queryInterface.sequelize.query('UPDATE "Users" SET "role" = \'STUDENT\' WHERE "role" = \'USER\';');

    // Шаг 2: Создай ENUM тип (если не существует)
    await queryInterface.sequelize.query(`
      DO 'BEGIN 
        CREATE TYPE "public"."enum_Users_role" AS ENUM(\'STUDENT\', \'ADMIN\', \'TEACHER\', \'OWNER\');
      EXCEPTION WHEN duplicate_object THEN null; 
      END';
    `);

    // Шаг 3: Измени колонку с явным кастом
    await queryInterface.changeColumn('Users', 'role', {
      type: Sequelize.ENUM('STUDENT', 'ADMIN', 'TEACHER', 'OWNER'),
      defaultValue: 'STUDENT',
      allowNull: false,
    }, {
      using: 'CAST("role" AS "public"."enum_Users_role")'  // Явный CAST
    });
  },

  async down(queryInterface, Sequelize) {
    // Откат: верни к STRING
    await queryInterface.changeColumn('Users', 'role', {
      type: Sequelize.STRING,
      defaultValue: 'USER',
      allowNull: false,
    });
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "public"."enum_Users_role";');
  }
};