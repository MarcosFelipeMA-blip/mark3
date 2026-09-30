// Converte pares (html, pdf) em PDF A4 com numeração de página.
// Uso: node pdf.js entrada1.html saida1.pdf [entrada2.html saida2.pdf ...]
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(path.join(require('child_process').execSync('npm root -g').toString().trim(), 'playwright'))); }

(async () => {
  const args = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (let i = 0; i < args.length; i += 2) {
    await page.goto('file://' + path.resolve(args[i]));
    await page.pdf({
      path: args[i + 1],
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: '<div style="width:100%;font-size:8px;color:#888;text-align:center;font-family:sans-serif"><span class="pageNumber"></span></div>',
    });
    console.log('pdf:', args[i + 1]);
  }
  await browser.close();
})();
