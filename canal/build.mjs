// Gera index.html autocontido (three.js, geometria das ferramentas e o código embutidos).
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
const r = await build({ entryPoints: ['src/main.js'], bundle: true, minify: true, format: 'iife', write: false, legalComments: 'none' });
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
writeFileSync('index.html', readFileSync('src/template.html', 'utf8').replace('/*APP*/', () => js));
console.log('index.html', Math.round(readFileSync('index.html').length / 1024), 'KB');
