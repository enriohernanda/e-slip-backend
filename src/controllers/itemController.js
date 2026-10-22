import * as itemService from '../services/itemService.js';
import { sendSuccess } from '../utils/httpResponse.js';

export async function getItems(req, res) {
  const result = await itemService.getCatalogItems(req.query);

  return sendSuccess(res, 200, 'OK', 'Daftar item berhasil diambil', result);
}
