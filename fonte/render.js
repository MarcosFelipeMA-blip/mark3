// Gera o PDF do guia e a imagem de capa a partir de fonte/ebook.html
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + path.resolve(__dirname, 'ebook.html'));
  await page.pdf({ path: path.resolve(__dirname, '../produto/Guia-Freela-Digital-com-IA.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true });
  await page.setViewportSize({ width: 794, height: 1123 });
  await page.locator('.cover').screenshot({ path: path.resolve(__dirname, '../vendas/capa.png'), scale: 'device' });
  await browser.close();
})();
