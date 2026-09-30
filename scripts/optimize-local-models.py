"""Optimize the remaining source props locally with pinned gltfpack 1.3 (no API calls)."""
import hashlib,json,pathlib,struct,subprocess,os
ROOT=pathlib.Path(__file__).resolve().parents[1]
CLI=os.environ.get('GLTFPACK',str(pathlib.Path.home()/'.local/share/space-taxi-tools/gltfpack-1.3/gltfpack'))
source=json.loads((ROOT/'meshy_output/catalog.json').read_text())
optimized={x['id'] for x in json.loads((ROOT/'meshy_output/optimized-delivery/catalog.json').read_text())}
manifest=json.loads((ROOT/'assets/models/manifest.json').read_text())
targets={'pine-tree':16000,'climbing-vine':6000,'teleporter-ring':6000,'fuel-canister':5000,'obstacle-wall-net':6000,'table-tennis-paddle':4000}
def stats(path):
 b=path.read_bytes();n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n]);return b,g,sum(g['accessors'][p['indices']]['count']//3 for m in g['meshes'] for p in m['primitives'])
for item in source:
 id=item['id']
 if id in optimized and id!='fuel-canister':continue
 src=ROOT/'meshy_output'/pathlib.Path(item['project']).name/pathlib.Path(item['model']).name
 raw,_,triangles=stats(src);out=ROOT/'assets/models'/(id+'.glb');target=targets.get(id,3500)
 args=[CLI,'-i',str(src),'-o',str(out),'-si',str(min(1,target/triangles)),'-se','0.015','-noq','-tw','-tl','512','-tq','8','-kn']
 if id=='pine-tree':
  args[args.index('-si')+1]='0.0015';args+=['-sa']
 subprocess.run(args,check=True)
 data,g,count=stats(out)
 entry={'id':id,'file':out.name,'source':str(src.relative_to(ROOT)),'source_sha256':hashlib.sha256(raw).hexdigest(),'sha256':hashlib.sha256(data).hexdigest(),'source_bytes':len(raw),'bytes':len(data),'texture_max_edge':512,'source_triangles':triangles,'triangles':count,'bones':0,'animations':[],'optimizer':'gltfpack 1.3','target_triangles':target,'max_relative_error':.015}
 if id=='pine-tree':
  entry['simplification_mode']='aggressive silhouette-reviewed';entry['target_triangles']=round(triangles*.0015);entry.pop('max_relative_error')
 manifest=[m for m in manifest if m['id']!=id]+[entry]
 (ROOT/'assets/models/manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 print(json.dumps({'id':id,'before':triangles,'after':count,'KiB':round(len(data)/1024)}),flush=True)
