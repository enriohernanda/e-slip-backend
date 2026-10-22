import express from 'express';
import * as slipController from '../controllers/slipController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

export const slipRoutes = express.Router();

/**
 * Route: POST /api/eslip/v1/slips
 * Membuat E-Slip baru (terproteksi authMiddleware)
 */
slipRoutes.post('/', authMiddleware, slipController.createSlip);

/**
 * Route: GET /api/eslip/v1/slips
 * Mengambil daftar E-Slip toko dengan filter status, search, dan pagination
 */
slipRoutes.get('/', authMiddleware, slipController.getSlips);

/**
 * Route: GET /api/eslip/v1/slips/:id
 * Mengambil detail satu E-Slip berdasarkan ID atau nomor slip / barcode
 */
slipRoutes.get('/:id', authMiddleware, slipController.getSlipDetail);
