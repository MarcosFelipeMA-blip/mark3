// Gera index.html autocontido (three.js e CSG embutidos; roda sem internet, exceto as fontes).
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
const r = await build({ entryPoints: ['src/main.js'], bundle: true, minify: true, format: 'iife', write: false, legalComments: 'none' });
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = readFileSync('src/template.html', 'utf8').replace('/*APP*/', () => js);
writeFileSync('index.html', html);
console.log('index.html', html.length, 'bytes');
