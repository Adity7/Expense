'use strict';
const express = require('express');
const router = express.Router();
const recordController = require('../Controller/productController');
const { ensureAuthenticated,  isPremium  } = require('../middleware/auth');

// Protect all routes in this file
router.use(ensureAuthenticated);

router.get('/monthly-trend', isPremium, recordController.getMonthlyTrend);

router.get('/categories', recordController.getAllCategories);

router.get('/summary', recordController.getDashboardSummary);




router.route('/')
    .get(recordController.getAllRecords)
    .post(recordController.createRecord);

router.route('/:id')
    .get(recordController.getRecordById)
    .put(recordController.updateRecord)
    .delete(recordController.deleteRecord);

module.exports = router;