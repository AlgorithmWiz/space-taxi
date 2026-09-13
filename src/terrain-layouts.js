// Hand-authored flight-space outlines, shared by rendering and collision checks.
// Shooting Stars follows the connected ledges and narrow lower passages in the C64 reference.
export const shootingStarsTerrain = [{points:[
  [-27,21],[-24,21],[-24,1.5],[-23,.5],[-22,0],[-16,0],[-17,-.6],[-19,-2.8],[-20,-3.8],[-20,-7.8],[-21.5,-9.5],[-22.5,-11],[-22.5,-12.5],
  [-16,-12.5],[-16,-10.5],[-14,-9.8],[-13,-8.8],[-12,-9.2],[-11,-8.9],[-10,-9.2],[-10,-7],[-11,-6],[-3,-6],[-2,-5.4],[-1,-4.5],
  [-3,-4],[-4,-3],[-5,-2],[-4,-1],[-4,0],[-3,1.3],[-2,2.5],[-1,3.2],[0,4],[1,4.2],[2,3.8],[3,4.1],[4,3.3],[4.5,2.5],[6,2.3],[7,1.1],[8,0],
  [7,-.6],[7,-1.3],[5,-2.3],[4,-3.4],[2,-4.2],[3,-5.3],[2,-6.5],[1,-7.5],[-1,-8.8],[-4,-10.2],[-7,-11.5],[-6,-12.5],
  [0,-12.5],[.6,-12],[1.2,-11.7],[2,-12.5],[9,-12.5],[10.2,-12],[11,-11],[11,-10],[9,-8.8],[8,-8.2],[8,-6.2],[9,-5.3],[10,-5.3],
  [10,-7.3],[16.5,-7.3],[17.5,-6],[18.3,-4],[19,-3],[19,-.5],[20,1],[21,1.5],[22,.5],[22,5.5],[23,6.5],[24,8],[24,21],[27,21],[27,-28],[-27,-28],
]}];

// Relief is cut into the wall, so existing connecting corridors retain their clearance.
export function caveWallOutline(o){
  const horizontal=o.w>=o.h,length=horizontal?o.w:o.h,thickness=horizontal?o.h:o.w;
  const n=Math.max(2,Math.ceil(length/.65)),points=[];
  for(const side of [-1,1])for(let i=0;i<=n;i++){
    const t=side===-1?i/n:1-i/n,along=(t-.5)*length;
    const cut=i===0||i===n?0:(.07+.11*(.5+.5*Math.sin(i*7.31+o.x*2+o.y)))*Math.min(1,thickness);
    const across=side*(thickness/2-cut);
    points.push(horizontal?[o.x+along,o.y+across]:[o.x+across,o.y+along]);
  }
  return {points};
}

export const snowGround = [{points:[[-100,-10.6],[-35,-10.3],[-24,-10],[-20,-10.15],[-17,-10],[-1,-10],[0,-10.25],[3,-10],[15,-10],[16,-10.18],[16.5,-10],[23.5,-10],[35,-10.4],[100,-10.6], [100,-90],[-100,-90]]}];

export function umbrellaHull(pad){
  const edge=Array.from({length:49},(_,i)=>{const x=-9.1+i*18.2/48,r=Math.abs(x);return [pad.x+x,pad.y-.035-(r<=pad.w/2?0:3.2*((r-pad.w/2)/(9.1-pad.w/2))**1.3)];});
  return {model:'umbrella',points:[...edge,...edge.slice().reverse().map(([x,y])=>[x,y-.14])]};
}
