import * as slipRepository from '../repositories/slipRepository.js';
import { validateCreateSlip } from '../validations/slipValidation.js';
import { toCreatedSlipResponse, toSlipDetailResponse, toSlipListItemResponse } from '../mappers/slipMapper.js';
import { createHttpError } from '../utils/httpError.js';

export async function createSlip(rawPayload, user) {
  if (!user || !user.id || !user.nik) {
    throw createHttpError(401, 'UNAUTHORIZED', 'Konteks user terautentikasi tidak lengkap');
  }

  const validatedData = validateCreateSlip(rawPayload);

  const totalEstimated = validatedData.items.reduce((sum, item) => sum + item.subtotal, 0);
  const totalQuantity = validatedData.items.reduce((sum, item) => sum + item.quantity, 0);

  const created = await slipRepository.createSlipWithTransaction(
    validatedData,
    validatedData.items,
    user
  );

  return toCreatedSlipResponse(created, {
    totalEstimated,
    totalItems: validatedData.items.length,
    totalQuantity,
  });
}

export async function getSlips(queryParams = {}, user) {
  if (!user || !user.store_code) {
    throw createHttpError(401, 'UNAUTHORIZED', 'Konteks user atau store_code tidak ditemukan');
  }

  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit, 10) || 10));
  const offset = (page - 1) * limit;

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

export async function getSlipDetail(identifier, user) {
  if (!identifier) {
    throw createHttpError(400, 'BAD_REQUEST', 'Parameter identifier ID/slip_number wajib disertakan');
  }

  const slip = await slipRepository.findByIdOrSlipNumber(identifier);

  if (!slip) {
    throw createHttpError(404, 'NOT_FOUND', `E-Slip dengan identifier '${identifier}' tidak ditemukan`);
  }

  if (user && user.store_code && slip.store_code !== user.store_code) {
    throw createHttpError(403, 'FORBIDDEN', 'Akses ditolak: E-Slip ini milik outlet/toko lain');
  }

  const totalEstimated = slip.items.reduce((sum, item) => sum + parseFloat(item.subtotal || 0), 0);
  const totalQuantity = slip.items.reduce((sum, item) => sum + parseInt(item.quantity || 0, 10), 0);

  return toSlipDetailResponse(slip, { totalEstimated, totalQuantity });
}
