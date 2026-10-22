import express from 'express';
import cors from 'cors';
import { authRoutes } from './routes/authRoutes.js';
import { slipRoutes } from './routes/slipRoutes.js';
import { itemRoutes } from './routes/itemRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { sendError } from './utils/httpResponse.js';

export const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Backend E-Slip API is running',
  });
});

app.use('/api/eslip/v1/auth', authRoutes);
app.use('/api/eslip/v1/slips', slipRoutes);
app.use('/api/eslip/v1/items', itemRoutes);

app.use((req, res) => {
  sendError(res, 404, 'NOT_FOUND', `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan`);
});

app.use(errorHandler);
