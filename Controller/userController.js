const bcrypt = require('bcryptjs');
const { User, Record, sequelize } = require('../models'); 

exports.addUser = async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      username,
      email,
      password: hashedPassword
    });

    req.session.user = { id: newUser.id, username, email };
    return res.json({ redirect: '/login' });

  } catch (error) {
    console.error("Signup Error:", error); // 👈 This helps you debug
    return res.status(500).json({ message: 'Unable to register user', error: error.message });
  }
};

// Login controller function
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find the user by their email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Compare the provided password with the stored hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // ===================================================================
    // ✅ THIS IS THE FIX ✅
    // ===================================================================
    
    // 1. Set the userId property on the session object.
    //    This is the data that was missing.
    req.session.userId = user.id;

    // 2. Explicitly save the session to prevent any race conditions.
    //    The response is sent only after the session is successfully saved.
    req.session.save(err => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(500).json({ message: "Error logging in. Please try again." });
      }
      
      // 3. Send the success response from inside the save callback.
      console.log(`Session saved successfully for userId: ${req.session.userId}`);
      res.status(200).json({
        message: 'Login successful!',
        redirect: '/tracker'
      });
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.getProfile = async (req, res) => {
  if (req.user) {
    res.status(200).json(req.user);
  } else {
    // This case should not be reached if middleware is correctly applied.
    res.status(401).json({ message: "Not authenticated." });
  }
};

  
exports.getLoggedInUser = (req, res) => {
    if (req.session.user && req.session.user.id) {
        // Return only the ID for security, or other non-sensitive info
        return res.status(200).json({ userId: req.session.user.id, username: req.session.user.username });
    } else {
        return res.status(401).json({ message: 'No user logged in.' });
    }
};


exports.getLeaderboard = async (req, res) => {
    try {
        const leaderboard = await User.findAll({
            attributes: [
                'id',
                'email', // This matches your User model
                [sequelize.fn('SUM', sequelize.col('records.amount')), 'totalExpenses']
            ],
            include: [{
                model: Record,
                as: 'records',
                attributes: [],
                where: { type: 'expense' },
                required: true
            }],
            group: ['User.id', 'User.username'], // Fixed: Use table prefix
            order: [[sequelize.literal('totalExpenses'), 'DESC']],
            limit: 5,
            subQuery: false
        });

        res.status(200).json(leaderboard);

    } catch (error) {
        console.error("Error fetching leaderboard data:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

exports.getCurrentUserProfile = async (req, res) => {
    try {
        const userId = req.user.id; // Or however you get the logged-in user's ID
        
        const userProfile = await User.findByPk(userId, {
            // This is the crucial part!
            include: [{
                model: Role,
                attributes: ['name'], // We only need the name of the role
                required: true // Use 'true' if every user MUST have a role. Use 'false' for an outer join if a role can be optional.
            }],
            attributes: ['id', 'email'] // Add other user fields you need
        });

        if (!userProfile) {
            return res.status(404).json({ message: "User not found." });
        }
        
        res.status(200).json(userProfile);

    } catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).json({ message: "Internal Server Error." });
    }
};