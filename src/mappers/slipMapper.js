import { roundCurrency } from '../utils/money.js';

/**
 * Pemetaan data E-Slip dari database menjadi struktur respons API.
 * Urutan key dan field alias merupakan bagian dari kontrak respons, jangan diubah.
 */

function toSlipItemResponse(item) {
  return {
    id: item.id,
    sku: item.sku,
    item_name: item.item_name,
    quantity: item.quantity,
    original_price: parseFloat(item.original_price),
    discount_price: item.discount_price !== null ? parseFloat(item.discount_price) : null,
    effective_price: parseFloat(item.effective_price),
    subtotal: parseFloat(item.subtotal),
  };
}

function toStatusLogResponse(log) {
  return {
    id: log.id,
    previous_status: log.previous_status,
    new_status: log.new_status,
    changed_by: log.changed_by,
    change_source: log.change_source,
    notes: log.notes,
    created_at: log.created_at,
  };
}

// Field header yang sama pada respons daftar dan detail E-Slip
function toSlipHeaderResponse(slip) {
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
  };
}

/**
 * Respons POST /slips: hasil insert transaksi beserta total yang dihitung dari payload.
 */
export function toCreatedSlipResponse(created, { totalEstimated, totalItems, totalQuantity }) {
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
    total_estimated: roundCurrency(totalEstimated),
    total_items: totalItems,
    total_quantity: totalQuantity,
    items: created.items.map(toSlipItemResponse),
    created_at: created.created_at,
  };
}

/**
 * Satu baris respons GET /slips; total diambil dari agregasi query daftar.
 */
export function toSlipListItemResponse(slip) {
  const totalEstimated = parseFloat(slip.total_estimated || 0);

  return {
    ...toSlipHeaderResponse(slip),
    total_items: parseInt(slip.total_items, 10) || 0,
    total_quantity: parseInt(slip.total_quantity, 10) || 0,
    total_estimated: roundCurrency(totalEstimated),
    total: roundCurrency(totalEstimated), // Alias kompatibilitas frontend
    created_at: slip.created_at,
    updated_date: slip.updated_date,
  };
}

/**
 * Respons GET /slips/:id beserta items dan riwayat status.
 */
export function toSlipDetailResponse(slip, { totalEstimated, totalQuantity }) {
  return {
    ...toSlipHeaderResponse(slip),
    total_estimated: roundCurrency(totalEstimated),
    total: roundCurrency(totalEstimated),
    total_items: slip.items.length,
    total_quantity: totalQuantity,
    items: slip.items.map((item) => ({
      ...toSlipItemResponse(item),
      created_at: item.created_at,
    })),
    status_logs: (slip.status_logs || []).map(toStatusLogResponse),
    created_at: slip.created_at,
    updated_date: slip.updated_date,
  };
}
