import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {createModel as createSystem} from './system-model.mjs';
import {waterSystemAt} from './runtime/story.mjs';
import {smoother,progress} from './runtime/motion.mjs';
import {createDataGraphic} from './runtime/dataviz.mjs';

export async function createModel(stage,config){
  const systemRoot=stage.sceneRoot('system'),meterRoot=stage.sceneRoot('meter');
  const system=await createSystem({...stage,group:systemRoot},{...config,duration:60});
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
  mesh('meter-rotor-disk',new THREE.CylinderGeometry(.53,.53,.04,48).rotateX(Math.PI/2),palette.gold,rotor,[0,0,0]);
  for(let i=0;i<6;i++){
    const blade=new THREE.Shape();blade.moveTo(.10,-.025);blade.quadraticCurveTo(.32,-.15,.49,-.035);blade.lineTo(.47,.05);blade.quadraticCurveTo(.31,-.04,.10,.045);blade.closePath();
    const m=mesh('meter-blade-'+i,new THREE.ExtrudeGeometry(blade,{depth:.085,bevelEnabled:true,bevelSize:.01,bevelThickness:.01,bevelSegments:2,curveSegments:16,steps:1}),palette.gold,rotor,[0,0,.035]);m.rotation.z=i*Math.PI/3;
  }
  mesh('meter-axle',new THREE.CylinderGeometry(.095,.095,.1,28).rotateX(Math.PI/2),palette.ink,rotor,[0,0,.11]);
  const bezel=new THREE.Group();bezel.name='meter-bezel';meterRoot.add(bezel);
  const rim=new THREE.Shape();rim.absarc(0,0,.75,0,Math.PI*2,false);const opening=new THREE.Path();opening.absarc(0,0,.64,0,Math.PI*2,true);rim.holes.push(opening);
  mesh('meter-bezel-ring',new THREE.ExtrudeGeometry(rim,{depth:.10,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:2,curveSegments:48,steps:1}),palette.cream,bezel);
  const glassMat=new THREE.MeshLambertMaterial({color:'#c0e3e5',transparent:true,opacity:.20,depthWrite:false});
  mesh('meter-window',new THREE.CylinderGeometry(.64,.64,.025,48).rotateX(Math.PI/2),glassMat,bezel,[0,0,.055],false);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;mesh('meter-bolt-'+i,new THREE.CylinderGeometry(.024,.024,.018,8).rotateX(Math.PI/2),palette.ink,bezel,[Math.cos(a)*.70,Math.sin(a)*.70,.11]);}
  const packets=Array.from({length:13},(_,i)=>mesh('meter-packet-'+i,new THREE.SphereGeometry(.035,10,8),palette.water,meterRoot,[0,0,.23],false));
  const display=stage.label({node:screen,offset:[0,0,.03],text:'16 L/min',beats:['measure','counter']});
  Object.assign(display.style,{background:'none',border:'0',padding:'0',fontVariantNumeric:'tabular-nums',fontWeight:'750'});
  const byId=Object.fromEntries(stage.story.beats.map(b=>[b.id,b]));
  const base=seconds=>seconds/config.duration*24;
  const clock=seconds=>waterSystemAt(6+base(seconds)*2.2);
  stage.kinetic({id:'measurement-headline',text:'JADI ANGKA.',preset:'impact',emphasis:['ANGKA'],scene:'meter',beats:['measure'],start:byId.measure.start,end:byId.measure.end,rect:{x:7,y:14,width:86},fontSize:8});
  const scale=config.duration/24;
  const shared={illustrative:true,source:'Simulasi demo',scene:'meter',rect:{x:7,y:38,width:86,height:31},enter:.55*scale};
  await createDataGraphic(stage,{...shared,id:'flow-counter',type:'counter',title:'Debit sesaat',unit:'L/min',data:[{id:'flow',label:'Saat pompa aktif',value:16}],domain:[0,20],beats:['counter'],start:byId.counter.start,end:byId.counter.end,sample:t=>[{id:'flow',value:16*clock(t).pump}]});
  await createDataGraphic(stage,{...shared,id:'daily-use',type:'bar',title:'Pemakaian per bagian',unit:'L/hari',data:'data/use.csv',domain:[0,200],beats:['bars'],start:byId.bars.start,end:byId.bars.end});
  await createDataGraphic(stage,{...shared,id:'flow-history',type:'line',title:'Contoh rekaman debit',unit:'L/min',data:'data/flow.csv',domain:[0,20],beats:['line'],start:byId.line.start,end:byId.line.end});
  await createDataGraphic(stage,{...shared,id:'usage-share',type:'donut',title:'Pembagian pemakaian',unit:'L/hari',data:'data/use.csv',beats:['donut'],start:byId.donut.start,end:byId.donut.end});
  const note=document.createElement('div');note.textContent='DATA & MEKANISME ILUSTRATIF';Object.assign(note.style,{position:'absolute',left:'7%',bottom:'2.6%',fontSize:'1.5cqw',letterSpacing:'.06em',color:'#4b686e'});document.querySelector('#stage').append(note);
  let state,bezelOpen=1;
  function update(seconds,u,story){
    const t=base(seconds);state=clock(seconds);system.update(6+t*2.2,u);
    const dock=smoother(progress(t,11.1,12.0)),small=smoother(progress(t,13.1,13.8));
    meterRoot.scale.setScalar(1-.35*dock-.17*small);meterRoot.position.set(0,2.8*dock+.75*small,0);
    const lateral=1-smoother(progress(t,9.1,9.75)),axial=1-smoother(progress(t,9.65,10.35));
    bezel.position.set(.65*lateral,0,.33+.70*axial);bezelOpen=axial;
    rotor.rotation.z=-state.impellerAngle*Math.PI/180;
    packets.forEach((p,i)=>{const phase=(state.travel*.31+i/packets.length)%1;p.position.set(-2.78+phase*5.56,-.07,.23);p.visible=state.pump>.02;p.scale.setScalar(Math.max(.01,state.pump));});
    display.textContent=`${Math.round(16*state.pump)} L/min`;display.style.fontSize=`${2.55*meterRoot.scale.x*stage.camera.zoom}cqw`;
  }
  return {update,inspect(){return {...system.inspect(),modelKind:'multi-reference-threejs',logicalScenes:['system','meter'],referenceCount:3,meterParts:Object.keys(parts),meterFlow:16*state.pump,meterBezelOpen:bezelOpen,meterAlignmentError:bezel.position.distanceTo(new THREE.Vector3(0,0,.33)),sharedClock:state,illustrativeData:true};}};
}
