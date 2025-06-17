// File: models/role.js
'use strict';
module.exports = (sequelize, DataTypes) => {
  const Role = sequelize.define('Role', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true // 'user', 'premium', 'admin'
    }
  }, {
    tableName: 'roles',
    timestamps: false // Roles usually don't need createdAt/updatedAt
  });

  Role.associate = (models) => {
    // ✅ THIS IS THE FIX ✅
    // A Role can be assigned to many Users
    Role.hasMany(models.User, {
      foreignKey: 'roleId'
    });
  };


  return Role;
};