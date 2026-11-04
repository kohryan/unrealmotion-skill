import * as THREE from 'three';
import {storyState,validateStoryboard} from './story.mjs';

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
  const stage=document.querySelector('#stage');stage.append(renderer.domElement);
  document.querySelector('#mark').style.display='none';
  const copy=document.querySelector('#copy');copy.dataset.safe='true';
  Object.assign(copy.style,{left:'7%',top:'auto',bottom:'8%',width:'86%',background:'#233e48',borderRadius:'2.8cqw',padding:'3.8%',boxShadow:'0 8px 0 #1c35451a'});
  const style=document.createElement('style');style.textContent=`@font-face{font-family:UnrealInter;src:url('./runtime/fonts/inter-latin-wght-normal.woff2')}#frame{font-family:UnrealInter,Arial,sans-serif}#copy h1,#frame.portrait #copy h1{font-size:5.6cqw;line-height:1.12;letter-spacing:-.045em;font-weight:750;color:#fff9e7;margin:0 0 .25em}#copy p,#frame.portrait #copy p{font-size:2.8cqw;line-height:1.4;color:#edf0dd;max-width:none}#story-header{position:absolute;left:7%;right:7%;top:4.7%;display:flex;justify-content:space-between;color:#233e48;font-size:2.2cqw;font-weight:750;letter-spacing:.1em}#story-header span{background:#fff8df;padding:1.3% 2%;border-radius:1.4cqw}.part-label{position:absolute;background:#233e48;color:#fff8df;border:1px solid #fff8df;border-radius:1cqw;padding:.65cqw 1cqw;font-size:2cqw;white-space:nowrap;transform:translate(-50%,-50%);pointer-events:none}.story-progress{position:absolute;left:7%;right:7%;bottom:4.8%;height:3px;background:#233e4820}.story-progress i{display:block;height:100%;background:#527a78;transform-origin:left}`;
  document.head.append(style);
  const heading=document.createElement('h1'),detail=document.createElement('p');copy.replaceChildren(heading,detail);
  const header=document.createElement('div');header.id='story-header';const title=document.createElement('span'),chapter=document.createElement('span');title.textContent=story.title;header.append(title,chapter);stage.append(header);
  const progress=document.createElement('div');progress.className='story-progress';const fill=document.createElement('i');progress.append(fill);stage.append(progress);
  const labels=[];let state;
  function label({node,offset=[0,0,0],text,beats}){
    const element=document.createElement('div');element.className='part-label';element.dataset.safeLabel='true';element.textContent=text;stage.append(element);labels.push({node,offset:new THREE.Vector3(...offset),element,beats});return element;
  }
  function updateStory(seconds,u){
    state=storyState(story,seconds);const c=state.camera;
    camera.position.set(...c.position);camera.lookAt(...c.target);camera.zoom=c.scale;camera.updateProjectionMatrix();
    heading.textContent=state.beat.caption;detail.textContent=state.beat.detail;copy.style.opacity=state.captionOpacity;copy.style.transform=`translateY(${(1-state.captionOpacity)*10}px)`;chapter.textContent=`${String(state.index+1).padStart(2,'0')} / ${story.beats.length}`;fill.style.transform=`scaleX(${u})`;
    return state;
  }
  function draw(){
    scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
    for(const l of labels){
      const p=l.node.localToWorld(l.offset.clone()).project(camera),x=(p.x*.5+.5)*config.width,y=(-p.y*.5+.5)*config.height;
      l.element.style.left=`${x/config.width*100}%`;l.element.style.top=`${y/config.height*100}%`;l.element.style.display=(!l.beats||l.beats.includes(state.beat.id))&&p.z>=-1&&p.z<=1?'block':'none';
      const hw=l.element.offsetWidth/2,hh=l.element.offsetHeight/2;
      const clearance=Math.min(x-hw-config.width*.025,config.width*.975-x-hw,y-hh-config.height*.11,config.height*.74-y-hh);
      l.element.style.opacity=Math.max(0,Math.min(1,clearance/(config.height*.03)));
    }
    renderer.render(scene,camera);renderer.getContext().finish();
  }
  function inspect(){let meshes=0,volumes=0;const invalid=[];scene.traverse(o=>{if(o.isMesh){meshes++;o.geometry.computeBoundingBox();const size=o.geometry.boundingBox.getSize(new THREE.Vector3());if(Math.min(size.x,size.y,size.z)>1e-4)volumes++;}if(![...o.position,...o.scale,...o.quaternion].every(Number.isFinite))invalid.push(o.name||o.type);});return {renderer:'threejs',meshes,volumes,triangles:renderer.info.render.triangles,invalid,camera:[...camera.position],target:state.camera.target,zoom:camera.zoom,beat:state.beat.id,action:state.beat.action,purpose:state.beat.purpose};}
  return {THREE,scene,group,camera,renderer,label,updateStory,draw,inspect};
}
