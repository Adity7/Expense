require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const cors = require('cors');


const db = require('./models');

// --- ROUTERS ---
const userRoutes = require('./routes/userRouter');
const productRoutes = require('./routes/productRouter'); 
const paymentRoutes = require('./routes/paymentRoutes');

const { ensureAuthenticated, isPremium } = require('./middleware/auth'); // Auth should be applied in the router files

const app = express();


app.use(cors({
  origin: 'http://localhost:5173', 
  credentials: true 
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Session Middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'a-very-strong-secret-key-for-development',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
}));

// 4. Static File Server
app.use(express.static(path.join(__dirname, 'views'))); 



// API Routes
app.use('/api/users', userRoutes);
app.use('/api/records', productRoutes);
app.use('/api/payments', paymentRoutes);

// View-Serving Routes (for HTML pages)
// Public routes
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'signup.html'));
});


app.get('/tracker', ensureAuthenticated,(req, res) => { 
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/expense', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'expense.html'));
});

app.get('/revenue', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'revenue.html'));
});

app.get('/premium',ensureAuthenticated,isPremium, (req, res) => {
    res.sendFile(path.join(__dirname, "views", "premium.html"));
})

app.get('/record',ensureAuthenticated,isPremium, (req, res) => {
    res.sendFile(path.join(__dirname, "views", "record.html"));
})


async function initialSetup() {
    try {
        await db.Role.findOrCreate({ where: { id: 1 }, defaults: { name: "user" } });
        await db.Role.findOrCreate({ where: { id: 2 }, defaults: { name: "premium" } });
        console.log("✅ Initial roles checked/created successfully.");

        const categories = [
            { name: 'Food', type: 'expense', icon: 'fas fa-utensils' },
            { name: 'Transportation', type: 'expense', icon: 'fas fa-bus' },
            { name: 'Shopping', type: 'expense', icon: 'fas fa-shopping-cart' },
            { name: 'Bills', type: 'expense', icon: 'fas fa-file-invoice-dollar' },
            { name: 'Entertainment', type: 'expense', icon: 'fas fa-grin-beam' },
            { name: 'Salary', type: 'revenue', icon: 'fas fa-dollar-sign' }
        ];

        await Promise.all(
            categories.map(cat => db.Category.findOrCreate({
                where: { name: cat.name },
                defaults: cat
            }))
        );
        console.log("✅ Initial categories checked/created successfully.");
    } catch (error) {
        console.error("❌ Error during initial data setup:", error);
    }
}


const PORT = process.env.PORT || 5000;

console.log("Attempting to connect to the database...");

// 1. Test the database connection
db.sequelize.authenticate()
    .then(() => {
        console.log('✅ Database connection successful.');

        // 2. Sync tables - THIS IS THE FIX
        console.log('Syncing database tables...');
        return db.sequelize.sync({  alter: true }); // Using alter:true is okay for development
    })
    .then(() => {
        console.log("✅ Database synced successfully. Tables are ready.");

        // 3. Start the Express server
        app.listen(PORT, () => {
            console.log(`✅ Server is running on http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        // This will now catch the full connection or sync error
        console.error("❌ Unable to start server:", err);
        process.exit(1);
    })