/**
 * Pemetaan baris katalog item menjadi struktur respons API (harga sebagai number).
 */
export function toCatalogItemResponse(item) {
  return {
    sku: item.sku,
    item_name: item.item_name,
    original_price: parseFloat(item.original_price),
    discount_price: item.discount_price !== null ? parseFloat(item.discount_price) : null,
    effective_price: parseFloat(item.effective_price),
  };
}
