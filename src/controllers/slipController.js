import * as slipService from '../services/slipService.js';
import { sendSuccess } from '../utils/httpResponse.js';

export async function createSlip(req, res) {
  const result = await slipService.createSlip(req.body, req.user);

  return sendSuccess(res, 201, 'CREATED', 'E-Slip berhasil dibuat', result);
}

export async function getSlips(req, res) {
  const result = await slipService.getSlips(req.query, req.user);

  return sendSuccess(res, 200, 'OK', 'Daftar E-Slip berhasil diambil', result);
}

export async function getSlipDetail(req, res) {
  const result = await slipService.getSlipDetail(req.params.id, req.user);

  return sendSuccess(res, 200, 'OK', 'Detail E-Slip berhasil diambil', result);
}
