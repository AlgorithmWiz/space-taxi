import json, subprocess, pathlib, concurrent.futures, threading

ROOT = pathlib.Path(__file__).resolve().parent
REF = ROOT.parent / 'output/meshy-redesigns'
CLI = ['npm', 'exec', '--yes', '--package=meshy-cli@0.4.0', '--', 'meshy']
FLAGS = ['--workspace', str(ROOT), '--output-schema', 'v1', '--format', 'json', '--no-update-check']
LOCK = threading.Lock()
STOP = threading.Event()

def call(args, log):
    p = subprocess.run(CLI + args + FLAGS, capture_output=True, text=True)
    log.write_text(p.stdout)
    try: data = json.loads(p.stdout)
    except ValueError: raise RuntimeError(f'Unparseable response: {log.name}; exit {p.returncode}')
    if p.returncode == 9: STOP.set()
    if p.returncode not in (0, 8):
        STOP.set()
        raise RuntimeError(f'CLI failed: {log.name}; exit {p.returncode}; {data.get("error")}')
    return p.returncode, data

def run(asset):
    name = asset['id']
    statefile = ROOT / (name + '-state.json')
    state = json.loads(statefile.read_text()) if statefile.exists() else {'id': name, 'resource': 'image-to-3d'}
    def save(): statefile.write_text(json.dumps(state, indent=2))
    if state.get('complete'): return state
    if not state.get('task_id'):
        with LOCK:
            if STOP.is_set(): return
            _, balance = call(['balance'], ROOT / 'balance-latest.json')
            if balance['result']['balance'] < 30:
                STOP.set(); raise RuntimeError('Balance below estimated next job cost')
            args = ['image-to-3d', 'create', '--image-url', str(REF / (name + '.png')), '--model-type', 'standard', '--should-texture', 'true', '--enable-pbr', 'true', '--texture-resolution', '4k', '--target-formats', 'glb', '--async', '--operation-id', 'space-taxi-redesign-' + name]
            if asset.get('category') == 'Passengers': args += ['--pose-mode', 'a-pose']
            _, data = call(args, ROOT / (name + '-submission.json'))
            state['task_id'] = data['result']['submission']['task_id']; save()
    task = state['task_id']
    if not state.get('project'):
        with LOCK:
            _, data = call(['project', 'init', '--root', str(ROOT), '--name', name, '--task-id', task, '--task-type', 'image-to-3d'], ROOT / (name + '-project.json'))
            state['project'] = data['result']['project_dir']; save()
    project = pathlib.Path(state['project'])
    print(f'BUILD {name} {task}: waiting for textured image-to-3d generation (typically several minutes)', flush=True)
    while True:
        code, data = call(['image-to-3d', 'wait', task, '--timeout', '600', '--project', str(project), '--stage', 'build'], ROOT / (name + '-wait.json'))
        if code != 8: break
        print(f'WAIT RESUMED {name} {task}', flush=True)
    taskjson = project / ('task_' + task + '.json')
    _, listing = call(['download', '--task-json', str(taskjson), '--list'], ROOT / (name + '-assets.json'))
    model = project / (name + '.glb')
    if not model.exists(): call(['download', '--task-json', str(taskjson), '--model-format', 'glb', '--output', str(model), '--project', str(project), '--stage', 'delivered'], ROOT / (name + '-download.json'))
    preview = project / 'preview.png'
    if 'thumbnail.primary' in json.dumps(listing) and not preview.exists():
        call(['download', '--task-json', str(taskjson), '--asset', 'thumbnail.primary', '--output', str(preview), '--project', str(project), '--stage', 'preview'], ROOT / (name + '-preview.json'))
    state.update(complete=True, model=str(model), preview=str(preview) if preview.exists() else None); save()
    print('COMPLETE ' + name, flush=True)
    return state

if __name__ == '__main__':
    catalog = json.loads((REF / 'catalog.json').read_text())
    selected = [a for a in catalog if a['id'] == 'taxi-classic' or a['category'] != 'Vehicles'][:36]
    (ROOT / 'batch-plan.json').write_text(json.dumps({'estimated_credits':1080,'selected':selected,'deferred':[a for a in catalog if a not in selected]}, indent=2))
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        futures = [pool.submit(run, a) for a in selected]
        for f in concurrent.futures.as_completed(futures):
            try: f.result()
            except Exception as e: STOP.set(); print('STOP: ' + str(e), flush=True)
