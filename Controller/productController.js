
const db = require('../models');
const { Op } = require('sequelize');
const sequelize = db.sequelize;

const Record = db.Record;
const Category = db.Category;
const User = db.User;

/**
 * CREATE: Creates a new record for the logged-in user.
 */
exports.createRecord = async (req, res) => {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
    
    try {
        // FIX: Added 'description' to be read from the request body
        const { name, amount, date, type, categoryId, merchant, description } = req.body;
        const userId = req.user.id;

        const newRecord = await Record.create({
            name,
            amount,
            date,
            type,
            description, // Now this works
            categoryId,
            userId
        });

        res.status(201).json(newRecord);

    } catch (error) {
        console.error("Error creating record:", error);
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ message: error.errors.map(e => e.message).join(', ') });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
};


/**
 * READ: Retrieves all records for the logged-in user, with optional filtering.
 */
exports.getAllRecords = async (req, res) => {
    try {
        const userId = req.user.id;
        const { categoryId, type, limit } = req.query;

        const whereClause = { userId };
        if (categoryId) whereClause.categoryId = categoryId;
        if (type) whereClause.type = type;

        const records = await Record.findAll({
            where: whereClause,
            limit: limit ? parseInt(limit) : undefined,
            include: [{
                model: Category,
                as: 'category',
                attributes: ['name', 'icon']
            }],
            order: [['date', 'DESC']]
        });

        res.status(200).json(records);
    } catch (error) {
        console.error("Error fetching records:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * UPDATE: Updates an existing record by its ID.
 */
exports.updateRecord = async (req, res) => {
    try {
        const recordId = req.params.id;
        const userId = req.user.id;

        const record = await Record.findOne({ where: { id: recordId, userId: userId } });
        if (!record) {
            return res.status(404).json({ message: 'Record not found or you do not have permission to edit it.' });
        }

        const updatedRecord = await record.update(req.body);
        res.status(200).json(updatedRecord);
    } catch (error) {
        console.error("Error updating record:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * DELETE: Deletes a record by its ID.
 */
exports.deleteRecord = async (req, res) => {
    try {
        const recordId = req.params.id;
        const userId = req.user.id;

        const record = await Record.findOne({ where: { id: recordId, userId: userId } });
        if (!record) {
            return res.status(404).json({ message: 'Record not found or you do not have permission to delete it.' });
        }

        await record.destroy();
        res.status(204).send();
    } catch (error) {
        console.error("Error deleting record:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


/**
 * SUMMARY: Gets calculated summary data for the dashboard UI.
 */
exports.getDashboardSummary = async (req, res) => {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

    try {
        const userId = req.user.id;
        const { date } = req.query;

        const whereClause = { userId: userId };
        if (date && date !== 'all') {
            const startDate = new Date(`${date}-01T00:00:00Z`);
            const nextMonth = new Date(startDate);
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            whereClause.date = { [Op.gte]: startDate, [Op.lt]: nextMonth };
        }

        const totals = await Record.findAll({
            where: whereClause,
            attributes: [
                'type',
                [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount'],
            ],
            group: ['type']
        });

        let totalExpenses = 0;
        let totalRevenues = 0;

        totals.forEach(item => {
            const type = item.getDataValue('type');
            const amount = parseFloat(item.getDataValue('totalAmount')) || 0;
            if (type === 'expense') {
                totalExpenses = amount;
            } else if (type === 'revenue') {
                totalRevenues = amount;
            }
        });

        const balance = totalRevenues - totalExpenses;
        const monthlyLimit = req.user.budget || 0;
        const remaining = monthlyLimit - totalExpenses;

        res.status(200).json({
            totalExpenses,
            totalRevenues,
            balance,
            monthlyLimit,
            remaining
        });

    } catch (error) {
        console.error("Error fetching dashboard summary:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};



exports.getRecordById = async (req, res) => {
  // This check should be handled by your 'ensureAuthenticated' middleware,
  // which also creates req.user.
  // if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
  
  try {
    const userId = req.user.id;
    const recordId = req.params.id;

    const record = await Record.findOne({
      where: { 
        id: recordId, 
        userId: userId // Ensures user can only get their own record
      },
      // ✅ THIS IS THE FIX ✅
      // When including a model that has an alias ('as'),
      // you must specify that alias in the include statement.
      include: [{
        model: Category,
        as: 'category'
      }]
    });

    if (!record) {
      return res.status(404).json({ message: 'Record not found.' });
    }

    res.status(200).json(record);
  } catch (error) {
    console.error("Error fetching single record:", error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({
      order: [['name', 'ASC']] // Order them alphabetically
    });
    res.status(200).json(categories);
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getCategorySummary = async (req, res) => {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

    try {
        const userId = req.user.id;
        const { date } = req.query;

        const whereClause = { userId: userId, type: 'expense' }; // Only summarize expenses

        if (date && date !== 'all') {
            const startDate = new Date(`${date}-01T00:00:00Z`);
            const nextMonth = new Date(startDate);
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            whereClause.date = { [Op.gte]: startDate, [Op.lt]: nextMonth };
        }

        const summary = await Record.findAll({
            where: whereClause,
            attributes: [
                [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount'],
            ],
            include: [{
                model: Category,
                attributes: ['name', 'icon'],
                required: true // Ensures we only get records with a category
            }],
            group: ['Category.id', 'Category.name', 'Category.icon'],
            order: [[sequelize.fn('SUM', sequelize.col('amount')), 'DESC']]
        });
        
        // The result from Sequelize is slightly nested, so we re-map it for the frontend
        const formattedSummary = summary.map(item => ({
            name: item.Category.name,
            icon: item.Category.icon,
            totalAmount: item.getDataValue('totalAmount')
        }));

        res.status(200).json(formattedSummary);

    } catch (error) {
        console.error("Error fetching category summary:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getMonthlyTrend = async (req, res) => {
    try {
        const userId = req.user.id;
        const { categoryId } = req.query; // Handle optional category filter

        const whereClause = { userId };
        if (categoryId) {
            whereClause.categoryId = categoryId;
        }

        const monthlyData = await Record.findAll({
            where: whereClause,
            attributes: [
                // Group by month, e.g., '2025-06'. This format is for MySQL.
                // For PostgreSQL use: TO_CHAR("date", 'YYYY-MM')
                // For SQLite use: strftime('%Y-%m', "date")
                [sequelize.fn('DATE_FORMAT', sequelize.col('date'), '%Y-%m'), 'month'],
                
                // Calculate total revenues for the month
                [
                    sequelize.fn('SUM', sequelize.literal('CASE WHEN `type` = "revenue" THEN `amount` ELSE 0 END')),
                    'totalRevenues'
                ],

                // Calculate total expenses for the month
                [
                    sequelize.fn('SUM', sequelize.literal('CASE WHEN `type` = "expense" THEN `amount` ELSE 0 END')),
                    'totalExpenses'
                ]
            ],
            group: ['month'],
            order: [[sequelize.col('month'), 'ASC']]
        });

        // Format the data for the Chart.js frontend
        const labels = monthlyData.map(item => item.get('month'));
        const revenues = monthlyData.map(item => parseFloat(item.get('totalRevenues')));
        const expenses = monthlyData.map(item => parseFloat(item.get('totalExpenses')));

        res.status(200).json({
            labels,
            revenues,
            expenses
        });

    } catch (error) {
        console.error("Error fetching monthly trend data:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
