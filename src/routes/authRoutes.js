import express from 'express';
import * as authController from '../controllers/authController.js';

export const authRoutes = express.Router();

/**
 * Route: POST /api/eslip/v1/auth/login
 * Login sales menggunakan username dan password
 */
authRoutes.post('/login', authController.login);
