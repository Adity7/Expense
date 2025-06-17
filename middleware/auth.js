const db = require('../models');
const User = db.User;
const Role = db.Role; // Import the Role model

/**
 * Checks if a user is authenticated and attaches their full profile (including Role) to req.user.
 */
exports.ensureAuthenticated = async (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: 'Unauthorized: Please log in.' });
  }

  try {
    // ✅ THIS IS THE FIX ✅
    // The 'include' option tells Sequelize to fetch the associated Role data.
    const user = await User.findByPk(req.session.userId, {
      include: [{
        model: Role,
        attributes: ['name'] // Only include the role's name for security
      }],
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      req.session.destroy();
      return res.status(401).json({ message: 'Authentication failed. User not found.' });
    }

    req.user = user;
    return next();

  } catch (error) {
    console.error("Authentication Middleware Error:", error);
    return res.status(500).json({ message: 'Server error during authentication.' });
  }
};

/**
 * Checks if the authenticated user has the 'premium' role.
 * This should run AFTER ensureAuthenticated.
 */
exports.isPremium = (req, res, next) => {
  // We can safely access req.user here because ensureAuthenticated ran first.
  if (req.user && req.user.Role && req.user.Role.name === 'premium') {
    return next(); // User is premium, proceed.
  }
  
  // If not premium, send a Forbidden error.
  res.status(403).json({ message: "Forbidden: This feature requires a premium subscription." });
};