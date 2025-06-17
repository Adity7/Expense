// models/user.js

module.exports = (sequelize, DataTypes) => {
  // Define the model's attributes (the columns of the table)
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    // Model options
    tableName: 'users',
    timestamps: true
  });

  // Define the model's associations to other models
  User.associate = (models) => {
    // ✅ THIS IS THE FIX ✅
    // A User belongs to one Role. This adds the 'roleId' column to the users table.
    User.belongsTo(models.Role, {
      foreignKey: 'roleId'
    });

    // This association should already be here
    User.hasMany(models.Record, {
      foreignKey: 'userId',
      as: 'records'
    });
  };
  return User;
};