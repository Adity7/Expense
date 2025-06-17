'use strict';

// This file must export a function that accepts 'sequelize' and 'DataTypes'
module.exports = (sequelize, DataTypes) => {
  // Define the 'Record' model inside the function
  const Record = sequelize.define('Record', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Type of record, e.g., "expense" or "revenue"'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Name of the transaction, e.g., "Lunch with client"'
    },
    merchant: {
      type: DataTypes.STRING,
      allowNull: true, // This field is optional
      comment: 'The merchant or store where the expense occurred'
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true // Description should also be optional
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2), // Best practice for currency
      allowNull: false,
      comment: 'The monetary value of the transaction'
    },
    date: {
      type: DataTypes.DATEONLY, // Best for storing just the date
      allowNull: false,
      comment: 'The date the transaction occurred'
    }
  }, {
    tableName: 'records',
    timestamps: true
  });

  // ✅ THIS IS THE FIX ✅
  // ALL associations for the Record model must be defined inside this function.
  Record.associate = (models) => {
    // A Record belongs to one User
    Record.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    // A Record belongs to one Category
    Record.belongsTo(models.Category, {
      foreignKey: 'categoryId',
      as: 'category'
    });
  };

  // Return the fully initialized model
  return Record;
};
