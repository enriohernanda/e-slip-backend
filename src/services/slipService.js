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

  /**
   * Mengambil daftar E-Slip dengan filter outlet/toko user terautentikasi.
   * 
   * @param {Object} queryParams - Query string { page, limit, status, search, is_spo, created_by_me }
   * @param {Object} user - Context user terautentikasi { id, nik, store_code, outlet_id }
   * @returns {Promise<Object>}
   */
  async getSlips(queryParams = {}, user) {
    if (!user || !user.store_code) {
      const error = new Error('Konteks user atau store_code tidak ditemukan');
      error.statusCode = 401;
      error.code = 'UNAUTHORIZED';
      throw error;
    }

    const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit, 10) || 10));
    const offset = (page - 1) * limit;

    // Filter toko otomatis disesuaikan dengan store_code sales yang login
    const filters = {
      store_code: user.store_code,
      status: queryParams.status ? queryParams.status.trim() : null,
      search: queryParams.search ? queryParams.search.trim() : null,
      is_spo: queryParams.is_spo !== undefined ? queryParams.is_spo : null,
      created_by: queryParams.created_by_me === 'true' ? user.nik : (queryParams.created_by || null),
      limit,
      offset,
    };

    const [rawSlips, totalRecords] = await Promise.all([
      this.slipRepository.findSlips(filters),
      this.slipRepository.countSlips(filters),
    ]);

    const formattedSlips = rawSlips.map((slip) => {
      const totalEstimated = parseFloat(slip.total_estimated || 0);

      return {
        id: slip.id,
        slip_number: slip.slip_number,
        barcode: slip.barcode,
        customer_name: slip.customer_name,
        customer_phone: slip.customer_phone,
        customer: slip.customer_name, // Alias kompatibilitas frontend (SlipListPage.jsx)
        shipping_address: slip.shipping_address,
        is_spo: slip.is_spo,
        spo_number: slip.spo_number,
        status: slip.status,
        store_code: slip.store_code,
        outlet_id: slip.outlet_id,
        created_by_user_id: slip.created_by_user_id,
        created_by: slip.created_by,
        expired_at: slip.expired_at,
        locked_at: slip.locked_at,
        paid_at: slip.paid_at,
        cancelled_at: slip.cancelled_at,
        total_items: parseInt(slip.total_items, 10) || 0,
        total_quantity: parseInt(slip.total_quantity, 10) || 0,
        total_estimated: Math.round(totalEstimated * 100) / 100,
        total: Math.round(totalEstimated * 100) / 100, // Alias kompatibilitas frontend
        created_at: slip.created_at,
        updated_date: slip.updated_date,
      };
    });

    return {
      slips: formattedSlips,
      pagination: {
        total_records: totalRecords,
        page,
        limit,
        total_pages: Math.ceil(totalRecords / limit) || 1,
      },
    };
  }

  /**
   * Mengambil detail satu E-Slip berdasarkan ID, nomor slip, atau barcode.
   * 
   * @param {string|number} identifier - ID database atau slip_number / barcode
   * @param {Object} user - Context user terautentikasi { store_code }
   * @returns {Promise<Object>}
   */
  async getSlipDetail(identifier, user) {
    if (!identifier) {
      const error = new Error('Parameter identifier ID/slip_number wajib disertakan');
      error.statusCode = 400;
      error.code = 'BAD_REQUEST';
      throw error;
    }

    const slip = await this.slipRepository.findByIdOrSlipNumber(identifier);

    if (!slip) {
      const error = new Error(`E-Slip dengan identifier '${identifier}' tidak ditemukan`);
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    // Keamanan scoping toko: Sales hanya boleh melihat slip dari tokonya sendiri
    if (user && user.store_code && slip.store_code !== user.store_code) {
      const error = new Error('Akses ditolak: E-Slip ini milik outlet/toko lain');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }

    const totalEstimated = slip.items.reduce((sum, item) => sum + parseFloat(item.subtotal || 0), 0);
    const totalQuantity = slip.items.reduce((sum, item) => sum + parseInt(item.quantity || 0, 10), 0);

    return {
      id: slip.id,
      slip_number: slip.slip_number,
      barcode: slip.barcode,
      customer_name: slip.customer_name,
      customer_phone: slip.customer_phone,
      customer: slip.customer_name,
      shipping_address: slip.shipping_address,
      is_spo: slip.is_spo,
      spo_number: slip.spo_number,
      status: slip.status,
      store_code: slip.store_code,
      outlet_id: slip.outlet_id,
      created_by_user_id: slip.created_by_user_id,
      created_by: slip.created_by,
      expired_at: slip.expired_at,
      locked_at: slip.locked_at,
      paid_at: slip.paid_at,
      cancelled_at: slip.cancelled_at,
      total_estimated: Math.round(totalEstimated * 100) / 100,
      total: Math.round(totalEstimated * 100) / 100,
      total_items: slip.items.length,
      total_quantity: totalQuantity,
      items: slip.items.map((item) => ({
        id: item.id,
        sku: item.sku,
        item_name: item.item_name,
        quantity: item.quantity,
        original_price: parseFloat(item.original_price),
        discount_price: item.discount_price !== null ? parseFloat(item.discount_price) : null,
        effective_price: parseFloat(item.effective_price),
        subtotal: parseFloat(item.subtotal),
        created_at: item.created_at,
      })),
      status_logs: (slip.status_logs || []).map((log) => ({
        id: log.id,
        previous_status: log.previous_status,
        new_status: log.new_status,
        changed_by: log.changed_by,
        change_source: log.change_source,
        notes: log.notes,
        created_at: log.created_at,
      })),
      created_at: slip.created_at,
      updated_date: slip.updated_date,
    };
  }
}

module.exports = new SlipService();
module.exports.SlipService = SlipService;


