const defaultSlipService = require('../services/slipService');

class SlipController {
  constructor(slipServiceInstance = defaultSlipService) {
    this.slipService = slipServiceInstance;
    this.createSlip = this.createSlip.bind(this);
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
}

module.exports = new SlipController();
module.exports.SlipController = SlipController;

