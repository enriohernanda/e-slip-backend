/**
 * Validasi payload pembuatan E-Slip
 */
import { createHttpError } from '../utils/httpError.js';
import { roundCurrency } from '../utils/money.js';

// Semua kegagalan validasi dijawab 422 VALIDATION_ERROR
function validationError(message) {
  return createHttpError(422, 'VALIDATION_ERROR', message);
}

/**
 * Memvalidasi request body pembuatan E-Slip.
 * Melempar error dengan statusCode 422 jika data tidak valid.
 * Mengembalikan objek data yang telah disanitasi.
 *
 * @param {Object} body
 * @returns {Object} Sanitized data
 */
export function validateCreateSlip(body) {
  if (!body || typeof body !== 'object') {
    throw validationError('Request body tidak boleh kosong');
  }

  const customerName = (body.customer_name || '').trim();
  const customerPhone = (body.customer_phone || '').trim();
  const shippingAddress = (body.shipping_address || '').trim();
  const isSpo = Boolean(body.is_spo);
  const spoNumber = (body.spo_number || '').trim();
  const rawItems = body.items;

  // 1. Validasi Nama Customer
  if (!customerName) {
    throw validationError('Nama customer wajib diisi');
  }

  if (customerName.length > 255) {
    throw validationError('Nama customer maksimal 255 karakter');
  }

  // 2. Validasi Nomor Telepon (opsional)
  if (customerPhone && customerPhone.length > 20) {
    throw validationError('Nomor HP customer maksimal 20 karakter');
  }

  // 3. Validasi SPO
  if (isSpo && !spoNumber) {
    throw validationError('Nomor SPO wajib diisi jika transaksi menggunakan SPO');
  }

  if (spoNumber && spoNumber.length > 50) {
    throw validationError('Nomor SPO maksimal 50 karakter');
  }

  // 4. Validasi Daftar Item
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw validationError('E-Slip wajib memiliki minimal 1 item produk');
  }

  const validatedItems = rawItems.map((item, index) => {
    const itemNumber = index + 1;
    if (!item || typeof item !== 'object') {
      throw validationError(`Item baris ke-${itemNumber} tidak valid`);
    }

    const sku = (item.sku || '').trim();
    const itemName = (item.item_name || '').trim();
    const quantity = parseInt(item.quantity, 10);
    const originalPrice = parseFloat(item.original_price);
    const rawDiscount = item.discount_price;
    const discountPrice = rawDiscount !== null && rawDiscount !== undefined && rawDiscount !== '' ? parseFloat(rawDiscount) : null;

    if (!sku) {
      throw validationError(`SKU pada item ke-${itemNumber} wajib diisi`);
    }

    if (sku.length > 50) {
      throw validationError(`SKU pada item ke-${itemNumber} maksimal 50 karakter`);
    }

    if (!itemName) {
      throw validationError(`Nama produk pada item ke-${itemNumber} wajib diisi`);
    }

    if (itemName.length > 255) {
      throw validationError(`Nama produk pada item ke-${itemNumber} maksimal 255 karakter`);
    }

    if (isNaN(quantity) || quantity <= 0) {
      throw validationError(`Quantity pada item ke-${itemNumber} harus berupa bilangan bulat positif`);
    }

    if (isNaN(originalPrice) || originalPrice < 0) {
      throw validationError(`Harga asli pada item ke-${itemNumber} harus berupa angka >= 0`);
    }

    if (discountPrice !== null) {
      if (isNaN(discountPrice) || discountPrice < 0) {
        throw validationError(`Harga diskon pada item ke-${itemNumber} harus berupa angka >= 0`);
      }

      if (discountPrice > originalPrice) {
        throw validationError(`Harga diskon pada item ke-${itemNumber} tidak boleh lebih besar dari harga asli`);
      }
    }

    const effectivePrice = discountPrice !== null ? discountPrice : originalPrice;
    const subtotal = roundCurrency(effectivePrice * quantity);

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
}
