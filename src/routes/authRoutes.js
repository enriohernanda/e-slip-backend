import express from 'express';
import * as authController from '../controllers/authController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

export const authRoutes = express.Router();

/**
 * Route: POST /api/eslip/v1/auth/login
 * Login sales menggunakan username dan password
 */
authRoutes.post('/login', authController.login);

/**
 * Route: GET /api/eslip/v1/auth/me
 * Profil user yang sedang login (untuk memulihkan sesi di frontend)
 */
authRoutes.get('/me', authMiddleware, authController.getProfile);
