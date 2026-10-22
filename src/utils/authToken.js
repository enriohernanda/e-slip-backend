// Token sesi E-Slip yang diterbitkan saat login: eslip-token-{nik}-{timestamp}
const SESSION_TOKEN_PREFIX = 'eslip-token-';

// Format token yang didukung:
// 1. eslip-token-{nik}-{timestamp}
// 2. hcm-mock-token-{nik}-{timestamp}
// 3. dummy-token-{nik}-{timestamp}
const SUPPORTED_TOKEN_PREFIXES = [SESSION_TOKEN_PREFIX, 'hcm-mock-token-', 'dummy-token-'];

export function createSessionToken(nik) {
  return `${SESSION_TOKEN_PREFIX}${nik}-${Date.now()}`;
}

/**
 * Mengambil NIK dari token: bagian setelah prefix hingga tanda '-' terakhir (timestamp dibuang).
 * Mengembalikan null jika prefix token tidak dikenali.
 *
 * @param {string} token
 * @returns {string|null}
 */
export function extractNikFromToken(token) {
  const prefix = SUPPORTED_TOKEN_PREFIXES.find((candidate) => token.startsWith(candidate));
  if (!prefix) return null;

  const remaining = token.slice(prefix.length);
  const lastDashIndex = remaining.lastIndexOf('-');
  return lastDashIndex !== -1 ? remaining.slice(0, lastDashIndex) : remaining;
}
