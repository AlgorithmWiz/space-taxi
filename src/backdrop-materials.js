import * as THREE from 'three';
import {artFor} from './art-direction.js';

// Locally rendered matte scenery: no extra image downloads and no collision shapes.
// Broad lighting and worn surfaces match the imported brass, stone and painted metal.
export function interiorBackdrop(level){
  const art=artFor(level),wood=['pong','moving'].includes(level.theme),stone=['puzzle','museum'].includes(level.theme);
  return new THREE.ShaderMaterial({
    depthWrite:true,
    uniforms:{base:{value:new THREE.Color(art.horizon)},accent:{value:new THREE.Color(art.accent)},kind:{value:wood?1:stone?2:0}},
    vertexShader:'varying vec2 vBackdropUV;void main(){vBackdropUV=position.xy/vec2(110.,75.)+.5;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec2 vBackdropUV;uniform vec3 base;uniform vec3 accent;uniform float kind;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
      void main(){
        vec2 p=vBackdropUV-.5;float grain=noise(vBackdropUV*380.)*.035+noise(vBackdropUV*35.)*.04;
        float light=exp(-dot(p*vec2(2.5,1.3),p*vec2(2.5,1.3)))*.32;
        vec3 c=base*(.32+light+grain);
        vec2 grid=fract(vBackdropUV*vec2(kind==1.?32.:9.,kind==2.?10.:4.));
        float seam=kind==1.?step(.988,grid.x):max(step(.993,grid.x),step(.992,grid.y));
        c*=1.-seam*.18;
        float bays=abs(fract(vBackdropUV.x*5.)-.5);
        float glow=exp(-pow((vBackdropUV.y-.68)*23.,2.))*pow(max(0.,1.-bays*2.),10.);
        c+=accent*glow*.18;
        float side=exp(-pow((abs(p.x)-.22)*35.,2.))*smoothstep(.25,.7,vBackdropUV.y);
        c+=accent*side*.035;
        c*=1.-smoothstep(.16,.65,length(p))*.5;
        gl_FragColor=vec4(c,1.);
      }`,
  });
}
export function landscapeMaterial(color){
  return new THREE.ShaderMaterial({uniforms:{tint:{value:new THREE.Color(color)}},
    vertexShader:'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec3 p;uniform vec3 tint;void main(){
      float ridges=sin(p.x*.31+p.y*.13)*sin(p.x*.09-p.y*.24);
      float layers=sin(p.x*.14+p.y*.5)*.035;
      vec3 c=tint*(.84+ridges*.12+layers);
      c=mix(c,tint*1.22,smoothstep(-30.,8.,p.y)*.32);
      gl_FragColor=vec4(c,1.);
    }`,
  });
}
