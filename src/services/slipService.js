import * as slipRepository from '../repositories/slipRepository.js';
import { validateCreateSlip } from '../validations/slipValidation.js';
import { toCreatedSlipResponse, toSlipDetailResponse, toSlipListItemResponse } from '../mappers/slipMapper.js';
import { createHttpError } from '../utils/httpError.js';

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
export async function createSlip(rawPayload, user) {
  if (!user || !user.id || !user.nik) {
    throw createHttpError(401, 'UNAUTHORIZED', 'Konteks user terautentikasi tidak lengkap');
  }

  // 1. Validasi dan sanitasi data
  const validatedData = validateCreateSlip(rawPayload);

  // 2. Hitung total estimasi
  const totalEstimated = validatedData.items.reduce((sum, item) => sum + item.subtotal, 0);
  const totalQuantity = validatedData.items.reduce((sum, item) => sum + item.quantity, 0);

  // 3. Simpan ke database melalui repository
  const created = await slipRepository.createSlipWithTransaction(
    validatedData,
    validatedData.items,
    user
  );

  // 4. Format hasil untuk response API
  return toCreatedSlipResponse(created, {
    totalEstimated,
    totalItems: validatedData.items.length,
    totalQuantity,
  });
}

/**
 * Mengambil daftar E-Slip dengan filter outlet/toko user terautentikasi.
 *
 * @param {Object} queryParams - Query string { page, limit, status, search, is_spo, created_by_me }
 * @param {Object} user - Context user terautentikasi { id, nik, store_code, outlet_id }
 * @returns {Promise<Object>}
 */
export async function getSlips(queryParams = {}, user) {
  if (!user || !user.store_code) {
    throw createHttpError(401, 'UNAUTHORIZED', 'Konteks user atau store_code tidak ditemukan');
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
    slipRepository.findSlips(filters),
    slipRepository.countSlips(filters),
  ]);

  return {
    slips: rawSlips.map(toSlipListItemResponse),
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
export async function getSlipDetail(identifier, user) {
  if (!identifier) {
    throw createHttpError(400, 'BAD_REQUEST', 'Parameter identifier ID/slip_number wajib disertakan');
  }

  const slip = await slipRepository.findByIdOrSlipNumber(identifier);

  if (!slip) {
    throw createHttpError(404, 'NOT_FOUND', `E-Slip dengan identifier '${identifier}' tidak ditemukan`);
  }

  // Keamanan scoping toko: Sales hanya boleh melihat slip dari tokonya sendiri
  if (user && user.store_code && slip.store_code !== user.store_code) {
    throw createHttpError(403, 'FORBIDDEN', 'Akses ditolak: E-Slip ini milik outlet/toko lain');
  }

  const totalEstimated = slip.items.reduce((sum, item) => sum + parseFloat(item.subtotal || 0), 0);
  const totalQuantity = slip.items.reduce((sum, item) => sum + parseInt(item.quantity || 0, 10), 0);

  return toSlipDetailResponse(slip, { totalEstimated, totalQuantity });
}
