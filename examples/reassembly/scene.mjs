import * as THREE from 'three';
import {createStudio, mesh, box, metal, matte, createCopy} from './runtime/studio.mjs';
import {createReassembly} from './runtime/reassembly.mjs';
import {microSurface, contactShadow} from './runtime/surfaces.mjs';
import {progress, smoother} from './runtime/motion.mjs';

const TAU=Math.PI*2, pitch=1.57, ballRadius=0.18, count=18;

function raceProfile(upper) {
  const inner=upper?1.34:1.08;
  const p=[[inner,0.025],[inner+0.025,0],[2.075,0],[2.1,0.025],[2.1,0.235],[2.075,0.26],[1.77,0.26]];
  // Concave raceway: a plausible visual clearance, not a certified bearing/CAD specification.
  for(let i=0;i<=32;i++) {const r=1.74-(1.74-1.40)*i/32;p.push([r,0.36-Math.sqrt(Math.max(0,0.2**2-(r-pitch)**2))]);}
  if(upper)p.push([1.37,0.26],[inner,0.235],[inner,0.025]);
  else p.push([1.37,0.26],[1.31,0.26],[1.31,0.6],[1.29,0.62],[1.10,0.62],[1.08,0.6],[1.08,0.025]);
  return p;
}
function race(parent,material,upper=false) {
  const group=new THREE.Group();parent.add(group);
  const profile=raceProfile(upper).map(([r,y])=>new THREE.Vector2(r,upper?0.68-y:y));
  if(upper)profile.reverse();
  mesh(new THREE.LatheGeometry(profile,160),material,group);
  for(const r of [upper?1.39:1.14,2.02]) {
    const line=mesh(new THREE.TorusGeometry(r,0.008,8,160),metal('#53616a',0.44),group,[0,upper?0.682:0.262,0]);line.rotation.x=Math.PI/2;
  }
  if(upper)for(let i=0;i<8;i++){const a=i/8*TAU;const mark=box([0.14,0.003,0.08],matte('#344047',0.65),group,[Math.cos(a)*1.96,0.683,Math.sin(a)*1.96],0.002);mark.rotation.y=-a;}
  return group;
}
function cageGeometry() {
  const shape=new THREE.Shape();shape.absarc(0,0,1.9,0,TAU,false);
  const bore=new THREE.Path();bore.absarc(0,0,1.34,0,TAU,true);shape.holes.push(bore);
  for(let i=0;i<count;i++) {const a=i/count*TAU,h=new THREE.Path();h.absarc(Math.cos(a)*pitch,Math.sin(a)*pitch,0.205,0,TAU,true);shape.holes.push(h);}
  return new THREE.ExtrudeGeometry(shape,{depth:0.075,bevelEnabled:true,bevelSize:0.007,bevelThickness:0.007,bevelSegments:2,curveSegments:48,steps:1});
}

export async function createScene(config) {
  const studio=createStudio(config,{radius:10.5,target:[-0.55,1.7,0],background:'#10161b',floor:'#1b242b',exposure:1.08});
  const {group,scene,camera}=studio;group.position.set(0.9,0.18,0);
  const steel=metal('#626f77',0.36),brass=metal('#a78b54',0.33),polished=metal('#a9b6bf',0.17);
  steel.roughnessMap=microSurface(config.seed,true);steel.bumpMap=steel.roughnessMap;steel.bumpScale=0.0015;
  brass.roughnessMap=microSurface(config.seed+1,true);
  mesh(new THREE.CylinderGeometry(2.5,2.55,0.18,128),matte('#1c2930',0.42),scene,[0.9,0.09,0]);
  contactShadow(scene,{x:0.9,y:0.006,width:6.5,depth:5.5,opacity:0.42});
  contactShadow(group,{y:0.003,width:4.4,depth:4.4,opacity:0.45});
  const lower=race(group,steel,false),upper=race(group,steel,true);
  lower.name='lower-race';upper.name='upper-race';
  const carrier=new THREE.Group();carrier.name='ball-cage-assembly';group.add(carrier);
  const cage=mesh(cageGeometry(),brass,carrier,[0,0.3025,0]);cage.rotation.x=-Math.PI/2;cage.name='brass-separator';
  const parts=[{id:'cage-and-balls',node:carrier,offset:[0,1.1,0],start:0.34,end:0.58},{id:'upper-race',node:upper,offset:[0,2.65,0],start:0.61,end:0.84}];
  const balls=[];
  const sphere=new THREE.SphereGeometry(ballRadius,40,28);
  for(let i=0;i<count;i++) {
    const a=i/count*TAU;
    const ball=mesh(sphere,polished,carrier,[Math.cos(a)*pitch,0.34,Math.sin(a)*pitch]);ball.name=`ball-${i+1}`;
    balls.push({ball,axis:new THREE.Vector3(-Math.sin(a),0,Math.cos(a))});
    parts.push({id:ball.name,node:ball,offset:[0,0.62,0],start:0.07+i*0.004,end:0.23+i*0.004});
  }
  const assembly=createReassembly(parts);
  const copy=createCopy(config,config.copy||[['Dari detail.\nMenjadi utuh.','Komponen tetap. Gerak terarah.'],['Setiap komponen.\nSatu sistem.','Presisi bertemu ritme.'],['Presisi yang\nbergerak.','THRUST / Studi reassembly konseptual']],'THRUST / REASSEMBLY');
  return {...studio,
    update(t,u) {
      studio.cameraAt(u);camera.position.y+=2.6;
      const close=smoother(progress(u,0.58,1)),focus=new THREE.Vector3(-0.55,1.7-0.75*close,0);
      camera.position.lerp(focus,0.18*close);camera.lookAt(focus);
      assembly.update(u);group.rotation.y=-0.14+0.1*smoother(u);
      const spin=0.95*progress(u,0.84,1)**3;
      upper.rotation.y=spin;carrier.rotation.y=spin/2;
      for(const {ball,axis} of balls)ball.quaternion.setFromAxisAngle(axis,spin*pitch/(2*ballRadius));
      copy(u*0.999999);
    },
    inspect(){return {...studio.inspect(),parts:assembly.inspect(),motion:{profile:'sequential-axial-reassembly',clearance:'visual approximation',partCount:count+3}};}
  };
}
