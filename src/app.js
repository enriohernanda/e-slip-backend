import express from 'express';
import cors from 'cors';
import * as authController from './controllers/authController.js';
import { slipRoutes } from './routes/slipRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { sendError } from './utils/httpResponse.js';

export const app = express();

// Middleware global
app.use(cors());
app.use(express.json());

// Healthcheck endpoint untuk mengecek status API
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Backend E-Slip API is running',
  });
});

// Endpoint Autentikasi
app.post('/api/eslip/v1/auth/login', authController.login);

// Endpoint Transaksi E-Slip
app.use('/api/eslip/v1/slips', slipRoutes);

// Handler untuk route yang tidak ditemukan (404)
app.use((req, res) => {
  sendError(res, 404, 'NOT_FOUND', `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan`);
});

// Error handling middleware terpusat
app.use(errorHandler);
