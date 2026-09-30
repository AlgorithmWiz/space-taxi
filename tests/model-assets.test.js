import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('../assets/models/',import.meta.url);
test('browser models contain complete embedded buffers, bounded textures, and six usable rigs',async()=>{
 const catalog=JSON.parse(await readFile(new URL('manifest.json',root),'utf8'));
 assert.equal(catalog.length,36);
 assert.equal(catalog.filter(m=>m.bones>0).length,6);
 assert.ok(catalog.reduce((n,m)=>n+m.bytes,0)<32*1024*1024);
 for(const item of catalog){
  const data=await readFile(new URL(item.file,root));
  assert.equal(data.toString('ascii',0,4),'glTF',item.id);assert.equal(data.readUInt32LE(8),data.length);
  const length=data.readUInt32LE(12),gltf=JSON.parse(data.toString('utf8',20,20+length));
  const bin=data.subarray(28+length);assert.equal(gltf.buffers.length,1);assert.ok(!gltf.buffers[0].uri);
  for(const view of gltf.bufferViews)assert.ok((view.byteOffset||0)+view.byteLength<=bin.length,item.id);
  for(const img of gltf.images){
   assert.ok(!img.uri);const view=gltf.bufferViews[img.bufferView];
   const bytes=bin.subarray(view.byteOffset,view.byteOffset+view.byteLength);
   let width,height;
   if(img.mimeType==='image/png'){assert.equal(bytes.toString('ascii',1,4),'PNG');width=bytes.readUInt32BE(16);height=bytes.readUInt32BE(20);}
   else {assert.equal(img.mimeType,'image/webp');assert.equal(bytes.toString('ascii',0,4),'RIFF');const kind=bytes.toString('ascii',12,16);if(kind==='VP8X'){width=bytes.readUIntLE(24,3)+1;height=bytes.readUIntLE(27,3)+1;}else if(kind==='VP8 '){width=bytes.readUInt16LE(26)&16383;height=bytes.readUInt16LE(28)&16383;}else {assert.equal(kind,'VP8L');const bits=bytes.readUInt32LE(21);width=(bits&16383)+1;height=((bits>>>14)&16383)+1;}}
   assert.ok(width<=item.texture_max_edge,item.id);assert.ok(height<=item.texture_max_edge,item.id);
  }
  if(item.bones){assert.ok(gltf.skins[0].joints.length>=20);assert.ok(gltf.animations[0].channels.length>0);}
 }
});
