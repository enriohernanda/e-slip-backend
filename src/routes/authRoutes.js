import express from 'express';
import * as authController from '../controllers/authController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

export const authRoutes = express.Router();

authRoutes.post('/login', authController.login);

authRoutes.get('/me', authMiddleware, authController.getProfile);
