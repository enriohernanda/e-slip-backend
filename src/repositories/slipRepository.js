const defaultDb = require('../config/db');

class SlipRepository {
  constructor(dbInstance = defaultDb) {
    this.db = dbInstance;
  }

  /**
   * Menghasilkan slip_number baru secara aman dari race condition menggunakan PostgreSQL Advisory Lock.
   * Format: [outlet 5][YYMMDD][seq 6]
   * Contoh: 10011261021000001
   * 
   * @param {Object} client - Transactional pg client
   * @param {string} outletId - 5-digit outlet ID
   * @returns {Promise<string>}
   */
  async generateSlipNumber(client, outletId) {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const datePart = `${yy}${mm}${dd}`;
    
    // Pastikan outletId tepat 5 karakter
    const cleanOutlet = String(outletId || '10011').padStart(5, '0').slice(-5);
    const prefix = `${cleanOutlet}${datePart}`;

    // Kunci advisory lock berbasis hash prefix untuk mencegah duplicate sequence
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1));', [prefix]);

    // Cari sequence terakhir untuk prefix hari ini
    const query = `
      SELECT slip_number 
      FROM e_slips 
      WHERE slip_number LIKE $1 || '%' 
      ORDER BY slip_number DESC 
      LIMIT 1;
    `;
    const { rows } = await client.query(query, [prefix]);

    let nextSeq = 1;
    if (rows.length > 0 && rows[0].slip_number) {
      const lastSlipNumber = rows[0].slip_number;
      const lastSeqStr = lastSlipNumber.slice(prefix.length);
      const parsedSeq = parseInt(lastSeqStr, 10);
      if (!isNaN(parsedSeq)) {
        nextSeq = parsedSeq + 1;
      }
    }

    const paddedSeq = String(nextSeq).padStart(6, '0');
    return `${prefix}${paddedSeq}`;
  }

  /**
   * Menyimpan E-Slip, baris items, dan initial status log dalam satu transaksi atomik.
   * 
   * @param {Object} slipData 
   * @param {Array} items 
   * @param {Object} user 
   * @returns {Promise<Object>}
   */
  async createSlipWithTransaction(slipData, items, user) {
    const client = await this.db.pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Generate unique slip number & barcode
      const slipNumber = await this.generateSlipNumber(client, user.outlet_id);
      const barcode = slipNumber; // Sesuai spesifikasi ERD: barcode = slip_number pada MVP

      // 2. Insert E-Slip header
      const insertSlipQuery = `
        INSERT INTO e_slips (
          slip_number,
          barcode,
          customer_name,
          customer_phone,
          shipping_address,
          is_spo,
          spo_number,
          status,
          store_code,
          outlet_id,
          created_by_user_id,
          expired_at,
          created_at,
          created_by,
          updated_date,
          updated_by
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, 'Open', $8, $9, $10,
          CURRENT_TIMESTAMP + INTERVAL '2 hours',
          CURRENT_TIMESTAMP, $11, CURRENT_TIMESTAMP, $11
        )
        RETURNING 
          id, slip_number, barcode, customer_name, customer_phone, shipping_address,
          is_spo, spo_number, status, store_code, outlet_id, created_by_user_id,
          expired_at, locked_at, paid_at, cancelled_at, created_at, created_by, updated_date, updated_by;
      `;

      const slipValues = [
        slipNumber,
        barcode,
        slipData.customer_name,
        slipData.customer_phone,
        slipData.shipping_address,
        slipData.is_spo,
        slipData.spo_number,
        user.store_code,
        user.outlet_id,
        user.id,
        user.nik,
      ];

      const { rows: slipRows } = await client.query(insertSlipQuery, slipValues);
      const createdSlip = slipRows[0];

      // 3. Insert E-Slip Items (snapshot)
      const insertedItems = [];
      for (const item of items) {
        const insertItemQuery = `
          INSERT INTO e_slip_items (
            e_slip_id,
            sku,
            item_name,
            quantity,
            original_price,
            discount_price,
            effective_price,
            subtotal,
            created_at,
            created_by,
            updated_date,
            updated_by
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8,
            CURRENT_TIMESTAMP, $9, CURRENT_TIMESTAMP, $9
          )
          RETURNING 
            id, e_slip_id, sku, item_name, quantity, original_price, discount_price, effective_price, subtotal, created_at;
        `;

        const itemValues = [
          createdSlip.id,
          item.sku,
          item.item_name,
          item.quantity,
          item.original_price,
          item.discount_price,
          item.effective_price,
          item.subtotal,
          user.nik,
        ];

        const { rows: itemRows } = await client.query(insertItemQuery, itemValues);
        insertedItems.push(itemRows[0]);
      }

      // 4. Insert Initial Status Log (Open)
      const insertLogQuery = `
        INSERT INTO e_slip_status_logs (
          e_slip_id,
          previous_status,
          new_status,
          changed_by,
          change_source,
          notes,
          created_at,
          created_by,
          updated_date,
          updated_by
        )
        VALUES (
          $1, NULL, 'Open', $2, 'SALES_APP', 'E-Slip pertama kali dibuat oleh sales',
          CURRENT_TIMESTAMP, $2, CURRENT_TIMESTAMP, $2
        );
      `;

      await client.query(insertLogQuery, [createdSlip.id, user.nik]);

      // Commit transaksi jika seluruh query berhasil
      await client.query('COMMIT');

      return {
        ...createdSlip,
        items: insertedItems,
      };
    } catch (error) {
      // Rollback jika terjadi kegagalan pada salah satu operasi
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Mengambil E-Slip beserta detail itemnya berdasarkan ID
   * @param {number|string} id 
   */
  async findById(id) {
    const slipQuery = `
      SELECT 
        id, slip_number, barcode, customer_name, customer_phone, shipping_address,
        is_spo, spo_number, status, store_code, outlet_id, created_by_user_id,
        expired_at, locked_at, paid_at, cancelled_at, created_at, created_by, updated_date, updated_by
      FROM e_slips
      WHERE id = $1
      LIMIT 1;
    `;
    const { rows: slipRows } = await this.db.query(slipQuery, [id]);
    if (slipRows.length === 0) return null;

    const itemsQuery = `
      SELECT 
        id, e_slip_id, sku, item_name, quantity, original_price, discount_price, effective_price, subtotal, created_at
      FROM e_slip_items
      WHERE e_slip_id = $1
      ORDER BY id ASC;
    `;
    const { rows: itemRows } = await this.db.query(itemsQuery, [id]);

    return {
      ...slipRows[0],
      items: itemRows,
    };
  }
}

module.exports = new SlipRepository();
// Export class juga untuk mempermudah unit testing dengan dependency injection
module.exports.SlipRepository = SlipRepository;

