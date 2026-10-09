// Página auxiliar que exporta os modelos de AR (usada só na geração).
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
const r = await build({ entryPoints: ['src/ar.js'], bundle: true, minify: true, format: 'iife', write: false, legalComments: 'none' });
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
writeFileSync('ar-export.html', readFileSync('src/template.html', 'utf8').replace('/*APP*/', () => js));
console.log('ar-export.html ok');
