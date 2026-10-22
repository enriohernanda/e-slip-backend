const SRC = new URL('../../src/', import.meta.url);

export async function loadModule(relativePath) {
  return import(new URL(relativePath, SRC));
}

export async function loadApp() {
  const { app } = await loadModule('app.js');
  return app;
}
