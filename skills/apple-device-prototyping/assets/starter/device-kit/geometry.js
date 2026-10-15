import {measurements} from './measurements.js';
import {capturedGeometry} from './capture.js';
const zero = () => ({top:0,right:0,bottom:0,left:0});
export function normalize(input) {
  const state={family:'ordinary',display:'generic',pose:'flat',rotation:'right',...input};
  for(const key of ['width','height']) {
    if(!Number.isFinite(state[key]) || state[key]<=0 || state[key]>10000) throw new RangeError(`Invalid ${key}`);
  }
  if(!['ordinary','duo'].includes(state.family)||!['generic','inner','outer','hypothetical'].includes(state.display)||!['flat','vertical','tabletop'].includes(state.pose)||!['left','right'].includes(state.rotation)) throw new RangeError('Invalid device state');
  if(state.display==='outer') state.pose='flat';
  return state;
}
export function rotate(input) {
  const s=normalize(input);
  return normalize({...s,width:s.height,height:s.width,pose:s.pose==='vertical'?'tabletop':s.pose==='tabletop'?'vertical':'flat'});
}
export function geometry(input,{cameraActive=false}={}) {
  const state=normalize(input), {width,height,pose,display,family,rotation}=state;
  const orientation=width>height?'landscape':'portrait';
  const key=pose==='tabletop'?'tabletop':pose==='vertical'?'vertical-fold':display==='outer'&&orientation==='landscape'?(rotation==='left'?'outer-landscape':'outer-landscape-right'):`${display}-${orientation}`;
  const imported=state.capture?capturedGeometry(state):null;
  const reference=state.capture?imported:family==='duo'&&display!=='hypothetical'?measurements[key]:null;
  const exact=!!reference && reference.viewBounds.width===width && reference.viewBounds.height===height;
  // Never apply raw measured rectangles to a differently-sized custom viewport.
  const sample=exact?structuredClone(reference):null;
  const safe=sample?.safeAreaInsets??zero();
  const regions=sample?.regionsIncludingInactive??[];
  for(const r of regions) if(r.kind==='occlusion' && cameraActive) r.active=true;
  let division=regions.find(r=>r.kind==='division'&&r.active)?.frame??null;
  if(!division && pose!=='flat') {
    const gap=sample?40:18;
    division=pose==='tabletop'?{x:0,y:(height-gap)/2,width,height:gap}:{x:(width-gap)/2,y:0,width:gap,height};
  }
  const simulated=cameraActive && !!sample;
  const evidence=exact?(imported?.source.kind==='device'?'device-measured':'simulator-measured'):'fixture';
  const note=imported?['Imported '+imported.source.kind+' capture (declared source)',
    imported.source.model,'iOS '+imported.source.osVersion,imported.configuration.mode,
    imported.configuration.target,imported.configuration.orientation,imported.capturedAt,
    imported.regionsSupported?'reserved regions recorded':'reserved regions unavailable'].join(' · '):
    exact?`Simulator iOS ${sample.systemVersion}; status bar hidden; scale ${sample.scale}`:
    'Unmeasured layout fixture; no native safe-area claim';
  return {state,key,sample,exact,evidence,simulated,
    safe,regions,division,orientation,
    chromeHint:pose==='tabletop'?'tabletop':display==='inner'&&orientation==='portrait'?'horizontal':family==='duo'?'rail':'overlay',
    edgeLane:family==='duo'?84:0,
    note:note+(simulated?'; occlusion activation simulated':'')};
}
export function fitScale(width,height,availableWidth,maxHeight=700,bezel=10) {
  return Math.max(0.01,Math.min(1,Math.max(1,availableWidth)/(width+2*bezel),maxHeight/(height+2*bezel)));
}
