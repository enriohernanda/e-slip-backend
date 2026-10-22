import express from 'express';
import * as slipController from '../controllers/slipController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

export const slipRoutes = express.Router();

slipRoutes.post('/', authMiddleware, slipController.createSlip);

slipRoutes.get('/', authMiddleware, slipController.getSlips);

slipRoutes.get('/:id', authMiddleware, slipController.getSlipDetail);
