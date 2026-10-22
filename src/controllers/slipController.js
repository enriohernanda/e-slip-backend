const defaultSlipService = require('../services/slipService');

class SlipController {
  constructor(slipServiceInstance = defaultSlipService) {
    this.slipService = slipServiceInstance;
    this.createSlip = this.createSlip.bind(this);
    this.getSlips = this.getSlips.bind(this);
    this.getSlipDetail = this.getSlipDetail.bind(this);
  }

  /**
   * Endpoint POST /api/eslip/v1/slips
   * Membuat E-Slip baru beserta detail item dan status log awal.
   */
  async createSlip(req, res, next) {
    try {
      const result = await this.slipService.createSlip(req.body, req.user);

      return res.status(201).json({
        success: true,
        code: 'CREATED',
        message: 'E-Slip berhasil dibuat',
        data: result,
      });
    } catch (error) {
      if (error.statusCode && error.statusCode < 500) {
        return res.status(error.statusCode).json({
          success: false,
          code: error.code || 'BAD_REQUEST',
          message: error.message || 'Gagal membuat E-Slip',
          data: null,
        });
      }

      next(error);
    }
  }

  /**
   * Endpoint GET /api/eslip/v1/slips
   * Mengambil daftar E-Slip untuk toko user terautentikasi (dengan filter & pagination).
   */
  async getSlips(req, res, next) {
    try {
      const result = await this.slipService.getSlips(req.query, req.user);

      return res.status(200).json({
        success: true,
        code: 'OK',
        message: 'Daftar E-Slip berhasil diambil',
        data: result,
      });
    } catch (error) {
      if (error.statusCode && error.statusCode < 500) {
        return res.status(error.statusCode).json({
          success: false,
          code: error.code || 'BAD_REQUEST',
          message: error.message || 'Gagal mengambil daftar E-Slip',
          data: null,
        });
      }

      next(error);
    }
  }

  /**
   * Endpoint GET /api/eslip/v1/slips/:id
   * Mengambil detail satu E-Slip berdasarkan ID atau nomor slip / barcode.
   */
  async getSlipDetail(req, res, next) {
    try {
      const { id } = req.params;
      const result = await this.slipService.getSlipDetail(id, req.user);

      return res.status(200).json({
        success: true,
        code: 'OK',
        message: 'Detail E-Slip berhasil diambil',
        data: result,
      });
    } catch (error) {
      if (error.statusCode && error.statusCode < 500) {
        return res.status(error.statusCode).json({
          success: false,
          code: error.code || 'BAD_REQUEST',
          message: error.message || 'Gagal mengambil detail E-Slip',
          data: null,
        });
      }

      next(error);
    }
  }
}

module.exports = new SlipController();
module.exports.SlipController = SlipController;

