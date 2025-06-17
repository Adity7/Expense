const Razorpay = require('razorpay');
const crypto = require('crypto');
const db = require('../models');
const User = db.User;
const Role = db.Role;

// Initialize Razorpay client from your .env file
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Creates a Razorpay order for the premium subscription.
 */
exports.createOrder = async (req, res) => {
    try {
        const options = {
            amount: 19900, // Amount in paise (e.g., 199.00 INR)
            currency: "INR",
            receipt: `receipt_user_${req.user.id}_${new Date().getTime()}`,
            payment_capture: 1
        };

        const order = await razorpay.orders.create(options);
        console.log("Razorpay order created:", order);
        res.status(200).json(order);

    } catch (error) {
        console.error("Error creating Razorpay order:", error);
        res.status(500).json({ message: "Could not create payment order." });
    }
};

/**
 * Verifies the payment signature and upgrades the user to premium.
 */
exports.verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ message: "Payment verification data is missing." });
        }

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === razorpay_signature) {
            // Payment is authentic. Now, upgrade the user.
            const premiumRole = await Role.findOne({ where: { name: 'premium' } });
            if (!premiumRole) {
                console.error("Critical: 'premium' role not found in the database.");
                return res.status(500).json({ message: "Server configuration error." });
            }

            // Find the current user and update their roleId
            const user = await User.findByPk(req.user.id);
            user.roleId = premiumRole.id;
            await user.save();
            
            console.log(`User ${req.user.id} upgraded to premium.`);
            res.status(200).json({ message: "Payment successful! You are now a premium user." });
        } else {
            res.status(400).json({ message: "Payment verification failed. Invalid signature." });
        }
    } catch (error) {
        console.error("Error verifying payment:", error);
        res.status(500).json({ message: "Could not verify payment." });
    }
};