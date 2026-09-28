// Uso: node tools/extract2d.mjs saida.json   (precisa do Playwright e de um Chromium)
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
const out = process.argv[2] || 'desenho2d.json';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await b.newPage({ viewport: { width: 800, height: 600 } });
await pg.route('**/*', r => (r.request().url().startsWith('file:') ? r.continue() : r.abort()));
pg.on('pageerror', e => console.error('page:', e.message));
await pg.goto('file://' + new URL('../index.html', import.meta.url).pathname + '#captura');
await pg.waitForFunction(() => window.redutor, null, { timeout: 120000 });
await pg.addScriptTag({ content: readFileSync(new URL('./extract2d.page.js', import.meta.url), 'utf8') });
const t0 = Date.now();
const data = await pg.evaluate(() => window.extract2D());
writeFileSync(out, JSON.stringify(data));
const n = Object.fromEntries(Object.entries(data.views).map(([k, v]) => [k, Object.values(v.byPart).reduce((s, a) => s + a.length, 0)]));
console.log('ok', ((Date.now() - t0) / 1000).toFixed(0) + 's', JSON.stringify(n));
await b.close();
