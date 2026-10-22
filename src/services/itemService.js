import * as itemRepository from '../repositories/itemRepository.js';
import { toCatalogItemResponse } from '../mappers/itemMapper.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function getCatalogItems(queryParams = {}) {
  const search = typeof queryParams.search === 'string' ? queryParams.search.trim() : '';
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(queryParams.limit, 10) || DEFAULT_LIMIT));

  const rows = await itemRepository.findCatalogItems({ search: search || null, limit });

  return { items: rows.map(toCatalogItemResponse) };
}
