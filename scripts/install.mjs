#!/usr/bin/env node
import {homedir} from 'node:os';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {mkdir,symlink,lstat,realpath} from 'node:fs/promises';

const source=await realpath(fileURLToPath(new URL('../',import.meta.url)));
const dest=path.join(process.env.CODEX_HOME || path.join(homedir(),'.codex'),'skills/unrealmotion');
try{
  let previous;
  try{previous=await lstat(dest);}catch(e){if(e.code!=='ENOENT')throw e;}
  if(previous){
    if(await realpath(dest)===source){console.log(`Already installed: ${dest}`);process.exit(0);}
    throw new Error(`Existing skill preserved: ${dest}. Choose another location manually.`);
  }
  await mkdir(path.dirname(dest),{recursive:true});await symlink(source,dest,process.platform==='win32'?'junction':'dir');
  console.log(`Installed: ${dest} → ${source}\nAvailable for automatic discovery on the next user turn.`);
}catch(e){console.error(e.message);process.exitCode=1;}
