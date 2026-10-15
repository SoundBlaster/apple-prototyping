import {validateCapture} from './capture.js';

// Shared by the collector and the browser. Only local, content-addressed assets.
export function validateCatalog(value) {
  const fail=message=>{throw new TypeError('Invalid capture catalog: '+message);};
  if(value?.schemaVersion!==1||!Array.isArray(value.profiles)||value.profiles.length>10000)fail('schema or profiles');
  const keys=new Set(),ids=new Set();
  const asset=(path,extension)=>{
    if(typeof path!=='string'||!new RegExp('^objects/[a-f0-9]{64}\\.'+extension+'$').test(path))fail('asset path');
    return path;
  };
  const profiles=value.profiles.map(profile=>{
    if(!/^[a-f0-9]{64}$/.test(profile.key)||keys.has(profile.key))fail('profile key');
    keys.add(profile.key);
    const capture=validateCapture(profile.capture);
    if(!Array.isArray(profile.observations)||!profile.observations.length||profile.observations.length>10000)fail('observations');
    const observations=profile.observations.map(o=>{
      if(typeof o.id!=='string'||!o.id.trim()||o.id.length>200||ids.has(o.id))fail('observation id');
      ids.add(o.id);
      if(typeof o.capturedAt!=='string'||!Number.isFinite(Date.parse(o.capturedAt)))fail('observation time');
      return {id:o.id,capturedAt:o.capturedAt,json:asset(o.json,'json'),screenshot:o.screenshot===null?null:asset(o.screenshot,'png')};
    });
    if(!observations.some(o=>o.id===capture.id&&o.capturedAt===capture.capturedAt))fail('representative capture missing');
    return {key:profile.key,capture,observations};
  });
  return {schemaVersion:1,profiles};
}

export function parseCatalog(text) {
  if(typeof text!=='string'||text.length>32*1024*1024)throw new TypeError('Capture catalog exceeds 32 MiB');
  return validateCatalog(JSON.parse(text));
}
