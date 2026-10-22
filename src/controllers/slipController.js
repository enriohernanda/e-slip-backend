import * as slipService from '../services/slipService.js';
import { handleControllerError, sendSuccess } from '../utils/httpResponse.js';

/**
 * Endpoint POST /api/eslip/v1/slips
 * Membuat E-Slip baru beserta detail item dan status log awal.
 */
export async function createSlip(req, res, next) {
  try {
    const result = await slipService.createSlip(req.body, req.user);

    return sendSuccess(res, 201, 'CREATED', 'E-Slip berhasil dibuat', result);
  } catch (error) {
    return handleControllerError(error, res, next, { code: 'BAD_REQUEST', message: 'Gagal membuat E-Slip' });
  }
}

/**
 * Endpoint GET /api/eslip/v1/slips
 * Mengambil daftar E-Slip untuk toko user terautentikasi (dengan filter & pagination).
 */
export async function getSlips(req, res, next) {
  try {
    const result = await slipService.getSlips(req.query, req.user);

    return sendSuccess(res, 200, 'OK', 'Daftar E-Slip berhasil diambil', result);
  } catch (error) {
    return handleControllerError(error, res, next, { code: 'BAD_REQUEST', message: 'Gagal mengambil daftar E-Slip' });
  }
}

/**
 * Endpoint GET /api/eslip/v1/slips/:id
 * Mengambil detail satu E-Slip berdasarkan ID atau nomor slip / barcode.
 */
export async function getSlipDetail(req, res, next) {
  try {
    const { id } = req.params;
    const result = await slipService.getSlipDetail(id, req.user);

    return sendSuccess(res, 200, 'OK', 'Detail E-Slip berhasil diambil', result);
  } catch (error) {
    return handleControllerError(error, res, next, { code: 'BAD_REQUEST', message: 'Gagal mengambil detail E-Slip' });
  }
}
