import * as db from '../config/db.js';

// Belum ada tabel master produk: katalog diambil dari snapshot terbaru per SKU di e_slip_items
export async function findCatalogItems({ search, limit }) {
  const query = `
    SELECT sku, item_name, original_price, discount_price, effective_price
    FROM (
      SELECT DISTINCT ON (sku)
        sku, item_name, original_price, discount_price, effective_price
      FROM e_slip_items
      ORDER BY sku, id DESC
    ) latest_items
    WHERE $1::text IS NULL OR sku ILIKE $1 OR item_name ILIKE $1
    ORDER BY item_name ASC
    LIMIT $2;
  `;
  const { rows } = await db.query(query, [search ? `%${search}%` : null, limit]);
  return rows;
}
