// WIB = UTC+7 tanpa daylight saving, jadi offset-nya tetap
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

// Digeser ke jam dinding WIB; hasilnya dibaca dengan getter UTC (toISOString)
function toWibWallClock(value) {
  return new Date(new Date(value).getTime() + WIB_OFFSET_MS);
}

export function toWibIsoString(value) {
  if (value === null || value === undefined) return value;
  return `${toWibWallClock(value).toISOString().slice(0, 19)}+07:00`;
}

// YYMMDD menurut tanggal WIB
export function toWibDateCode(value) {
  return toWibWallClock(value).toISOString().slice(2, 10).replaceAll('-', '');
}
