/**
 * Validasi payload pembuatan E-Slip
 */
const slipValidation = {
  /**
   * Memvalidasi request body pembuatan E-Slip.
   * Melempar error dengan statusCode 422 jika data tidak valid.
   * Mengembalikan objek data yang telah disanitasi.
   * 
   * @param {Object} body 
   * @returns {Object} Sanitized data
   */
  validateCreateSlip(body) {
    if (!body || typeof body !== 'object') {
      const err = new Error('Request body tidak boleh kosong');
      err.statusCode = 422;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    // Mendukung baik format snake_case maupun camelCase dari frontend
    const customerName = (body.customer_name || body.customerName || body.customer || '').trim();
    const customerPhone = (body.customer_phone || body.phoneNumber || body.phone || '').trim();
    const shippingAddress = (body.shipping_address || body.address || '').trim();
    const isSpo = Boolean(body.is_spo !== undefined ? body.is_spo : (body.has_spo !== undefined ? body.has_spo : body.hasSpo));
    const spoNumber = (body.spo_number || body.spoNumber || '').trim();
    const rawItems = body.items;

    // 1. Validasi Nama Customer
    if (!customerName) {
      const err = new Error('Nama customer wajib diisi');
      err.statusCode = 422;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    if (customerName.length > 255) {
      const err = new Error('Nama customer maksimal 255 karakter');
      err.statusCode = 422;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    // 2. Validasi Nomor Telepon (opsional)
    if (customerPhone && customerPhone.length > 20) {
      const err = new Error('Nomor HP customer maksimal 20 karakter');
      err.statusCode = 422;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    // 3. Validasi SPO
    if (isSpo && !spoNumber) {
      const err = new Error('Nomor SPO wajib diisi jika transaksi menggunakan SPO');
      err.statusCode = 422;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    if (spoNumber && spoNumber.length > 50) {
      const err = new Error('Nomor SPO maksimal 50 karakter');
      err.statusCode = 422;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    // 4. Validasi Daftar Item
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      const err = new Error('E-Slip wajib memiliki minimal 1 item produk');
      err.statusCode = 422;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const validatedItems = rawItems.map((item, index) => {
      const itemNumber = index + 1;
      if (!item || typeof item !== 'object') {
        const err = new Error(`Item baris ke-${itemNumber} tidak valid`);
        err.statusCode = 422;
        err.code = 'VALIDATION_ERROR';
        throw err;
      }

      const sku = (item.sku || '').trim();
      const itemName = (item.item_name || item.itemName || item.name || '').trim();
      const quantity = parseInt(item.quantity, 10);
      const originalPrice = parseFloat(item.original_price !== undefined ? item.original_price : item.originalPrice);
      const rawDiscount = item.discount_price !== undefined ? item.discount_price : item.discountPrice;
      const discountPrice = rawDiscount !== null && rawDiscount !== undefined && rawDiscount !== '' ? parseFloat(rawDiscount) : null;

      if (!sku) {
        const err = new Error(`SKU pada item ke-${itemNumber} wajib diisi`);
        err.statusCode = 422;
        err.code = 'VALIDATION_ERROR';
        throw err;
      }

      if (sku.length > 50) {
        const err = new Error(`SKU pada item ke-${itemNumber} maksimal 50 karakter`);
        err.statusCode = 422;
        err.code = 'VALIDATION_ERROR';
        throw err;
      }

      if (!itemName) {
        const err = new Error(`Nama produk pada item ke-${itemNumber} wajib diisi`);
        err.statusCode = 422;
        err.code = 'VALIDATION_ERROR';
        throw err;
      }

      if (itemName.length > 255) {
        const err = new Error(`Nama produk pada item ke-${itemNumber} maksimal 255 karakter`);
        err.statusCode = 422;
        err.code = 'VALIDATION_ERROR';
        throw err;
      }

      if (isNaN(quantity) || quantity <= 0) {
        const err = new Error(`Quantity pada item ke-${itemNumber} harus berupa bilangan bulat positif`);
        err.statusCode = 422;
        err.code = 'VALIDATION_ERROR';
        throw err;
      }

      if (isNaN(originalPrice) || originalPrice < 0) {
        const err = new Error(`Harga asli pada item ke-${itemNumber} harus berupa angka >= 0`);
        err.statusCode = 422;
        err.code = 'VALIDATION_ERROR';
        throw err;
      }

      if (discountPrice !== null) {
        if (isNaN(discountPrice) || discountPrice < 0) {
          const err = new Error(`Harga diskon pada item ke-${itemNumber} harus berupa angka >= 0`);
          err.statusCode = 422;
          err.code = 'VALIDATION_ERROR';
          throw err;
        }

        if (discountPrice > originalPrice) {
          const err = new Error(`Harga diskon pada item ke-${itemNumber} tidak boleh lebih besar dari harga asli`);
          err.statusCode = 422;
          err.code = 'VALIDATION_ERROR';
          throw err;
        }
      }

      const effectivePrice = discountPrice !== null ? discountPrice : originalPrice;
      const subtotal = Math.round(effectivePrice * quantity * 100) / 100;

      return {
        sku,
        item_name: itemName,
        quantity,
        original_price: originalPrice,
        discount_price: discountPrice,
        effective_price: effectivePrice,
        subtotal,
      };
    });

    return {
      customer_name: customerName,
      customer_phone: customerPhone || null,
      shipping_address: shippingAddress || null,
      is_spo: isSpo,
      spo_number: isSpo ? spoNumber : null,
      items: validatedItems,
    };
  },
};

module.exports = slipValidation;

