import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS} from '../src/levels.js';
import {padPose,intersectsRect,intersectsPolygon,obstaclePose} from '../src/environment.js';

// A conservative cabin-sized flood fill checks spatial reachability. Dynamic doors
// are treated as open here; their timing, switch states and collisions are tested
// separately. Portal edges are part of the navigation graph.
test('all 28 layouts connect the spawn, every pad, switches, and the exit',()=>{
  const failures=[],step=.5,minX=-23,minY=-12,nx=93,ny=58;
  for(const level of LEVELS){
    const pads=level.pads.map(p=>({...p,...padPose(p,60)}));
    const solids=[...level.obstacles.map(o=>obstaclePose(o,60)),...pads.map(p=>({x:p.x,y:p.y-(p.depth||.64)/2,w:p.w,h:p.depth||.64}))];
    const safe=(x,y)=>!solids.some(o=>intersectsRect(x,y,o))&&!(level.terrain||[]).some(o=>intersectsPolygon(x,y,o));
    const free=new Uint8Array(nx*ny),visited=new Uint8Array(nx*ny);
    for(let iy=0;iy<ny;iy++)for(let ix=0;ix<nx;ix++)free[iy*nx+ix]=safe(minX+ix*step,minY+iy*step)?1:0;
    const near=(x,y,r=1)=>{const out=[];for(let iy=Math.max(0,Math.floor((y-r-minY)/step));iy<Math.min(ny,Math.ceil((y+r-minY)/step)+1);iy++)for(let ix=Math.max(0,Math.floor((x-r-minX)/step));ix<Math.min(nx,Math.ceil((x+r-minX)/step)+1);ix++){const id=iy*nx+ix;if(free[id]&&Math.hypot(minX+ix*step-x,minY+iy*step-y)<=r)out.push(id);}return out;};
    const spawn=level.spawn||{x:pads[0].x,y:pads[0].y+.9};
    const starts=near(spawn.x,spawn.y,.8),queue=[...starts];for(const id of starts)visited[id]=1;
    const portalEdges=new Map();
    for(const portal of level.portals||[]){const dest=level.portals[portal.to],targets=near(dest.x,dest.y,.7);for(const id of near(portal.x,portal.y,1.2))portalEdges.set(id,targets);}
    for(let cursor=0;cursor<queue.length;cursor++){
      const id=queue[cursor],ix=id%nx,iy=Math.floor(id/nx),neighbors=[];
      if(ix>0)neighbors.push(id-1);if(ix<nx-1)neighbors.push(id+1);if(iy>0)neighbors.push(id-nx);if(iy<ny-1)neighbors.push(id+nx);
      if(portalEdges.has(id))neighbors.push(...portalEdges.get(id));
      for(const n of neighbors)if(free[n]&&!visited[n]){visited[n]=1;queue.push(n);}
    }
    for(const p of pads){let reachable=false;for(let x=p.x-p.w/2+1.1;x<=p.x+p.w/2-1.1;x+=.3)if(near(x,p.y+.95,.7).some(id=>visited[id])){reachable=true;break;}if(!reachable)failures.push(`${level.number} ${level.name}: pad ${p.id} unreachable`);}
    for(const s of level.switches||[])if(!near(s.x,s.y,1.2).some(id=>visited[id]))failures.push(`${level.number}: switch ${s.label} unreachable`);
    if(!near(0,15.5,2).some(id=>visited[id]))failures.push(`${level.number}: exit unreachable`);
    if(!safe(spawn.x,spawn.y))failures.push(`${level.number}: spawn overlaps scenery`);
  }
  assert.deepEqual(failures,[]);
});
