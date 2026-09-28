"""Build the local image index and ZIP after the image-generation batch finishes."""
from pathlib import Path
import json,html,zipfile
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[1]
out=root/'output/meshy-redesigns'
catalog=json.loads((root/'output/meshy-references/catalog.json').read_text())
items=[a for a in catalog if (out/(a['id']+'.png')).exists()]
cards=[]
for a in items:
 name=a['id'].replace('-',' ').title();file=a['id']+'.png'
 with Image.open(out/file) as im:
  im.verify()
 cards.append(f'<article data-name="{html.escape(name.lower())}"><a href="{file}"><img loading="lazy" src="{file}" alt="{name}"></a><h2>{name}</h2><p>{a["category"]}</p><a class="download" href="{file}" download>Download PNG</a></article>')
page='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Space Taxi — Meshy references</title><style>
*{box-sizing:border-box}body{margin:0;background:#12171d;color:#edf0f2;font:16px system-ui,sans-serif}header,main{max-width:1500px;margin:auto;padding:32px}h1{font-size:clamp(28px,4vw,48px);margin:0 0 12px}header p{color:#b7c1cd;line-height:1.6;max-width:850px}input{font:inherit;width:min(100%,500px);padding:14px;border:1px solid #7c8997;border-radius:6px;background:#202b37;color:white}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:22px;padding-top:0}article{overflow:hidden;background:#202b37;border-radius:8px;padding-bottom:22px}img{display:block;width:100%;aspect-ratio:1;object-fit:contain;background:#eaeae8}h2{font-size:17px;margin:18px 16px 8px}article p{font-size:13px;color:#bec7d1;margin:8px 16px 20px}.download{margin:16px;color:#bce879}a:focus-visible,input:focus-visible{outline:3px solid #bce879;outline-offset:3px}[hidden]{display:none}
</style><header><h1>Space Taxi / Model references</h1><p>COUNT detailed redesigns, each supplied as a separate PNG. Choose an individual image for your Meshy model. These are new design references; the game's current models remain unchanged.</p><label for="search">Find a model</label><br><br><input id="search" type="search" placeholder="Taxi, passenger, radar, tree…"><p><a style="color:#bce879" href="prompts.json">Generation prompts</a> · <a style="color:#bce879" href="README.md">Readme</a></p></header><main>CARDS</main><script>document.querySelector('#search').addEventListener('input',e=>{const q=e.target.value.toLowerCase();document.querySelectorAll('article').forEach(a=>a.hidden=!a.dataset.name.includes(q))})</script></html>'''.replace('COUNT',str(len(items))).replace('CARDS',''.join(cards))
(out/'index.html').write_text(page)
(out/'README.md').write_text(f'''# Space Taxi — detailed model redesigns

{len(items)} individual PNG reference images, created with the built-in image generation tool from renders of this project's procedural Three.js models.

Open `index.html` to browse and download individual images. Upload the PNG for the desired object to Meshy. The reference images show proposed higher-detail designs, not finished meshes. The original game code and models have not been replaced.

## Contents

- Six taxi paint variants and six passenger characters.
- Reusable props, landing surfaces, obstacles, hazards and connected terrain assemblies.
- `prompts.json`: exact generation prompts.
- `catalog.json`: model identifiers and source-code mappings.

Each PNG shows one isolated object or connected assembly against a neutral studio background. These are single-view concepts, not calibrated multiview reconstructions. Vehicle variants can have small geometry differences; use one chosen variant as your base mesh if you want a shared vehicle geometry.

Repeated placements and size-only duplicates are represented by one reference per model/material family. Particle effects, UI labels and complete background scenes are excluded. Terrain images depict connected assemblies; modular pieces may need separate modeling.

Original unenhanced reference renders are preserved in the sibling `meshy-references` directory for comparison. No Meshy generations were submitted.
''')
(out/'catalog.json').write_text(json.dumps(items,indent=2))
for start in range(0,len(items),24):
 batch=items[start:start+24];sheet=Image.new('RGB',(1440,((len(batch)+5)//6)*280),'#eeeeeb');d=ImageDraw.Draw(sheet)
 for i,a in enumerate(batch):
  with Image.open(out/(a['id']+'.png')) as im:
   im.thumbnail((235,235));x=i%6*240;y=i//6*280;sheet.paste(im,(x,y));d.text((x+5,y+238),a['id'].replace('-','\n',1),fill='#18232b')
 sheet.save(out/f'overview-{start//24+1}.jpg',quality=92)
with zipfile.ZipFile(root/'output/space-taxi-meshy-redesigns.zip','w',zipfile.ZIP_STORED) as z:
 for p in sorted(out.iterdir()):
  if p.is_file():z.write(p,'meshy-redesigns/'+p.name)
print(f'Packaged {len(items)}/{len(catalog)} assets')
print('Missing:',[a['id'] for a in catalog if not (out/(a['id']+'.png')).exists()])
