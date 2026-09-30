import json,pathlib,struct,html
ROOT=pathlib.Path(__file__).resolve().parent
records=[]
for sf in sorted(ROOT.glob('*-optimization.json')):
 s=json.loads(sf.read_text());record={'id':s['id'],'project':s['project'],'source_task_id':s['source_task_id'],'stages':[],'models':[]}
 for stage in ['remesh','rigging']:
  st=s.get(stage,{})
  if st.get('status')!='SUCCEEDED':continue
  record['stages'].append({'resource':stage,'task_id':st['task_id'],'consumed_credits':st['consumed_credits']})
  for kind,path in st.get('files',{}).items():
   p=pathlib.Path(path)
   if p.suffix=='.png':record['preview']=str(p);continue
   b=p.read_bytes();magic,v,n=struct.unpack_from('<4sII',b);ln,typ=struct.unpack_from('<II',b,12);g=json.loads(b[20:20+ln]);assert magic==b'glTF' and v==2 and n==len(b)
   tris=sum(g['accessors'][x['indices']]['count']//3 for m in g['meshes'] for x in m['primitives']);bones=sum(len(x['joints']) for x in g.get('skins',[]));animations=[a.get('name','unnamed') for a in g.get('animations',[])]
   assert any('baseColorTexture' in m.get('pbrMetallicRoughness',{}) for m in g.get('materials',[]))
   if stage=='rigging':
    assert bones>0 and any('JOINTS_0' in x['attributes'] and 'WEIGHTS_0' in x['attributes'] for m in g['meshes'] for x in m['primitives'])
    if kind in ['walking','running']:assert animations
   record['models'].append({'kind':kind,'path':str(p),'archive_path':p.name,'triangles':tris,'bones':bones,'animations':animations,'bytes':len(b)})
 if record['id']=='fuel-canister': record['warning']='Visible surface artifacts after remeshing; use original until repaired.'
 if record['models']:records.append(record)
out=ROOT/'optimized-delivery';out.mkdir(exist_ok=True);(out/'catalog.json').write_text(json.dumps(records,indent=2))
cards=[]
for r in records:
 image='../'+str(pathlib.Path(r['preview']).relative_to(ROOT)) if 'preview' in r else ''
 links=' '.join('<a href="../'+str(pathlib.Path(m['path']).relative_to(ROOT))+'" download>'+m['kind']+'</a>' for m in r['models'])
 cards.append('<article><img src="'+image+'"><h2>'+r['id']+'</h2><p>'+str(r['models'][0]['triangles'])+' triangles</p>'+('<p>'+r['warning']+'</p>' if r.get('warning') else '')+links+'</article>')
(out/'index.html').write_text('<!doctype html><meta charset="utf-8"><title>Optimized Space Taxi assets</title><style>body{background:#17202b;color:white;font:16px system-ui;margin:30px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px}article{background:#263343;padding:15px;border-radius:12px}img{width:100%}h2{font-size:18px}a{color:#9ddcff;margin-right:10px}</style><h1>Optimized Space Taxi assets</h1><p>Remesh renders shown. Rigged characters include walking and running clips.</p><main>'+''.join(cards)+'</main><script>if(location.hostname.endsWith("github.io")){for(const el of document.querySelectorAll("img,a[download]")){const attr=el.tagName==="IMG"?"src":"href";el.setAttribute(attr,"https://media.githubusercontent.com/media/AlgorithmWiz/space-taxi/main/meshy_output/"+el.getAttribute(attr).replace("../",""));}}</script>')
print(json.dumps({'assets':len(records),'rigged':sum(any(m['kind']=='rigged' for m in r['models']) for r in records),'total_credits':sum(s['consumed_credits'] for r in records for s in r['stages'])}))
