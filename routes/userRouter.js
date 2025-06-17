const express = require('express');
const router = express.Router();
const userController = require('../Controller/userController');
const { ensureAuthenticated, isPremium } = require('../middleware/auth');

router.post('/signup', userController.addUser);
router.post('/login', userController.loginUser); 
router.get('/me', ensureAuthenticated, userController.getProfile);
router.get('/me', userController.getLoggedInUser);
router.get('/me', userController.getCurrentUserProfile);
router.get('/leaderboard', ensureAuthenticated, isPremium, userController.getLeaderboard);


module.exports = router;