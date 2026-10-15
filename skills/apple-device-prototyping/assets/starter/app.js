import {DevicePreview,presets,preset,rotate} from './device-kit/device-preview.js';
const $=id=>document.getElementById(id);
let state=preset('duo');let selected='duo';let notes=0;
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
}
$('preset').addEventListener('change',e=>{selected=e.target.value;state=preset(selected);render();});
for(const axis of ['width','height']) $(axis).addEventListener('change',e=>{if(!e.target.checkValidity()||!e.target.value){e.target.value=state[axis];return;}state[axis]=Number(e.target.value);selected='';render();});
$('rotate').addEventListener('click',()=>{state=rotate(state);selected='';render();});
$('pose').addEventListener('change',e=>{state.pose=e.target.value;if(state.pose!=='flat'){state.family='duo';if(state.display==='generic')state.display='hypothetical';}if(state.display==='inner'&&((state.pose==='tabletop'&&state.width>state.height)||(state.pose==='vertical'&&state.width<state.height)))[state.width,state.height]=[state.height,state.width];selected='';render();});
for(const id of ['guides','camera']) $(id).addEventListener('change',render);
$('count').addEventListener('click',()=>{$('countValue').textContent=++notes;});
render();
