import json,pathlib,sys,struct
from generate_batch import call,ROOT

name,stage,action=sys.argv[1:4]
assert name in ('taxi-classic','passenger-nova-botanist','passenger-juno-courier')
assert stage in ('remesh','rigging')
source=next(s for s in json.loads((ROOT/'catalog.json').read_text()) if s['id']==name)
project=pathlib.Path(source['project'])
statefile=ROOT/(name+'-optimization.json')
state=json.loads(statefile.read_text()) if statefile.exists() else {'id':name,'project':str(project),'source_task_id':source['task_id']}
entry=state.setdefault(stage,{})
def save():statefile.write_text(json.dumps(state,indent=2))
def run(args,label):return call(args,ROOT/(name+'-'+stage+'-'+label+'.json'))
if action=='create':
    if entry.get('task_id'):print(json.dumps(entry));sys.exit()
    _,balance=run(['balance'],'balance')
    assert balance['result']['balance']>=5,'Insufficient credits'
    args=[stage,'create']
    if stage=='remesh':
        args+=['--input-task-id',source['task_id'],'--topology','triangle','--target-polycount','15000' if name=='taxi-classic' else '10000','--target-formats','glb']
    else:
        assert state['remesh'].get('verified_for_rigging'),'Inspect remesh before rigging'
        args+=['--input-task-id',state['remesh']['task_id'],'--height-meters','1.7']
    _,data=run(args+['--async','--project',str(project),'--stage',stage,'--operation-id','space-taxi-'+name+'-'+stage+'-v1'],'submission')
    entry['task_id']=data['result']['submission']['task_id'];save();print(json.dumps({'id':name,'stage':stage,'task_id':entry['task_id']}))
elif action=='wait':
    task=entry['task_id']
    while True:
        code,data=run([stage,'wait',task,'--timeout','600','--project',str(project),'--stage',stage],'wait')
        if code!=8:break
    entry['consumed_credits']=data['result']['task'].get('consumed_credits');entry['status']=data['result']['task']['status'];save()
    print(json.dumps({'id':name,'stage':stage,'status':entry['status'],'credits':entry['consumed_credits']}))
elif action=='download':
    taskjson=project/('task_'+entry['task_id']+'.json')
    _,listing=run(['download','--task-json',str(taskjson),'--list'],'assets')
    entry['files']=entry.get('files',{})
    selections={'optimized':'model.glb'} if stage=='remesh' else {'rigged':'result.rigged_character_glb_url','walking':'result.basic_animations.walking_glb_url','running':'result.basic_animations.running_glb_url'}
    if 'thumbnail.primary' in json.dumps(listing):selections[stage+'-preview']='thumbnail.primary'
    for kind,key in selections.items():
        if key not in json.dumps(listing):continue
        path=project/(name+'-'+kind+('.png' if kind.endswith('preview') else '.glb'))
        if not path.exists():run(['download','--task-json',str(taskjson),'--asset',key,'--output',str(path),'--project',str(project),'--stage',stage],kind+'-download')
        entry['files'][kind]=str(path)
    save();print(json.dumps({'id':name,'stage':stage,'files':entry['files']}))
elif action=='inspect':
    path=pathlib.Path(entry['files']['optimized']);b=path.read_bytes();magic,v,total=struct.unpack_from('<4sII',b);l,t=struct.unpack_from('<II',b,12);g=json.loads(b[20:20+l])
    assert magic==b'glTF' and total==len(b)
    triangles=sum(g['accessors'][p['indices']]['count']//3 for m in g['meshes'] for p in m['primitives'])
    textured=any('baseColorTexture' in m.get('pbrMetallicRoughness',{}) for m in g.get('materials',[]))
    entry.update(triangles=triangles,bytes=len(b),textured=textured)
    assert triangles<=300000 and textured
    entry['verified_for_rigging']=True;save();print(json.dumps({'id':name,'triangles':triangles,'textured':textured,'MiB':round(len(b)/1048576,2)}))
