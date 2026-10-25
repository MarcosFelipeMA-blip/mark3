// Exporta as malhas dos 4 STEP (suporte, lâmina, pastilha) em coordenadas da ferramenta.
const fs=require('fs'); const occt=require('occt-import-js');
const U='/root/.claude/uploads/876c6533-779c-55c3-8310-8046a1d71c4a/';
const FILES={reto:'d1cee721-3d_detailed.stp', redondo:'fac3e7aa-3d_detailed_1.stp', esquerdo:'a6bb1f0a-3d_detailed_4.stp', direito:'38d74e43-3d_detailed_5.stp'};
occt().then(o=>{
 const out={};
 for (const [k,f] of Object.entries(FILES)) {
  const r=o.ReadStepFile(new Uint8Array(fs.readFileSync(U+f)), {linearUnit:'millimeter', linearDeflectionType:'absolute_value', linearDeflection:0.01, angularDeflection:0.1});
  out[k]=r.meshes.map(m=>({name:m.name, pos:Array.from(m.attributes.position.array).map(v=>Math.round(v*1000)/1000), nor:Array.from(m.attributes.normal.array).map(v=>Math.round(v*1000)/1000), idx:Array.from(m.index.array)}));
  console.log(k, out[k].map(m=>m.name+':'+m.idx.length/3).join(' '));
 }
 fs.writeFileSync('/tmp/claude-0/-home-user-mark3/876c6533-779c-55c3-8310-8046a1d71c4a/scratchpad/tools_raw.json', JSON.stringify(out));
});
