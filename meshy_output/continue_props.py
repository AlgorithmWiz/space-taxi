import concurrent.futures,subprocess,threading,json
from pathlib import Path
root=Path(__file__).resolve().parent
stop=threading.Event()
names=['fuel-canister','radar-dish','landing-platform-enamel','obstacle-candy-cane','lollipop','landing-platform-cloud','landing-platform-lounger','landing-platform-parasol']
def run(name):
    if stop.is_set():return
    for action in ['create','wait','download','inspect']:
        p=subprocess.run(['python3',str(root/'continue_models.py'),name,'remesh',action],capture_output=True,text=True)
        if p.returncode:
            stop.set();print('STOP '+name+' '+action+' '+p.stderr,flush=True);return
        if action=='create':
            data=json.loads(p.stdout);print('REMESH '+name+' '+data['task_id']+' — waiting; usually several minutes',flush=True)
        elif action in ['wait','inspect']:print(p.stdout.strip(),flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    list(pool.map(run,names))
