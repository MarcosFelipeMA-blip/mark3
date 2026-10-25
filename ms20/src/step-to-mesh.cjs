const fs=require('fs'); const occt=require('occt-import-js');
occt().then(o=>{
 const f=process.argv[4] || 'MS20-R016A16-10L.stp';
 const r=o.ReadStepFile(new Uint8Array(fs.readFileSync(f)), {linearUnit:'millimeter', linearDeflectionType:'absolute_value', linearDeflection:+process.argv[2], angularDeflection:+process.argv[3]});
 const out={};
 r.meshes.forEach((m,i)=>{
  const P=m.attributes.position.array, N=m.attributes.normal.array, I=m.index.array; const nv=P.length/3;
  const mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9]; for(let k=0;k<nv;k++)for(let j=0;j<3;j++){mn[j]=Math.min(mn[j],P[3*k+j]);mx[j]=Math.max(mx[j],P[3*k+j])}
  const q=new Int16Array(nv*3), nn=new Int8Array(nv*3);
  for(let k=0;k<nv*3;k++){const j=k%3; q[k]=Math.round(((P[k]-mn[j])/(mx[j]-mn[j]||1))*65535-32768); nn[k]=Math.round(N[k]*127);}
  const idx = nv<65536? new Uint16Array(I): new Uint32Array(I);
  out[['body','insA','insB'][i]]={mn,mx,nv,nt:I.length/3,i32:nv>=65536,p:Buffer.from(q.buffer).toString('base64'),n:Buffer.from(nn.buffer).toString('base64'),i:Buffer.from(idx.buffer).toString('base64')};
  console.log(i,'verts',nv,'tris',I.length/3);
 });
 const s='window.MS20_MESH='+JSON.stringify(out)+';'; fs.writeFileSync('mesh.js',s); console.log('bytes',s.length);
});
