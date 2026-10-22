// Loads modules from src/ while the codebase is still CommonJS (exports under `default`).
// After the ES Modules migration this collapses to plain named imports.
const SRC = new URL('../../src/', import.meta.url);

export async function loadModule(relativePath) {
  const mod = await import(new URL(relativePath, SRC));
  return mod.default ?? mod;
}

export async function loadApp() {
  const mod = await import(new URL('app.js', SRC));
  return mod.app ?? mod.default;
}
