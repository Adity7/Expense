module.exports = (sequelize, DataTypes) => {
  
  // 1. Define the model
  const Category = sequelize.define('Category', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Type of category, e.g., "expense" or "revenue"'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    icon: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'CSS class for the icon, e.g., "fas fa-utensils"'
    }
  }, {
    tableName: 'categories',
    timestamps: true
  });

  // 2. Define the associations
  Category.associate = (models) => {
    // A Category can have many Records associated with it
    Category.hasMany(models.Record, {
      foreignKey: 'categoryId',
      as: 'record'
    });
  };

  // 3. Return the fully initialized model
  return Category;
};
