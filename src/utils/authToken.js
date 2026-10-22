const SESSION_TOKEN_PREFIX = 'eslip-token-';

// Format: {prefix}{nik}-{timestamp}; NIK bisa mengandung '-', jadi dipotong di '-' terakhir
const SUPPORTED_TOKEN_PREFIXES = [SESSION_TOKEN_PREFIX, 'hcm-mock-token-', 'dummy-token-'];

export function createSessionToken(nik) {
  return `${SESSION_TOKEN_PREFIX}${nik}-${Date.now()}`;
}

export function extractNikFromToken(token) {
  const prefix = SUPPORTED_TOKEN_PREFIXES.find((candidate) => token.startsWith(candidate));
  if (!prefix) return null;

  const remaining = token.slice(prefix.length);
  const lastDashIndex = remaining.lastIndexOf('-');
  return lastDashIndex !== -1 ? remaining.slice(0, lastDashIndex) : remaining;
}
