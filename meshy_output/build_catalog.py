import pathlib,json,struct,html
from PIL import Image,ImageDraw
root=pathlib.Path(__file__).resolve().parent
rows=[]
for sf in root.glob('*-state.json'):
    s=json.loads(sf.read_text())
    if not s.get('complete'): continue
    p=pathlib.Path(s['model']); b=p.read_bytes()
    magic,version,total=struct.unpack_from('<4sII',b)
    size,kind=struct.unpack_from('<II',b,12)
    g=json.loads(b[20:20+size])
    s['valid_glb']=magic==b'glTF' and version==2 and total==len(b)
    s['triangles']=sum(g['accessors'][pr['indices']]['count']//3 for m in g.get('meshes',[]) for pr in m['primitives'] if 'indices' in pr)
    s['bytes']=len(b)
    task=json.loads((pathlib.Path(s['project'])/('task_'+s['task_id']+'.json')).read_text())
    s['consumed_credits']=task.get('consumed_credits',task.get('result',{}).get('task',{}).get('consumed_credits'))
    rows.append(s)
rows.sort(key=lambda x:x['id'])
(root/'catalog.json').write_text(json.dumps(rows,indent=2))
cards=[]
for s in rows:
    rel=pathlib.Path(s['model']).relative_to(root)
    prev=pathlib.Path(s['preview']).relative_to(root) if s.get('preview') else ''
    cards.append(f'<article><img src="{html.escape(str(prev))}"><h2>{html.escape(s["id"])}</h2><p>{s["triangles"]:,} triangles · {s["bytes"]/1048576:.1f} MiB</p><a href="{html.escape(str(rel))}" download>Download GLB</a><p class="task">image-to-3d: {s["task_id"]}</p></article>')
(root/'index.html').write_text('<!doctype html><meta charset="utf-8"><title>Space Taxi — Meshy models</title><style>body{background:#10151e;color:#edf1fa;font:16px system-ui;margin:40px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:20px}article{background:#202a37;padding:20px;border-radius:16px}img{width:100%;aspect-ratio:1;object-fit:contain}h2{font-size:18px}a{color:#94d5ff}.task{font-size:11px;overflow-wrap:anywhere}</style><h1>Space Taxi — Meshy models</h1><p>Detailed textured source models. Optimization and character rigging have not been performed.</p><main>'+''.join(cards)+'</main>')
for offset in range(0,len(rows),12):
    group=rows[offset:offset+12]; sheet=Image.new('RGB',(1200,((len(group)+3)//4)*330),'#10151e'); draw=ImageDraw.Draw(sheet)
    for i,s in enumerate(group):
        if s.get('preview'):
            im=Image.open(s['preview']).convert('RGBA'); im.thumbnail((290,290)); x=(i%4)*300+(300-im.width)//2;y=(i//4)*330
            sheet.paste(im,(x,y),im)
        draw.text(((i%4)*300+8,(i//4)*330+295),s['id'],fill='white')
    sheet.save(root/f'preview-sheet-{offset//12+1}.jpg',quality=90)
print(json.dumps({'completed':len(rows),'credits_reported':sum(s['consumed_credits'] or 0 for s in rows),'invalid_glbs':[s['id'] for s in rows if not s['valid_glb']]}))
