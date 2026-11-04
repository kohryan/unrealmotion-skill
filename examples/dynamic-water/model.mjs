import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {createModel as createSystem,mechanismAt} from './system-model.mjs';
import {createReassembly} from './runtime/reassembly.mjs';
import {smoother,progress} from './runtime/motion.mjs';
import {createDataGraphic} from './runtime/dataviz.mjs';

export async function createModel(stage,config){
  const systemRoot=stage.sceneRoot('system'),meterRoot=stage.sceneRoot('meter');
  const system=await createSystem({...stage,group:systemRoot},{...config,duration:32});
  const material=color=>new THREE.MeshLambertMaterial({color});
  const palette={blue:material('#6597ad'),pipe:material('#a1d6e3'),gold:material('#edce7c'),cream:material('#f1e8c8'),ink:material('#365563'),water:material('#73bdcf')};
  const edge=new THREE.LineBasicMaterial({color:'#304954',transparent:true,opacity:.55});
  const parts={};
  function mesh(name,geo,mat,parent=meterRoot,pos=[0,0,0],outline=true){const m=new THREE.Mesh(geo,mat);m.name=name;m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;parent.add(m);parts[name]=m;if(outline)m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo,32),edge));return m;}
  const box=(name,size,mat,parent,pos)=>mesh(name,new RoundedBoxGeometry(...size,3,.05),mat,parent,pos);
  function roundRect(w,h,r){const s=new THREE.Shape();s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);return s;}
  const housing=roundRect(2.8,1.8,.25),hole=new THREE.Path();hole.absarc(0,0,.66,0,Math.PI*2,true);housing.holes.push(hole);
  mesh('meter-housing',new THREE.ExtrudeGeometry(housing,{depth:.65,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:2,steps:1,curveSegments:36}),palette.blue,meterRoot,[0,0,-.32]);
  mesh('meter-rear-chamber',new THREE.CylinderGeometry(.65,.65,.045,48).rotateX(Math.PI/2),palette.ink,meterRoot,[0,0,-.31]);
  box('meter-base',[3.5,.16,1.20],palette.cream,meterRoot,[0,-1.14,0]);
  for(const sign of [-1,1]){
    box('meter-foot-'+sign,[.5,.24,.70],palette.blue,meterRoot,[sign*.84,-.96,0]);
    const pipeShape=new THREE.Shape();pipeShape.absarc(0,0,.24,0,Math.PI*2,false);const bore=new THREE.Path();bore.absarc(0,0,.17,0,Math.PI*2,true);pipeShape.holes.push(bore);
    mesh('meter-pipe-'+sign,new THREE.ExtrudeGeometry(pipeShape,{depth:1.45,bevelEnabled:false,curveSegments:32,steps:1}).rotateY(Math.PI/2),palette.pipe,meterRoot,[sign<0?-2.85:1.4,0,0]);
    mesh('meter-flange-'+sign,new THREE.CylinderGeometry(.34,.34,.14,40).rotateZ(Math.PI/2),palette.blue,meterRoot,[sign*1.44,0,0]);
  }
  box('display-neck',[.43,.34,.34],palette.blue,meterRoot,[0,1.00,-.03]);
  box('meter-display',[1.5,.68,.28],palette.cream,meterRoot,[0,1.38,-.03]);
  const screen=box('display-screen',[1.2,.42,.025],palette.ink,meterRoot,[0,1.38,.125]);
  const rotor=new THREE.Group();rotor.name='meter-rotor';rotor.position.set(0,0,.02);meterRoot.add(rotor);
  const rotorShape=new THREE.Shape();rotorShape.absarc(0,0,.53,0,Math.PI*2,false);const rotorBore=new THREE.Path();rotorBore.absarc(0,0,.105,0,Math.PI*2,true);rotorShape.holes.push(rotorBore);
  mesh('meter-rotor-disk',new THREE.ExtrudeGeometry(rotorShape,{depth:.04,bevelEnabled:true,bevelSize:.004,bevelThickness:.004,bevelSegments:2,curveSegments:48,steps:1}),palette.gold,rotor,[0,0,-.02]);
  for(let i=0;i<6;i++){
    const blade=new THREE.Shape();blade.moveTo(.10,-.025);blade.quadraticCurveTo(.32,-.15,.49,-.035);blade.lineTo(.47,.05);blade.quadraticCurveTo(.31,-.04,.10,.045);blade.closePath();
    const m=mesh('meter-blade-'+i,new THREE.ExtrudeGeometry(blade,{depth:.085,bevelEnabled:true,bevelSize:.01,bevelThickness:.01,bevelSegments:2,curveSegments:16,steps:1}),palette.gold,rotor,[0,0,.035]);m.rotation.z=i*Math.PI/3;
  }
  mesh('meter-axle',new THREE.CylinderGeometry(.095,.095,.1,28).rotateX(Math.PI/2),palette.ink,rotor,[0,0,.11]);
  const bezel=new THREE.Group();bezel.name='meter-bezel';meterRoot.add(bezel);
  bezel.position.z=.33;
  const rim=new THREE.Shape();rim.absarc(0,0,.75,0,Math.PI*2,false);const opening=new THREE.Path();opening.absarc(0,0,.64,0,Math.PI*2,true);rim.holes.push(opening);for(let i=0;i<8;i++){const a=i*Math.PI/4,h=new THREE.Path();h.absarc(Math.cos(a)*.70,Math.sin(a)*.70,.026,0,Math.PI*2,true);rim.holes.push(h);}
  mesh('meter-bezel-ring',new THREE.ExtrudeGeometry(rim,{depth:.10,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:2,curveSegments:48,steps:1}),palette.cream,bezel);
  const glassMat=new THREE.MeshLambertMaterial({color:'#c0e3e5',transparent:true,opacity:.20,depthWrite:false});
  mesh('meter-window',new THREE.CylinderGeometry(.64,.64,.025,48).rotateX(Math.PI/2),glassMat,bezel,[0,0,.055],false);
  const bolts=Array.from({length:8},(_,i)=>{const a=i*Math.PI/4,node=new THREE.Group();node.position.set(Math.cos(a)*.70,Math.sin(a)*.70,.065);bezel.add(node);mesh('meter-bolt-'+i,new THREE.CylinderGeometry(.016,.016,.14,12).rotateX(Math.PI/2),palette.ink,node);mesh('meter-bolt-head-'+i,new THREE.CylinderGeometry(.032,.032,.025,6).rotateX(Math.PI/2),palette.ink,node,[0,0,.085]);return node;});
  mesh('meter-drive-shaft',new THREE.CylinderGeometry(.075,.075,.43,28).rotateX(Math.PI/2),palette.ink,meterRoot,[0,0,-.09]);
  const bearing=new THREE.Group();bearing.name='meter-bearing';bearing.position.z=-.17;meterRoot.add(bearing);
  const profile=[[.105,0],[.22,0],[.22,.07],[.19,.08]];
  for(let i=0;i<=24;i++){const r=.19-.06*i/24;profile.push([r,.08-Math.sqrt(Math.max(0,.03**2-(r-.16)**2))]);}
  profile.push([.105,.07],[.105,0]);
  mesh('meter-bearing-race',new THREE.LatheGeometry(profile.map(([r,z])=>new THREE.Vector2(r,z)),64).rotateX(Math.PI/2),palette.cream,bearing);
  const cage=new THREE.Shape();cage.absarc(0,0,.19,0,Math.PI*2,false);const bore=new THREE.Path();bore.absarc(0,0,.13,0,Math.PI*2,true);cage.holes.push(bore);
  for(let i=0;i<10;i++){const a=i*Math.PI/5,h=new THREE.Path();h.absarc(Math.cos(a)*.16,Math.sin(a)*.16,.028,0,Math.PI*2,true);cage.holes.push(h);}
  mesh('meter-bearing-cage',new THREE.ExtrudeGeometry(cage,{depth:.012,bevelEnabled:false,curveSegments:24,steps:1}),palette.gold,bearing,[0,0,.073]);
  for(let i=0;i<10;i++){const a=i*Math.PI/5;mesh('meter-bearing-ball-'+i,new THREE.SphereGeometry(.025,14,10),palette.gold,bearing,[Math.cos(a)*.16,Math.sin(a)*.16,.08],false);}
  const seal=mesh('meter-gasket',new THREE.TorusGeometry(.653,.018,12,64),palette.ink,meterRoot,[0,0,.33]);
  const records=[{id:'bearing',node:bearing,offset:[0,0,.55],start:13.2/32,end:14.1/32},{id:'rotor',node:rotor,offset:[0,0,1.05],start:14.1/32,end:15.2/32},{id:'seal',node:seal,offset:[0,0,1.18],start:15.15/32,end:15.7/32},{id:'bezel',node:bezel,offset:[0,0,1.85],start:15.7/32,end:16.55/32},...bolts.map((node,i)=>({id:'bolt-'+i,node,offset:[0,0,.32],start:(16.55+i*.055)/32,end:(16.9+i*.055)/32}))];
  const assembly=createReassembly(records);
  const connector=new THREE.CatmullRomCurve3([[1.94,.48,1.03],[2.25,.48,1.03],[2.40,.8,1.25],[2.5,.9,1.3]].map(p=>new THREE.Vector3(...p)));
  mesh('meter-connector',new THREE.TubeGeometry(connector,48,.095,16,false),palette.pipe,stage.group);
  mesh('meter-adapter',new THREE.CylinderGeometry(.24,.095,.25,32).rotateZ(-Math.PI/2),palette.pipe,stage.group,[2.625,.9,1.3]);
  box('connected-ground',[5.7,.16,2.2],material('#b5c79e'),stage.group,[5.95,-.4,1.0]);
  const packets=Array.from({length:13},(_,i)=>mesh('meter-packet-'+i,new THREE.SphereGeometry(.035,10,8),palette.water,meterRoot,[0,0,.23],false));
  const display=stage.label({node:screen,offset:[0,0,.03],text:'16 L/min',beats:['measure','counter']});
  Object.assign(display.style,{background:'none',border:'0',padding:'0',fontVariantNumeric:'tabular-nums',fontWeight:'750'});
  const byId=Object.fromEntries(stage.story.beats.map(b=>[b.id,b]));
  const base=seconds=>seconds/config.duration*32;
  const clock=seconds=>mechanismAt(base(seconds));
  stage.kinetic({id:'measurement-headline',text:'SATU POROS.',preset:'words',emphasis:['POROS'],scene:'meter',beats:['measure'],start:byId.measure.start,end:15.8*config.duration/32,rect:{x:7,y:14,width:86},fontSize:6});
  const factor=config.duration/32;
  const shared={illustrative:true,source:'Simulasi demo',enter:1.1*factor};
  await createDataGraphic(stage,{...shared,id:'flow-counter',type:'counter',title:'Debit sesaat',unit:'L/min',data:[{id:'flow',label:'Saat katup terbuka',value:16}],domain:[0,20],start:16*factor,anchor:[5.6,4.5,1.3],worldWidth:3.8,sample:t=>[{id:'flow',value:16*clock(t).draw}]});
  await createDataGraphic(stage,{...shared,id:'daily-use',type:'bar',title:'Pemakaian per bagian',unit:'L/hari',data:'data/use.csv',domain:[0,200],start:18.7*factor,anchor:[10.5,1.7,1.3],worldWidth:5.0});
  await createDataGraphic(stage,{...shared,id:'flow-history',type:'line',title:'Contoh rekaman debit',unit:'L/min',data:'data/flow.csv',domain:[0,20],start:23*factor,anchor:[10.5,6.1,1.3],worldWidth:5.0});
  await createDataGraphic(stage,{...shared,id:'usage-share',type:'donut',title:'Pembagian pemakaian',unit:'L/hari',data:'data/use.csv',start:26.8*factor,anchor:[5,8.4,1.3],worldWidth:5.0});
  const note=document.createElement('div');note.textContent='DATA & MEKANISME ILUSTRATIF';Object.assign(note.style,{position:'absolute',left:'7%',bottom:'2.6%',fontSize:'1.5cqw',letterSpacing:'.06em',color:'#4b686e'});document.querySelector('#stage').append(note);
  let state,bezelOpen=1;
  function update(seconds,u,story){
    const t=base(seconds);state=clock(seconds);system.update(t,u);
    assembly.update(t/32);bezelOpen=bezel.position.z-.33;
    rotor.rotation.z=-state.drawTravel*235*Math.PI/180;
    bolts.forEach((node,i)=>{const seat=smoother(progress(t,16.55+i*.055,16.9+i*.055));node.rotation.z=(1-seat)*Math.PI*4;});
    packets.forEach((p,i)=>{const phase=(state.drawTravel*.31+i/packets.length)%1;p.position.set(-2.78+phase*5.56,-.07,.23);p.visible=state.draw>.02;p.scale.setScalar(Math.max(.01,state.draw));});
    display.textContent=`${Math.round(16*state.draw)} L/min`;display.style.fontSize=`${2.55*meterRoot.scale.x*stage.camera.zoom}cqw`;
  }
  return {update,inspect(){return {...system.inspect(),modelKind:'multi-reference-threejs',logicalScenes:['system','meter'],referenceCount:3,assembly:assembly.inspect(),meterParts:Object.keys(parts),meterFlow:16*state.draw,meterBezelOpen:bezelOpen,meterAlignmentError:bezel.position.distanceTo(new THREE.Vector3(0,0,.33)),sharedClock:state,illustrativeData:true};}};
}
