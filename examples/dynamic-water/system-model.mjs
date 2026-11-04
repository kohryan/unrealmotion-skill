import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {waterSystemAt} from './runtime/story.mjs';
import {smoother,progress} from './runtime/motion.mjs';

export async function createModel(stage,config){
  const root=stage.group,parts={};
  const ink=new THREE.LineBasicMaterial({color:'#304954',transparent:true,opacity:.8});
  const material=color=>new THREE.MeshLambertMaterial({color});
  const palette={wall:material('#f1e8c8'),slab:material('#d6d8bd'),blue:material('#5d92ab'),pipe:material('#a1d6e3'),water:material('#73bdcf'),gold:material('#edce7c'),ground:material('#b5c79e'),soil:material('#d0b787'),pale:material('#e1efe5'),dark:material('#365563')};
  function add(geometry,mat,parent=root,position=[0,0,0],name,outline=true){const m=new THREE.Mesh(geometry,mat);m.position.set(...position);m.castShadow=true;m.receiveShadow=true;parent.add(m);if(name){m.name=name;parts[name]=m;}if(outline){const line=new THREE.LineSegments(new THREE.EdgesGeometry(geometry,35),ink);m.add(line);}return m;}
  const box=(s,m,p,pos,name)=>add(new RoundedBoxGeometry(...s,2,.018),m,p,pos,name);
  function cylinder(r,h,m,p,pos,name,arc=Math.PI*2){if(arc<Math.PI*2){m=m.clone();m.side=THREE.DoubleSide;}return add(new THREE.CylinderGeometry(r,r,h,48,1,arc<Math.PI*2,Math.PI/2,arc),m,p,pos,name);}
  const house=new THREE.Group();house.name='house';root.add(house);
  box([3.45,.14,1.65],palette.slab,house,[.65,-.12,-.05],'ground-floor');
  box([3.45,.12,1.65],palette.slab,house,[.65,2.02,-.05],'middle-floor');
  box([3.5,.16,1.75],palette.slab,house,[.65,4.15,-.05],'roof');
  box([3.35,4.25,.12],palette.wall,house,[.65,2.04,-.8],'back-wall');
  box([.12,4.25,1.65],palette.wall,house,[-1.05,2.04,-.05],'left-wall');
  box([.12,4.25,1.65],palette.wall,house,[2.35,2.04,-.05],'right-wall');
  box([.8,.85,.07],palette.pipe,house,[.45,2.96,-.7],'window');
  box([.025,.85,.08],palette.pale,house,[.45,2.96,-.64]);box([.8,.025,.08],palette.pale,house,[.45,2.96,-.64]);
  box([6.6,.16,2.0],palette.ground,root,[-.2,-.4,-.15],'ground');
  box([6.6,1.5,.15],palette.soil,root,[-.2,-1.23,-.9],'soil-section');
  box([6.6,1.45,.15],palette.water,root,[-.2,-2.7,-.9],'aquifer-section');
  const well=new THREE.Group();well.position.set(-2.65,-1.7,.9);root.add(well);parts.well=well;well.name='well';
  cylinder(.38,2.7,palette.wall,well,[0,0,0],'well-shell',Math.PI);
  cylinder(.32,.92,palette.water,well,[0,-.83,0],'well-water');
  box([.98,.17,.85],palette.slab,root,[-2.65,-.36,.9],'well-rim');
  const tank=new THREE.Group();tank.position.set(1.05,4.38,.2);root.add(tank);parts.tank=tank;tank.name='tank';
  box([1.7,.14,1.48],palette.wall,root,[1.05,4.31,.15],'tank-plinth');
  cylinder(.72,.1,palette.blue,tank,[0,0,0],'tank-base');
  cylinder(.72,1.44,palette.blue,tank,[0,.72,0],'tank-shell',Math.PI);
  const water=cylinder(.655,1,palette.water,tank,[0,.3,0],'tank-water');
  const float=add(new THREE.SphereGeometry(.1,20,12),palette.gold,tank,[.35,.6,.38],'float');
  cylinder(.012,1.3,palette.dark,tank,[.35,.7,.38],'float-guide');
  const pump=new THREE.Group();pump.position.set(-1.35,.3,1.0);root.add(pump);pump.name='pump';parts.pump=pump;
  box([1.1,.14,.9],palette.slab,root,[-1.35,-.2,1.0],'pump-plinth');
  const motor=cylinder(.28,.7,palette.blue,pump,[0,0,-.26],'motor');motor.rotation.x=Math.PI/2;
  for(let i=0;i<10;i++){const a=i*Math.PI/5;const fin=box([.045,.095,.55],palette.blue,pump,[Math.sin(a)*.275,Math.cos(a)*.275,-.25]);fin.rotation.z=-a;}
  box([.32,.16,.32],palette.blue,pump,[0,.36,-.15],'terminal');
  box([.13,.17,.45],palette.blue,pump,[-.22,-.29,-.1]);box([.13,.17,.45],palette.blue,pump,[.22,-.29,-.1]);
  const volute=cylinder(.4,.13,palette.blue,pump,[0,0,.12],'volute');volute.rotation.x=Math.PI/2;
  const casing=new THREE.Shape();casing.absarc(0,0,.4,0,Math.PI*2,false);const cavity=new THREE.Path();cavity.absarc(0,0,.345,0,Math.PI*2,true);casing.holes.push(cavity);
  add(new THREE.ExtrudeGeometry(casing,{depth:.2,bevelEnabled:false,curveSegments:48,steps:1}),palette.blue,pump,[0,0,.18],'volute-rim');
  const rotor=new THREE.Group();rotor.position.set(0,0,.23);pump.add(rotor);rotor.name='impeller';parts.impeller=rotor;
  const disk=cylinder(.3,.035,palette.gold,rotor,[0,0,0]);disk.rotation.x=Math.PI/2;
  for(let i=0;i<6;i++){
    const s=new THREE.Shape();s.moveTo(.08,-.018);s.quadraticCurveTo(.2,-.09,.29,-.025);s.lineTo(.275,.025);s.quadraticCurveTo(.19,-.025,.08,.028);s.closePath();
    const blade=add(new THREE.ExtrudeGeometry(s,{depth:.045,bevelEnabled:true,bevelSize:.006,bevelThickness:.006,bevelSegments:2,steps:1}),palette.gold,rotor,[0,0,.025],`blade-${i}`);blade.rotation.z=i*Math.PI/3;
  }
  const hub=cylinder(.075,.07,palette.dark,rotor,[0,0,.045]);hub.rotation.x=Math.PI/2;
  const cover=new THREE.Group();cover.position.set(0,0,.38);pump.add(cover);parts.cover=cover;cover.name='cover';
  const ring=add(new THREE.RingGeometry(.105,.38,48),palette.gold,cover,[0,0,0],'cover-face');ring.material.side=THREE.DoubleSide;
  add(new THREE.TorusGeometry(.38,.025,8,48),palette.gold,cover,[0,0,0]);add(new THREE.TorusGeometry(.105,.016,8,36),palette.dark,cover,[0,0,0]);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;add(new THREE.SphereGeometry(.018,8,6),palette.dark,cover,[Math.sin(a)*.335,Math.cos(a)*.335,.02]);}
  function pipe(id,points){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),false,'centripetal');const tube=add(new THREE.TubeGeometry(curve,100,.085,12,false),palette.pipe,root,[0,0,0],id);const dots=Array.from({length:16},(_,i)=>add(new THREE.SphereGeometry(.038,10,6),palette.water,root,[0,0,0],undefined,false));return {id,curve,tube,dots};}
  const suction=pipe('suction',[[-2.65,-2.65,1.02],[-2.65,-.15,1.02],[-2.2,.3,1.25],[-1.35,.3,1.55],[-1.35,.3,1.32]]);
  const inlet=pipe('fill-pipe',[[-1.03,.48,1.08],[-.72,.58,1.08],[-.72,1.1,1.08],[-.72,5.5,.5],[-.65,5.7,.35],[.4,5.7,.2],[.55,5.6,.2]]);
  const outlet=pipe('outlet-pipe',[[1.72,4.55,.2],[2.65,4.55,.2],[2.72,4.15,.8],[2.72,.65,1.03],[2.1,.48,1.03]]);
  const tap=cylinder(.09,.3,palette.slab,root,[2.06,.48,1.03],'tap');tap.rotation.z=Math.PI/2;
  cylinder(.025,.24,palette.dark,root,[2.09,.63,1.03]);box([.27,.04,.06],palette.slab,root,[2.09,.77,1.03],'tap-handle');
  const stream=cylinder(.025,.45,palette.water,root,[1.94,.12,1.03],'tap-stream');
  const internal=Array.from({length:12},()=>add(new THREE.SphereGeometry(.016,8,6),palette.water,pump,[0,0,.31],undefined,false));
  const falling=cylinder(.025,1,palette.water,root,[.55,5.2,.2],'tank-inlet-stream');
  stage.label({node:pump,offset:[-.27,.65,-.15],text:'MOTOR',beats:['impeller']});
  stage.label({node:pump,offset:[-.05,-.55,.35],text:'IMPELLER',beats:['pressure']});
  const status=stage.label({node:tank,offset:[0,1.82,0],text:'KONTROL LEVEL',beats:['control','demand','restart','recap']});
  let system,coverOpen=0;
  function flow(path,travel,active){for(let i=0;i<path.dots.length;i++){const p=path.curve.getPointAt((travel*.23+i/path.dots.length)%1);p.z+=.09;path.dots[i].position.copy(p);path.dots[i].visible=active>.02;path.dots[i].scale.setScalar(Math.max(.01,active));}}
  function update(seconds,u){
    const t=seconds/config.duration*60;system=waterSystemAt(t);
    rotor.rotation.z=-system.impellerAngle*Math.PI/180;
    const axial=smoother(progress(t,9.2,10))-smoother(progress(t,21.4,22));
    const lateral=smoother(progress(t,10,10.8))-smoother(progress(t,20.8,21.4));
    cover.position.set(lateral*.88,0,.38+axial*.65);coverOpen=axial;
    const height=.05+system.level*1.24;water.scale.y=height;water.position.y=.07+height/2;float.position.y=.07+height+.07;
    const surface=4.38+.07+height;falling.scale.y=Math.max(.01,5.6-surface);falling.position.y=(5.6+surface)/2;falling.visible=system.pump>.02;
    internal.forEach((dot,i)=>{const v=(system.travel*.8+i/internal.length)%1,a=i%6*Math.PI/3-v*1.4;dot.position.set(Math.cos(a)*v*.3,Math.sin(a)*v*.3,.31);dot.visible=coverOpen>.8&&system.pump>.02;});
    flow(suction,system.travel,system.pump);flow(inlet,system.travel,system.pump);flow(outlet,system.drawTravel,system.draw);stream.visible=system.draw>.02;stream.scale.y=Math.max(.01,system.draw);
    status.textContent=system.pump>.5?'POMPA AKTIF':'POMPA MATI';status.style.background=system.pump>.5?'#305e68':'#5c6361';
  }
  function inspect(){return {system,coverOpen,coverAlignmentError:cover.position.distanceTo(new THREE.Vector3(0,0,.38)),coverAxialGap:Math.abs(cover.position.z-(.18+.2)),parts:Object.keys(parts),impellerBlades:6,referenceUsed:'assets/overview.png',modelKind:'named-threejs-volumes',waterHeight:water.scale.y,floatHeight:float.position.y};}
  return {update,inspect};
}
