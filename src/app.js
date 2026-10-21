const express = require('express');
const cors = require('cors');
const authController = require('./controllers/authController');
const slipRoutes = require('./routes/slipRoutes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

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
  res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan`,
    data: null,
  });
});

// Error handling middleware terpusat
app.use(errorHandler);

module.exports = app;
