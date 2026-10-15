#!/usr/bin/env node
import {readFile,writeFile,mkdir,readdir,rename,rm,mkdtemp,open} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {tmpdir} from 'node:os';
import {resolve,join,dirname,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {parseCapture} from '../assets/starter/device-kit/capture.js';
import {parseCatalog,validateCatalog} from '../assets/starter/device-kit/catalog.js';

const execute=promisify(execFile);
const hash=data=>createHash('sha256').update(data).digest('hex');
const canonical=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)
  ?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
export function profileKey(capture) {
  const {id,capturedAt,...measurement}=capture;
  return hash(canonical(measurement));
}
async function optionalRead(path) {
  try{return await readFile(path);}catch(error){if(error.code==='ENOENT')return null;throw error;}
}
async function boundedRead(path,limit) {
  const file=await open(path,'r');
  try{if((await file.stat()).size>limit)throw Error('File too large: '+path);return await file.readFile();}
  finally{await file.close();}
}
function verifyPNG(data,capture) {
  if(data.length<24||data.length>25*1024*1024||data.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||data.toString('ascii',12,16)!=='IHDR')throw Error('Invalid PNG');
  if(Math.abs(data.readUInt32BE(16)-capture.viewBounds.width*capture.scale)>1||Math.abs(data.readUInt32BE(20)-capture.viewBounds.height*capture.scale)>1)throw Error('PNG dimensions disagree with capture');
}

export async function collectDirectory({input,output}) {
  input=resolve(input);output=resolve(output);
  const names=(await readdir(input,{withFileTypes:true})).filter(f=>f.isFile()&&f.name.endsWith('.json')&&f.name!=='latest.json'&&f.name!=='catalog.json').map(f=>f.name).sort();
  if(!names.length)throw Error('No exported JSON files found (latest.json is not an explicit export).');
  // Validate the entire incoming batch before taking a lock or writing anything.
  const incoming=[];
  for(const name of names) {
    try {
      const capture=parseCapture((await boundedRead(join(input,name),1024*1024)).toString());
      const json=Buffer.from(canonical(capture)+'\n');
      const pngPath=join(input,name.slice(0,-5)+'.png');
      let png=null;
      try{png=await boundedRead(pngPath,25*1024*1024);}catch(error){if(error.code!=='ENOENT')throw error;}
      if(png)verifyPNG(png,capture);
      incoming.push({capture,json,png,key:profileKey(capture),jsonPath:'objects/'+hash(json)+'.json',pngPath:png?'objects/'+hash(png)+'.png':null});
    }catch(error){throw Error(name+': '+error.message);}
  }
  await mkdir(output,{recursive:true});
  const lockPath=join(output,'.collect.lock');
  let lock;
  try{lock=await open(lockPath,'wx');}catch(error){if(error.code==='EEXIST')throw Error('Catalog is locked by another collector: '+lockPath);throw error;}
  let temporaryManifest;
  try {
    const manifestPath=join(output,'catalog.json'),old=await optionalRead(manifestPath);
    const catalog=old?parseCatalog(old.toString()):{schemaVersion:1,profiles:[]};
    const profiles=new Map(catalog.profiles.map(p=>[p.key,p])),observations=new Map();
    // Existing asset corruption or conflicting IDs must not be silently repaired.
    for(const profile of catalog.profiles) {
      if(profile.key!==profileKey(profile.capture))throw Error('Catalog profile key mismatch');
      for(const observation of profile.observations) {
        const data=await readFile(join(output,observation.json));
        if(hash(data)!==basename(observation.json,'.json'))throw Error('Catalog JSON checksum mismatch');
        const capture=parseCapture(data.toString());
        if(capture.id!==observation.id||capture.capturedAt!==observation.capturedAt||profileKey(capture)!==profile.key)throw Error('Catalog observation mismatch');
        if(observation.screenshot) {
          const png=await readFile(join(output,observation.screenshot));
          if(hash(png)!==basename(observation.screenshot,'.png'))throw Error('Catalog PNG checksum mismatch');
          verifyPNG(png,capture);
        }
        observations.set(observation.id,observation);
      }
    }
    let addedObservations=0,addedProfiles=0,duplicates=0,attachedScreenshots=0;
    const files=new Map();
    for(const item of incoming) {
      const {capture,key,jsonPath,pngPath}=item,existing=observations.get(capture.id);
      if(existing) {
        if(existing.json!==jsonPath||(existing.screenshot&&pngPath&&existing.screenshot!==pngPath))throw Error('Conflicting export ID: '+capture.id);
        if(!existing.screenshot&&pngPath){existing.screenshot=pngPath;files.set(pngPath,item.png);attachedScreenshots++;}
        duplicates++;continue;
      }
      let profile=profiles.get(key);
      if(!profile){profile={key,capture,observations:[]};profiles.set(key,profile);addedProfiles++;}
      const observation={id:capture.id,capturedAt:capture.capturedAt,json:jsonPath,screenshot:pngPath};
      profile.observations.push(observation);observations.set(capture.id,observation);addedObservations++;
      if(Date.parse(capture.capturedAt)>Date.parse(profile.capture.capturedAt))profile.capture=capture;
      files.set(jsonPath,item.json);if(pngPath)files.set(pngPath,item.png);
    }
    catalog.profiles=[...profiles.values()].sort((a,b)=>a.key.localeCompare(b.key));
    for(const p of catalog.profiles)p.observations.sort((a,b)=>a.capturedAt.localeCompare(b.capturedAt)||a.id.localeCompare(b.id));
    validateCatalog(catalog);
    await mkdir(join(output,'objects'),{recursive:true});
    for(const [path,data] of files) {
      const dest=join(output,path),present=await optionalRead(dest);
      if(present){if(!present.equals(data))throw Error('Existing object checksum mismatch: '+path);continue;}
      await writeFile(dest,data,{flag:'wx'});
    }
    if(addedObservations||attachedScreenshots||!old) {
      temporaryManifest=join(output,'.catalog-'+randomUUID()+'.tmp');
      await writeFile(temporaryManifest,JSON.stringify(catalog,null,2)+'\n',{flag:'wx'});
      await rename(temporaryManifest,manifestPath);temporaryManifest=null;
    }
    return {catalog:manifestPath,scanned:incoming.length,addedProfiles,addedObservations,duplicates,attachedScreenshots,
      missingScreenshots:incoming.filter(i=>!i.png).length,totalProfiles:catalog.profiles.length};
  } finally {
    if(temporaryManifest)await rm(temporaryManifest,{force:true});
    await lock.close();await rm(lockPath,{force:true});
  }
}

export async function collectDevice({device,output,bundleId='dev.soundblaster.apple-prototyping.scanner',run=execute}) {
  if(!device?.trim())throw Error('An explicit device identifier is required');
  const temp=await mkdtemp(join(tmpdir(),'apple-geometry-'));
  try {
    const destination=join(temp,'Documents');
    await run('xcrun',['devicectl','device','copy','from','--device',device,'--source','Documents','--destination',destination,
      '--domain-type','appDataContainer','--domain-identifier',bundleId],{timeout:60000,maxBuffer:1024*1024});
    return await collectDirectory({input:destination,output});
  } finally {await rm(temp,{recursive:true,force:true});}
}

async function main(args) {
  if(args.includes('--help')){console.log('collect --device <UDID> | --input <export-directory> --output <prototype>/captures [--bundle-id <id>]\nRequires Node.js 20+. Reads explicit JSON exports and optional matching PNGs; never deletes device files.');return;}
  const options={};
  for(let i=0;i<args.length;i+=2){const key=args[i],value=args[i+1];if(!['--device','--input','--output','--bundle-id'].includes(key)||!value||value.startsWith('--')||key in options)throw Error('Invalid argument: '+key);options[key]=value;}
  if(!options['--output']||Boolean(options['--device'])===Boolean(options['--input']))throw Error('Choose exactly one of --device / --input and provide --output. See --help.');
  const result=options['--device']?await collectDevice({device:options['--device'],output:options['--output'],bundleId:options['--bundle-id']}):await collectDirectory({input:options['--input'],output:options['--output']});
  console.log(JSON.stringify(result,null,2));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main(process.argv.slice(2)).catch(error=>{console.error(error.message);process.exitCode=1;});
