const LANGUAGES = ['id', 'en', 'es', 'ms', 'fr', 'de', 'pt', 'zh'];

export function createRuleLoader(fetchRule) {
  const cache = new Map();
  return {
    async load(language) {
      const codes = language === 'auto' ? LANGUAGES : LANGUAGES.includes(language) ? [language] : [];
      const entries = await Promise.all(codes.map(async (code) => {
        if (!cache.has(code)) {
          const pending = Promise.resolve().then(() => fetchRule(code));
          cache.set(code, pending);
        }
        try { return [code, await cache.get(code)]; }
        catch (error) { cache.delete(code); return [code, null]; }
      }));
      return { rules: Object.fromEntries(entries.filter(([, value]) => value !== null)), missing: entries.filter(([, value]) => value === null).map(([code]) => code) };
    },
  };
}
