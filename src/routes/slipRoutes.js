const express = require('express');
const router = express.Router();
const slipController = require('../controllers/slipController');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * Route: POST /api/eslip/v1/slips
 * Terproteksi authMiddleware (membutuhkan Bearer token sales aktif)
 */
router.post('/', authMiddleware, slipController.createSlip);

module.exports = router;

