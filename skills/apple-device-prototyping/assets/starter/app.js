import {DevicePreview,presets,preset,rotate,parseCapture,captureState} from './device-kit/device-preview.js';
const $=id=>document.getElementById(id);
let state=preset('duo');let selected='duo';let notes=0;
const importedProfiles=new Map();
for(const [id,value] of Object.entries(presets)) $('preset').add(new Option(value.label,id));
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
}
$('preset').addEventListener('change',e=>{selected=e.target.value;state=importedProfiles.has(selected)?structuredClone(importedProfiles.get(selected)):preset(selected);render();});
for(const axis of ['width','height']) $(axis).addEventListener('change',e=>{if(!e.target.checkValidity()||!e.target.value){e.target.value=state[axis];return;}state[axis]=Number(e.target.value);selected='';render();});
$('rotate').addEventListener('click',()=>{state=rotate(state);selected='';render();});
$('pose').addEventListener('change',e=>{state.pose=e.target.value;if(state.pose!=='flat'){state.family='duo';if(state.display==='generic')state.display='hypothetical';}if(state.display==='inner'&&((state.pose==='tabletop'&&state.width>state.height)||(state.pose==='vertical'&&state.width<state.height)))[state.width,state.height]=[state.height,state.width];selected='';render();});
for(const id of ['guides','camera']) $(id).addEventListener('change',render);
$('count').addEventListener('click',()=>{$('countValue').textContent=++notes;});
$('captureFile').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;
  try {
    if(file.size>1024*1024)throw new Error('Capture exceeds 1 MiB');
    const capture=parseCapture(await file.text());
    const next=captureState(capture),id='capture-'+capture.id;
    if(!importedProfiles.has(id))$('preset').add(new Option(
      capture.source.model+' · '+capture.configuration.mode+' · '+capture.configuration.orientation,id));
    importedProfiles.set(id,next);selected=id;state=structuredClone(next);
    $('guides').checked=true;render();
    $('importStatus').textContent='Imported. Rotate/resize becomes a fixture; select this profile again to restore its measured geometry.';
  } catch(error) {$('importStatus').textContent=error.message;}
  finally {e.target.value='';}
});
render();
