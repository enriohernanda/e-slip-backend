const defaultSlipRepository = require('../repositories/slipRepository');
const slipValidation = require('../validations/slipValidation');

class SlipService {
  constructor(slipRepositoryInstance = defaultSlipRepository) {
    this.slipRepository = slipRepositoryInstance;
  }

  /**
   * Menangani pembuatan E-Slip:
   * 1. Validasi input payload
   * 2. Hitung total estimasi dan item
   * 3. Simpan header E-Slip, items, dan initial status log via repository transaksi
   * 
   * @param {Object} rawPayload - Data request dari frontend
   * @param {Object} user - Context user terautentikasi { id, nik, name, store_code, outlet_id }
   * @returns {Promise<Object>}
   */
  async createSlip(rawPayload, user) {
    if (!user || !user.id || !user.nik) {
      const error = new Error('Konteks user terautentikasi tidak lengkap');
      error.statusCode = 401;
      error.code = 'UNAUTHORIZED';
      throw error;
    }

    // 1. Validasi dan sanitasi data
    const validatedData = slipValidation.validateCreateSlip(rawPayload);

    // 2. Hitung total estimasi
    const totalEstimated = validatedData.items.reduce((sum, item) => sum + item.subtotal, 0);
    const totalQuantity = validatedData.items.reduce((sum, item) => sum + item.quantity, 0);

    // 3. Simpan ke database melalui repository
    const created = await this.slipRepository.createSlipWithTransaction(
      validatedData,
      validatedData.items,
      user
    );

    // 4. Format hasil untuk response API
    return {
      id: created.id,
      slip_number: created.slip_number,
      barcode: created.barcode,
      customer_name: created.customer_name,
      customer_phone: created.customer_phone,
      shipping_address: created.shipping_address,
      is_spo: created.is_spo,
      spo_number: created.spo_number,
      status: created.status,
      store_code: created.store_code,
      outlet_id: created.outlet_id,
      created_by_user_id: created.created_by_user_id,
      expired_at: created.expired_at,
      total_estimated: Math.round(totalEstimated * 100) / 100,
      total_items: validatedData.items.length,
      total_quantity: totalQuantity,
      items: created.items.map((item) => ({
        id: item.id,
        sku: item.sku,
        item_name: item.item_name,
        quantity: item.quantity,
        original_price: parseFloat(item.original_price),
        discount_price: item.discount_price !== null ? parseFloat(item.discount_price) : null,
        effective_price: parseFloat(item.effective_price),
        subtotal: parseFloat(item.subtotal),
      })),
      created_at: created.created_at,
    };
  }
}

module.exports = new SlipService();
module.exports.SlipService = SlipService;

