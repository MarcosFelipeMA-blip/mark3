// Junta src/*.html em dist/meu-primeiro-bebe.html e gera os PDFs (A4 e celular).
// Uso: node build.mjs
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); }
catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }

const root = resolve('.');
const src = join(root, 'src');
const dist = join(root, 'dist');
mkdirSync(dist, { recursive: true });

// Fontes embutidas em base64: o HTML final é um arquivo único que funciona offline.
const html = readdirSync(src).filter(f => f.endsWith('.html')).sort()
  .map(f => readFileSync(join(src, f), 'utf8')).join('\n')
  .replace(/url\(fonts\/([\w.-]+\.woff2)\)/g, (_, f) =>
    `url(data:font/woff2;base64,${readFileSync(join(src, 'fonts', f)).toString('base64')})`);
const htmlPath = join(dist, 'meu-primeiro-bebe.html');
writeFileSync(htmlPath, html);
console.log('HTML  ->', htmlPath);

const browser = await playwright.chromium.launch();
const page = await browser.newPage();
const url = 'file://' + htmlPath;

await page.goto(url, { waitUntil: 'networkidle' });
await page.emulateMedia({ media: 'print', colorScheme: 'light' });
await page.pdf({
  path: join(dist, 'meu-primeiro-bebe-A4.pdf'),
  format: 'A4', printBackground: true,
  margin: { top: '16mm', bottom: '16mm', left: '15mm', right: '15mm' },
  displayHeaderFooter: true, headerTemplate: '<span></span>',
  footerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#999">Meu Primeiro Bebê · <span class="pageNumber"></span></div>',
});
console.log('PDF   -> dist/meu-primeiro-bebe-A4.pdf');

// Versão celular: página vertical estreita (proporção de tela de celular)
await page.goto(url + '?mobilepdf', { waitUntil: 'networkidle' });
await page.emulateMedia({ media: 'print', colorScheme: 'light' });
await page.pdf({
  path: join(dist, 'meu-primeiro-bebe-celular.pdf'),
  width: '108mm', height: '192mm', printBackground: true,
  margin: { top: '8mm', bottom: '8mm', left: '6mm', right: '6mm' },
});
console.log('PDF   -> dist/meu-primeiro-bebe-celular.pdf');

await browser.close();
