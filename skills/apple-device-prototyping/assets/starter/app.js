import {DevicePreview,presets,preset,rotate,parseCapture,captureState} from './device-kit/device-preview.js';
import {parseCatalog} from './device-kit/catalog.js';
const $=id=>document.getElementById(id);
let state=preset('duo');let selected='duo';let notes=0;
const importedProfiles=new Map();
let catalog={schemaVersion:1,profiles:[]},catalogRequest=0,interacted=false;
const catalogURL=new URL('./captures/catalog.json',location.href);
const storageKey='apple-geometry:'+location.pathname;
let restoredSelection='duo';
function saveSelection(){interacted=true;try{localStorage.setItem(storageKey+':selected',selected);}catch{}}
function rememberImports(){
  try{localStorage.setItem(storageKey+':imports',JSON.stringify([...importedProfiles].filter(([id])=>id.startsWith('capture-')).map(([,s])=>s.capture)));return true;}
  catch{return false;}
}
function addImported(capture){
  const id='capture-'+capture.id;
  if(!importedProfiles.has(id))$('preset').add(new Option(capture.source.model+' · '+capture.configuration.mode+' · '+capture.configuration.orientation,id));
  importedProfiles.set(id,captureState(capture));return id;
}
for(const [id,value] of Object.entries(presets)) $('preset').add(new Option(value.label,id));
try{
  const saved=JSON.parse(localStorage.getItem(storageKey+':imports')||'[]');
  if(!Array.isArray(saved)||saved.length>100)throw Error('Too many saved profiles');
  const captures=saved.map(c=>parseCapture(JSON.stringify(c)));captures.forEach(addImported);
  restoredSelection=localStorage.getItem(storageKey+':selected')||'duo';
}catch{$('importStatus').textContent='Saved imports could not be restored; import the JSON again.';}
const preview=new DevicePreview({screen:$('screen'),frame:$('frame'),space:$('space'),stage:$('stage'),onFit:({width,height,zoom})=>{$('size').textContent=`${width} × ${height} · preview ${Math.round(zoom*100)}%`;}});
function render(){
  const g=preview.update(state,{guides:$('guides').checked,cameraActive:$('camera').checked});
  state=g.state;
  $('preset').value=selected;
  for(const axis of ['width','height']) $(''+axis).value=state[axis];
  $('pose').value=state.pose;$('pose').disabled=state.display==='outer';
  $('evidence').textContent=`${g.evidence} · ${g.note}`;
  $('mode').textContent=`${state.display} · ${state.pose}`;
  $('app').dataset.layout=g.chromeHint;$('app').dataset.pose=state.pose;
  $('app').dataset.imported=String(!!state.capture);
  const profile=catalog.profiles.find(p=>'catalog-'+p.key===selected);
  $('captureEvidence').hidden=!profile;
  if(profile){
    const c=profile.capture,o=profile.observations.find(o=>o.id===c.id);
    $('captureContext').textContent=`${c.source.kind} · ${c.source.model} · iOS ${c.source.osVersion} (${c.source.osBuild}) · ${c.configuration.target} · ${c.configuration.orientation} · ${c.configuration.mode} · ${c.capturedAt} · ${profile.observations.length} exports · ${c.traits.contentSizeCategory} · ${c.traits.userInterfaceStyle}`;
    $('captureJSON').href=new URL(o.json,catalogURL).href;
    $('capturePNG').hidden=$('captureThumbnail').hidden=!o.screenshot;
    if(o.screenshot){const url=new URL(o.screenshot,catalogURL).href;$('capturePNG').href=url;$('captureThumbnail').src=url;}
    else{$('capturePNG').removeAttribute('href');$('captureThumbnail').removeAttribute('src');}
  }
}
function selectProfile(id){selected=id;state=importedProfiles.has(id)?structuredClone(importedProfiles.get(id)):preset(id);render();saveSelection();}
$('preset').addEventListener('change',e=>selectProfile(e.target.value));
for(const axis of ['width','height']) $(axis).addEventListener('change',e=>{if(!e.target.checkValidity()||!e.target.value){e.target.value=state[axis];return;}state[axis]=Number(e.target.value);selected='';render();saveSelection();});
$('rotate').addEventListener('click',()=>{state=rotate(state);selected='';render();saveSelection();});
$('pose').addEventListener('change',e=>{state.pose=e.target.value;if(state.pose!=='flat'){state.family='duo';if(state.display==='generic')state.display='hypothetical';}if(state.display==='inner'&&((state.pose==='tabletop'&&state.width>state.height)||(state.pose==='vertical'&&state.width<state.height)))[state.width,state.height]=[state.height,state.width];selected='';render();saveSelection();});
for(const id of ['guides','camera']) $(id).addEventListener('change',render);
$('count').addEventListener('click',()=>{$('countValue').textContent=++notes;});
$('captureFile').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;
  try {
    if(file.size>1024*1024)throw new Error('Capture exceeds 1 MiB');
    const capture=parseCapture(await file.text());
    if([...importedProfiles.keys()].filter(id=>id.startsWith('capture-')).length>=100&&!importedProfiles.has('capture-'+capture.id))throw Error('Import limit reached; use a collected catalog for more profiles.');
    const id=addImported(capture);$('guides').checked=true;selectProfile(id);
    const saved=rememberImports();
    $('importStatus').textContent='Imported. Rotate/resize becomes a fixture; select this profile again to restore its measured geometry.'+(saved?' Saved in this browser.':' Browser storage unavailable; this import lasts for this session.');
  } catch(error) {$('importStatus').textContent=error.message;}
  finally {e.target.value='';}
});
const modelName=model=>({'iPhone18,4':'iPhone Air','iPhone19,4':'iPhone Duo'}[model]||model);
const deviceKey=c=>`${modelName(c.source.model)} · ${c.source.kind} · iOS ${c.source.osVersion} (${c.source.osBuild})`;
function filterCatalog(){
  const previous=$('catalogProfile').value;
  const matches=catalog.profiles.filter(({capture:c})=>(!$('catalogDevice').value||deviceKey(c)===$('catalogDevice').value)&&(!$('catalogMode').value||c.configuration.mode===$('catalogMode').value)&&(!$('catalogOrientation').value||c.configuration.orientation.startsWith($('catalogOrientation').value)));
  $('catalogProfile').replaceChildren(...matches.map(p=>new Option(`${p.capture.viewBounds.width} × ${p.capture.viewBounds.height} · ${p.capture.configuration.mode} · ${p.capture.configuration.orientation} · ${p.capture.traits.userInterfaceStyle} · ${p.capture.configuration.target} · ${p.capture.capturedAt}`,p.key)));
  if(matches.some(p=>p.key===previous))$('catalogProfile').value=previous;
  $('catalogProfile').disabled=$('useCatalog').disabled=!matches.length;
  $('catalogStatus').textContent=catalog.profiles.length?`${matches.length} matching / ${catalog.profiles.length} profiles. Source and evidence follow the selected measurement.`:'No collected profiles. Run collect with this prototype’s captures directory, then refresh.';
}
for(const id of ['catalogDevice','catalogOrientation','catalogMode'])$(id).addEventListener('change',filterCatalog);
$('useCatalog').addEventListener('click',()=>{const key=$('catalogProfile').value;if(!key)return;$('guides').checked=true;selectProfile('catalog-'+key);});
async function loadCatalog(restore=false){
  const request=++catalogRequest;$('refreshCatalog').disabled=true;
  try{
    const response=await fetch(catalogURL,{cache:'no-store'});
    if(!response.ok)throw Error(response.status===404?'No catalog yet. Run collect, then refresh.':'Catalog request failed: '+response.status);
    const next=parseCatalog(await response.text());
    if(request!==catalogRequest)return;
    const previousDevice=$('catalogDevice').value;
    for(const id of [...importedProfiles.keys()])if(id.startsWith('catalog-'))importedProfiles.delete(id);
    for(const option of [...$('preset').options])if(option.value.startsWith('catalog-'))option.remove();
    catalog=next;
    for(const p of catalog.profiles){const id='catalog-'+p.key;importedProfiles.set(id,captureState(p.capture));$('preset').add(new Option('Measured · '+deviceKey(p.capture)+' · '+p.capture.configuration.mode+' · '+p.capture.configuration.orientation,id));}
    $('catalogDevice').replaceChildren(new Option('All devices',''),...[...new Set(catalog.profiles.map(p=>deviceKey(p.capture)))].sort().map(label=>new Option(label,label)));
    if([...$('catalogDevice').options].some(o=>o.value===previousDevice))$('catalogDevice').value=previousDevice;
    filterCatalog();
    if(restore&&!interacted&&importedProfiles.has(restoredSelection)){selected=restoredSelection;state=structuredClone(importedProfiles.get(selected));$('guides').checked=true;}
    if(selected.startsWith('catalog-')&&importedProfiles.has(selected))state=structuredClone(importedProfiles.get(selected));
    // Keep a currently displayed capture even if it was removed from the catalog.
    if(selected.startsWith('catalog-')&&!importedProfiles.has(selected))selected='';
    render();
  }catch(error){if(request===catalogRequest)$('catalogStatus').textContent=error.message;}
  finally{if(request===catalogRequest)$('refreshCatalog').disabled=false;}
}
$('refreshCatalog').addEventListener('click',()=>loadCatalog());
if(importedProfiles.has(restoredSelection)){selected=restoredSelection;state=structuredClone(importedProfiles.get(selected));$('guides').checked=true;}
else if(presets[restoredSelection]){selected=restoredSelection;state=preset(selected);}
render();
loadCatalog(true);
