import * as THREE from 'three';
import {storyState,validateStoryboard} from './story.mjs';
import {createKineticText} from './typography.mjs';

// Shared capture stage; the prompt-specific mesh hierarchy and mechanism live in model.mjs.
export async function createExplainerStage(config){
  const response=await fetch('./storyboard.json');if(!response.ok)throw new Error('Missing storyboard.json');
  const story=validateStoryboard(await response.json(),config.duration);
  const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
  renderer.setPixelRatio(config.supersample);renderer.setSize(config.width,config.height);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#e5eee8');
  const span=story.cameraSpan||14;
  const camera=new THREE.OrthographicCamera(-span*config.width/config.height/2,span*config.width/config.height/2,span/2,-span/2,.1,100);
  scene.add(new THREE.HemisphereLight('#ffffff','#acb9a6',2.2));
  const key=new THREE.DirectionalLight('#fff5dd',.85);key.position.set(-5,10,12);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-8,right:8,top:9,bottom:-8,near:.1,far:40});key.shadow.normalBias=.025;scene.add(key);
  const group=new THREE.Group();scene.add(group);
  const stage=document.querySelector('#stage');stage.style.background='#e5eee8';
  const overlay=document.createElement('div');overlay.id='story-visual';Object.assign(overlay.style,{position:'absolute',inset:'0',transformOrigin:'50% 48%'});overlay.append(renderer.domElement);stage.append(overlay);
  document.querySelector('#mark').style.display='none';
  const copy=document.querySelector('#copy');copy.dataset.safe='true';
  Object.assign(copy.style,{left:'7%',top:'auto',bottom:'8%',width:'86%',background:'#233e48',borderRadius:'2.8cqw',padding:'3.8%',boxShadow:'0 8px 0 #1c35451a'});
  const style=document.createElement('style');style.textContent=`@font-face{font-family:UnrealInter;src:url('./runtime/fonts/inter-latin-wght-normal.woff2');font-weight:100 900}#frame{font-family:UnrealInter,Arial,sans-serif}#copy h1,#frame.portrait #copy h1{font-size:5.6cqw;line-height:1.12;letter-spacing:-.045em;font-weight:750;color:#fff9e7;margin:0 0 .25em}#copy p,#frame.portrait #copy p{font-size:2.8cqw;line-height:1.4;color:#edf0dd;max-width:none}#story-header{position:absolute;left:7%;right:7%;top:4.7%;display:flex;justify-content:space-between;color:#233e48;font-size:2.2cqw;font-weight:750;letter-spacing:.1em}#story-header span{background:#fff8df;padding:1.3% 2%;border-radius:1.4cqw}.part-label{position:absolute;background:#233e48;color:#fff8df;border:1px solid #fff8df;border-radius:1cqw;padding:.65cqw 1cqw;font-size:2cqw;white-space:nowrap;transform:translate(-50%,-50%);pointer-events:none}.story-progress{position:absolute;left:7%;right:7%;bottom:4.8%;height:3px;background:#233e4820}.story-progress i{display:block;height:100%;background:#527a78;transform-origin:left}.um-word-window{display:inline-block;overflow:hidden;vertical-align:bottom;padding-bottom:.12em;margin-bottom:-.12em}.um-word{display:inline-block;transform-origin:50% 60%;white-space:pre}.um-emphasis{color:#edca82}#copy[data-layout=hero] h1,#frame.portrait #copy[data-layout=hero] h1{font-size:9.8cqw;line-height:1.04;color:#233e48}#copy[data-layout=side] h1,#frame.portrait #copy[data-layout=side] h1{font-size:6.7cqw;color:#233e48}#copy[data-layout=hero] p,#copy[data-layout=side] p,#frame.portrait #copy[data-layout=hero] p,#frame.portrait #copy[data-layout=side] p{color:#49676c}#copy[data-layout=hero] .um-emphasis,#copy[data-layout=side] .um-emphasis,.um-kinetic .um-emphasis{color:#477f88}.um-kinetic{position:absolute;font-size:6cqw;font-weight:800;color:#233e48;line-height:1.08;letter-spacing:-.035em}`;
  document.head.append(style);
  const heading=document.createElement('h1'),detail=document.createElement('p');copy.replaceChildren(heading,detail);
  const header=document.createElement('div');header.id='story-header';const title=document.createElement('span'),chapter=document.createElement('span');title.textContent=story.title;header.append(title,chapter);stage.append(header);
  const progress=document.createElement('div');progress.className='story-progress';const fill=document.createElement('i');progress.append(fill);stage.append(progress);
  await document.fonts.load('750 24px UnrealInter');
  const labels=[],roots=new Map(),graphics=new Map(),type=createKineticText(heading);let state;
  function sceneRoot(id){
    if(!story.scenes?.some(s=>s.id===id)||roots.has(id))throw new Error(`Unknown or duplicate scene root: ${id}`);
    const node=new THREE.Group();node.name=id;group.add(node);roots.set(id,node);return node;
  }
  function registerGraphic(graphic){if(graphics.has(graphic.id))throw new Error(`Duplicate graphic id: ${graphic.id}`);graphics.set(graphic.id,graphic);}
  function kinetic(spec){
    if(!spec.id||typeof spec.text!=='string')throw new Error('Kinetic text needs an id and text');
    const element=document.createElement('div');element.className='um-kinetic';element.dataset.safe='visual';
    const rect={x:7,y:14,width:86,...spec.rect};if(!Object.values(rect).every(Number.isFinite)||rect.x<0||rect.y<0||rect.width<=0||rect.x+rect.width>100)throw new Error('Invalid text rectangle');
    Object.assign(element.style,{left:`${rect.x}%`,top:`${rect.y}%`,width:`${rect.width}%`,...(spec.fontSize?{fontSize:`${spec.fontSize}cqw`}:{})});overlay.append(element);
    const writer=createKineticText(element);writer.set(spec.text,spec);
    const graphic={id:spec.id,update(t,s){const active=(!spec.scene||s.scene===spec.scene)&&(!spec.beats||spec.beats.includes(s.beat.id))&&t>=(spec.start||0)&&t<(spec.end??Infinity);element.style.display=active?'block':'none';writer.update(t,spec.start||0);},inspect:()=>({id:spec.id,type:'text',...writer.inspect(),invalid:false})};registerGraphic(graphic);return graphic;
  }
  function label({node,offset=[0,0,0],text,beats}){
    const element=document.createElement('div');element.className='part-label';element.dataset.safeLabel='true';element.textContent=text;overlay.append(element);labels.push({node,offset:new THREE.Vector3(...offset),element,beats});return element;
  }
  function updateStory(seconds,u){
    state=storyState(story,seconds);const c=state.camera;
    camera.position.set(...c.position);camera.lookAt(...c.target);camera.zoom=c.scale;camera.updateProjectionMatrix();
    if(story.version===2){
      const layout=state.beat.text?.layout||'caption';copy.dataset.layout=layout;
      Object.assign(copy.style,layout==='caption'?{top:'auto',bottom:'8%',width:'86%',padding:'3.8%',background:'#233e48',boxShadow:'0 8px 0 #1c35451a'}:{top:layout==='hero'?'12%':'33%',bottom:'auto',width:layout==='hero'?'86%':'43%',padding:'0',background:'transparent',boxShadow:'none'});
      type.set(state.beat.caption,state.beat.text);type.update(seconds,state.beat.start,state.textComposed);
      const seam=state.transition;overlay.style.transform=`translate3d(${seam.x*config.width}px,${seam.y*config.height}px,0) scale(${seam.scale})`;overlay.style.filter=seam.blur>0?`blur(${seam.blur}px)`:'none';
      if(!roots.has(state.scene))throw new Error(`Missing authored scene root: ${state.scene}`);
      for(const [id,node]of roots)node.visible=id===state.scene;
    }else heading.textContent=state.beat.caption;
    detail.textContent=state.beat.detail;copy.style.opacity=state.captionOpacity;copy.style.transform=`translateY(${(1-state.captionOpacity)*10}px)`;chapter.textContent=`${String(state.index+1).padStart(2,'0')} / ${story.beats.length}`;fill.style.transform=`scaleX(${u})`;
    for(const graphic of graphics.values())graphic.update(seconds,state);
    return state;
  }
  function draw(){
    scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
    for(const l of labels){
      const p=l.node.localToWorld(l.offset.clone()).project(camera),x=(p.x*.5+.5)*config.width,y=(-p.y*.5+.5)*config.height;
      let visible=l.node.visible;l.node.traverseAncestors(parent=>{if(!parent.visible)visible=false;});
      l.element.style.left=`${x/config.width*100}%`;l.element.style.top=`${y/config.height*100}%`;l.element.style.display=visible&&(!l.beats||l.beats.includes(state.beat.id))&&p.z>=-1&&p.z<=1?'block':'none';
      const hw=l.element.offsetWidth/2,hh=l.element.offsetHeight/2;
      const clearance=Math.min(x-hw-config.width*.025,config.width*.975-x-hw,y-hh-config.height*.11,config.height*.74-y-hh);
      l.element.style.opacity=Math.max(0,Math.min(1,clearance/(config.height*.03)));
    }
    renderer.render(scene,camera);renderer.getContext().finish();
  }
  function inspect(){let meshes=0,volumes=0;const invalid=[];scene.traverse(o=>{if(o.isMesh){meshes++;o.geometry.computeBoundingBox();const size=o.geometry.boundingBox.getSize(new THREE.Vector3());if(Math.min(size.x,size.y,size.z)>1e-4)volumes++;}if(![...o.position,...o.scale,...o.quaternion].every(Number.isFinite))invalid.push(o.name||o.type);});return {renderer:'threejs',meshes,volumes,triangles:renderer.info.render.triangles,invalid,camera:[...camera.position],target:state.camera.target,zoom:camera.zoom,beat:state.beat.id,action:state.beat.action,purpose:state.beat.purpose,scene:state.scene,transition:state.transition,activeScenes:[...roots].filter(([,node])=>node.visible).map(([id])=>id),graphics:[...graphics.values()].map(g=>g.inspect())};}
  return {THREE,scene,group,camera,renderer,story,overlay,sceneRoot,registerGraphic,kinetic,label,updateStory,draw,inspect};
}
