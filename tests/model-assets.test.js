import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('../assets/models/',import.meta.url);
test('browser models contain complete embedded buffers, bounded textures, and six usable rigs',async()=>{
 const catalog=JSON.parse(await readFile(new URL('manifest.json',root),'utf8'));
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
   assert.equal(bytes.toString('ascii',1,4),'PNG');
   assert.ok(bytes.readUInt32BE(16)<=item.texture_max_edge);assert.ok(bytes.readUInt32BE(20)<=item.texture_max_edge);
  }
  if(item.bones){assert.ok(gltf.skins[0].joints.length>=20);assert.ok(gltf.animations[0].channels.length>0);}
 }
});
