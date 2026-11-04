import * as THREE from 'three';
import {random} from './motion.mjs';

export function microSurface(seed = 73, directional = false) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(512, 512), rng = random(seed);
  const scan = Array.from({length:512}, () => rng());
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const v = Math.round(165 + (directional ? scan[y] : rng()) * 60 + rng() * 12), i = (y * 512 + x) * 4;
    pixels.data[i] = pixels.data[i+1] = pixels.data[i+2] = v; pixels.data[i+3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas); texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(3, 3);
  return texture;
}

export function opticalCoating() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  const radial = ctx.createRadialGradient(492, 476, 40, 512, 512, 510);
  for (const [stop, color] of [[0,'#02080c'],[0.3,'#06151f'],[0.52,'#153d49'],[0.78,'#163744'],[0.92,'#32566c'],[1,'#111b29']]) radial.addColorStop(stop,color);
  ctx.fillStyle = radial; ctx.fillRect(0,0,1024,1024);
  ctx.fillStyle = '#02080e'; ctx.beginPath();
  for (let i = 0; i < 9; i++) { const a = i * Math.PI * 2 / 9; const x = 512 + Math.cos(a) * 132, y = 512 + Math.sin(a) * 132; if (i) ctx.lineTo(x,y); else ctx.moveTo(x,y); }
  ctx.closePath(); ctx.fill();
  for (let i = 0; i < 9; i++) {
    const a = i * Math.PI * 2 / 9; ctx.strokeStyle = '#22313b'; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(512 + Math.cos(a) * 134,512 + Math.sin(a) * 134);ctx.quadraticCurveTo(512+Math.cos(a+0.3)*220,512+Math.sin(a+0.3)*220,512+Math.cos(a+0.65)*290,512+Math.sin(a+0.65)*290);ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

export function labelTexture(text, color = '#cbd6d3') {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 128;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = color; ctx.font = '500 54px Arial'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';ctx.fillText(text,512,64);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

export function contactShadow(parent, {x=0,z=0,y=0.005,width=4,depth=2,opacity=0.4} = {}) {
  const canvas = document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');
  const g=ctx.createRadialGradient(128,128,5,128,128,128);g.addColorStop(0,'#000c');g.addColorStop(0.5,'#0007');g.addColorStop(1,'#0000');ctx.fillStyle=g;ctx.fillRect(0,0,256,256);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(width,depth),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,opacity,depthWrite:false}));
  plane.rotation.x=-Math.PI/2;plane.position.set(x,y,z);parent.add(plane);return plane;
}
