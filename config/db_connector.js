// config/db_connector.js
const { Sequelize, DataTypes } = require('sequelize'); // Ensure DataTypes is imported if not already
const sequelize = new Sequelize({
    host: 'localhost',
    dialect: 'mysql',
    username: 'root',
    password: 'abc123',
    database: 'sindoor',
    logging: console.log // <--- ADD THIS LINE to enable Sequelize logging
});

(async() => {
    try {
        await sequelize.authenticate();
        console.log("✅ Database connection established");
    } catch(err) {
        console.error("❌ Unable to connect to database:", err.message); // Changed console.log to console.error
        // It's good practice to exit if the database connection is critical for the app to run
        process.exit(1);
    }
})();

module.exports = sequelize;