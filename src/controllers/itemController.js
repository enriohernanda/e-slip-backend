import * as itemService from '../services/itemService.js';
import { handleControllerError, sendSuccess } from '../utils/httpResponse.js';

/**
 * Endpoint GET /api/eslip/v1/items
 * Mengambil katalog item untuk dropdown form E-Slip.
 */
export async function getItems(req, res, next) {
  try {
    const result = await itemService.getCatalogItems(req.query);

    return sendSuccess(res, 200, 'OK', 'Daftar item berhasil diambil', result);
  } catch (error) {
    return handleControllerError(error, res, next, { code: 'BAD_REQUEST', message: 'Gagal mengambil daftar item' });
  }
}
