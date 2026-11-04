import test from 'node:test';
import assert from 'node:assert/strict';
import {Object3D} from 'three';
import {createReassembly} from '../assets/runtime/reassembly.mjs';

test('reassembly preserves local rest poses, dependencies and exact final alignment after random seeking',()=>{
  const parent=new Object3D(),child=new Object3D();parent.position.set(1,2,3);child.position.set(0,0.34,0);parent.add(child);
  const assembly=createReassembly([{id:'carrier',node:parent,offset:[0,1.1,0],start:0.34,end:0.58},{id:'ball',node:child,offset:[0,0.62,0],start:0.07,end:0.3}]);
  assembly.update(0);assert.ok(Math.abs(parent.position.y-3.1)<1e-9);assert.ok(Math.abs(child.position.y-0.96)<1e-9);
  assembly.update(0.31);assert.equal(child.position.y,0.34);assert.ok(parent.position.y>3);
  assembly.update(0.5);const mid=assembly.inspect();assembly.update(1);assert.deepEqual(assembly.inspect().map(p=>p.assemblyError),[0,0]);
  assembly.update(0);assembly.update(0.5);assert.deepEqual(assembly.inspect(),mid);
  assert.throws(()=>createReassembly([{id:'x',node:parent,offset:[0,Infinity,0],start:0,end:1}]));
});
