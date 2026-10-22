// Membulatkan nominal uang ke 2 desimal
export function roundCurrency(value) {
  return Math.round(value * 100) / 100;
}
