const express = require('express');
const router = express.Router();

// ✅ FIX: Ensure the path and controller name are correct.
const paymentController = require('../Controller/premiumController'); 
const { ensureAuthenticated } = require('../middleware/auth');

// Protect all routes in this file
router.use(ensureAuthenticated);

// Handles POST requests to /api/payments/create-order
router.post('/create-order', paymentController.createOrder);

// Handles POST requests to /api/payments/verify
router.post('/verify', paymentController.verifyPayment);


module.exports = router;
