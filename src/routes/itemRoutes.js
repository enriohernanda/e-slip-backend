import express from 'express';
import * as itemController from '../controllers/itemController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

export const itemRoutes = express.Router();

/**
 * Route: GET /api/eslip/v1/items?search=&limit=
 * Katalog item (dari riwayat e_slip_items) untuk dropdown pembuatan E-Slip
 */
itemRoutes.get('/', authMiddleware, itemController.getItems);
