"""Build browser GLBs from the retained Meshy sources, resizing embedded textures only."""
import hashlib, io, json, pathlib, struct
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parents[1]
records=json.loads((ROOT/'meshy_output/optimized-delivery/catalog.json').read_text())
manifest=[]
for record in records:
    if record['id']=='fuel-canister': continue  # Remesh has visible surface artifacts.
    passenger=record['id'].startswith('passenger-')
    model=next(m for m in record['models'] if m['kind']==('walking' if passenger else 'optimized'))
    source=ROOT/'meshy_output'/pathlib.Path(record['project']).name/pathlib.Path(model['path']).name
    raw=source.read_bytes(); length=struct.unpack_from('<I',raw,12)[0]
    gltf=json.loads(raw[20:20+length]); binary=raw[28+length:]
    assert len(gltf['buffers'])==1 and 'uri' not in gltf['buffers'][0]
    images={i['bufferView']:i for i in gltf.get('images',[])}
    data=bytearray(); edge=1024 if passenger or record['id']=='taxi-classic' else 512
    for index,view in enumerate(gltf['bufferViews']):
        start=view.get('byteOffset',0); chunk=binary[start:start+view['byteLength']]
        if index in images:
            im=Image.open(io.BytesIO(chunk)); im.thumbnail((edge,edge),Image.Resampling.LANCZOS)
            output=io.BytesIO(); im.save(output,format='PNG',optimize=True); chunk=output.getvalue()
            images[index]['mimeType']='image/png'
        data.extend(b'\0'*((-len(data))%4)); view['byteOffset']=len(data);view['byteLength']=len(chunk);data.extend(chunk)
    gltf['buffers'][0]['byteLength']=len(data); data.extend(b'\0'*((-len(data))%4))
    encoded=json.dumps(gltf,separators=(',',':')).encode(); encoded+=b' '*((-len(encoded))%4)
    result=struct.pack('<4sII',b'glTF',2,28+len(encoded)+len(data))+struct.pack('<II',len(encoded),0x4E4F534A)+encoded+struct.pack('<II',len(data),0x004E4942)+data
    name=record['id']+'.glb'; (ROOT/'assets/models'/name).write_bytes(result)
    manifest.append({'id':record['id'],'file':name,'source':str(source.relative_to(ROOT)),'source_sha256':hashlib.sha256(raw).hexdigest(),'sha256':hashlib.sha256(result).hexdigest(),'source_bytes':len(raw),'bytes':len(result),'texture_max_edge':edge,'triangles':model['triangles'],'bones':model['bones'],'animations':model['animations']})
(ROOT/'assets/models/manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'models':len(manifest),'source_MiB':round(sum(x['source_bytes'] for x in manifest)/2**20,2),'runtime_MiB':round(sum(x['bytes'] for x in manifest)/2**20,2)}))
