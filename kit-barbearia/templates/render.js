// Gera os PNGs 1080x1350 a partir de posts.html.
// Uso: NODE_PATH=$(npm root -g) node templates/render.js
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
  await page.goto('file://' + path.join(__dirname, 'posts.html'));
  await page.evaluate(() => document.fonts.ready);
  for (const el of await page.$$('section.post')) {
    const id = await el.getAttribute('id');
    await el.screenshot({ path: path.join(__dirname, '..', 'imagens', id + '.png') });
    console.log('ok', id);
  }
  await browser.close();
})();
