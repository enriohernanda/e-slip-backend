const express = require('express');
const router = express.Router();
const slipController = require('../controllers/slipController');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * Route: POST /api/eslip/v1/slips
 * Membuat E-Slip baru (terproteksi authMiddleware)
 */
router.post('/', authMiddleware, slipController.createSlip);

/**
 * Route: GET /api/eslip/v1/slips
 * Mengambil daftar E-Slip toko dengan filter status, search, dan pagination
 */
router.get('/', authMiddleware, slipController.getSlips);

/**
 * Route: GET /api/eslip/v1/slips/:id
 * Mengambil detail satu E-Slip berdasarkan ID atau nomor slip / barcode
 */
router.get('/:id', authMiddleware, slipController.getSlipDetail);

module.exports = router;
