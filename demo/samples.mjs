const projectRoot = '..';
export const { DEMO_SAMPLES } = await import(new URL([projectRoot, 'benchmark', 'fixtures.mjs'].join('/'), import.meta.url));
