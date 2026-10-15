// Versioned, data-only interchange with the native scanner.
// Imported provenance is a declaration, not a signature or device attestation.
const fail = message => { throw new TypeError('Invalid geometry capture: '+message); };
const object = (value,name) => {
  if(!value || typeof value!=='object' || Array.isArray(value))fail(name);
  return value;
};
const number = (value,name,min=0,max=10000) => {
  if(!Number.isFinite(value)||value<min||value>max)fail(name);
  return value;
};
const string = (value,name) => {
  if(typeof value!=='string'||!value.trim()||value.length>200)fail(name);
  return value;
};
const choice = (value,name,values) => {
  if(!values.includes(value))fail(name);
  return value;
};
const boolean = (value,name) => {
  if(typeof value!=='boolean')fail(name);
  return value;
};
function rect(value,name) {
  object(value,name);
  return {x:number(value.x,name+'.x',-20000,20000),y:number(value.y,name+'.y',-20000,20000),
    width:number(value.width,name+'.width'),height:number(value.height,name+'.height')};
}
function insets(value,name) {
  object(value,name);
  return Object.fromEntries(['top','right','bottom','left'].map(k=>[k,number(value[k],name+'.'+k)]));
}
export function validateCapture(value) {
  object(value,'root');
  if(value.schemaVersion!==1)fail('unsupported schemaVersion');
  if(value.units!=='pt'||value.coordinateSpace!=='view-local')fail('coordinate space or units');
  const id=string(value.id,'id'),capturedAt=string(value.capturedAt,'capturedAt');
  if(!Number.isFinite(Date.parse(capturedAt)))fail('capturedAt');
  const rawSource=object(value.source,'source'),source={
    kind:choice(rawSource.kind,'source.kind',['device','simulator']),
    model:string(rawSource.model,'source.model'),
    osVersion:string(rawSource.osVersion,'source.osVersion'),
    osBuild:string(rawSource.osBuild,'source.osBuild'),
    scannerVersion:string(rawSource.scannerVersion,'source.scannerVersion')
  };
  const config=object(value.configuration,'configuration');
  const configuration={
    mode:choice(config.mode,'mode',['fullscreen','system-bars','embedded']),
    target:string(config.target,'target'),
    orientation:choice(config.orientation,'orientation',['portrait','portraitUpsideDown','landscapeLeft','landscapeRight'])
  };
  for(const k of ['statusBarHidden','homeIndicatorAutoHidden','navigationBarVisible','toolbarVisible','tabBarVisible'])
    configuration[k]=boolean(config[k],k);
  const result={schemaVersion:1,id,capturedAt,source,configuration,units:'pt',coordinateSpace:'view-local'};
  for(const k of ['viewBounds','windowBounds','viewFrameInWindow','screenBounds','nativeBounds','safeAreaFrame','readableContentFrame'])
    result[k]=rect(value[k],k);
  const bounds=result.viewBounds;
  if(bounds.width<=0||bounds.height<=0)fail('empty view');
  result.safeAreaInsets=insets(value.safeAreaInsets,'safeAreaInsets');
  result.layoutMargins=insets(value.layoutMargins,'layoutMargins');
  const safe=result.safeAreaInsets,frame=result.safeAreaFrame;
  if(safe.left+safe.right>bounds.width||safe.top+safe.bottom>bounds.height)fail('insets exceed view');
  const expected={x:bounds.x+safe.left,y:bounds.y+safe.top,
    width:bounds.width-safe.left-safe.right,height:bounds.height-safe.top-safe.bottom};
  if(Object.keys(expected).some(k=>Math.abs(frame[k]-expected[k])>0.5))fail('safeAreaFrame disagrees with insets');
  result.scale=number(value.scale,'scale',0.1,10);
  result.nativeScale=number(value.nativeScale,'nativeScale',0.1,10);
  const traits=object(value.traits,'traits');
  result.traits={
    horizontalSizeClass:choice(traits.horizontalSizeClass,'horizontalSizeClass',['compact','regular','unspecified']),
    verticalSizeClass:choice(traits.verticalSizeClass,'verticalSizeClass',['compact','regular','unspecified']),
    contentSizeCategory:string(traits.contentSizeCategory,'contentSizeCategory'),
    userInterfaceStyle:choice(traits.userInterfaceStyle,'userInterfaceStyle',['light','dark']),
    layoutDirection:choice(traits.layoutDirection,'layoutDirection',['ltr','rtl'])
  };
  result.regionsSupported=boolean(value.regionsSupported,'regionsSupported');
  if(!Array.isArray(value.regionsIncludingInactive)||value.regionsIncludingInactive.length>100)fail('regions');
  result.regionsIncludingInactive=value.regionsIncludingInactive.map(r=>{
    object(r,'region');
    return {kind:choice(r.kind,'region.kind',['division','occlusion']),active:boolean(r.active,'region.active'),
      frame:rect(r.frame,'region.frame'),margins:insets(r.margins,'region.margins')};
  });
  if(!result.regionsSupported&&result.regionsIncludingInactive.length)fail('unsupported regions must be empty');
  return result;
}
export function parseCapture(text) {
  if(typeof text!=='string'||text.length>1024*1024)fail('file exceeds 1 MiB');
  return validateCapture(JSON.parse(text));
}
export function captureState(value) {
  const capture=validateCapture(value);
  const division=capture.regionsIncludingInactive.find(r=>r.kind==='division'&&r.active);
  return {width:capture.viewBounds.width,height:capture.viewBounds.height,
    family:'ordinary',display:'generic',pose:division?(division.frame.width>division.frame.height?'tabletop':'vertical'):'flat',
    rotation:capture.configuration.orientation==='landscapeLeft'?'left':'right',capture};
}
export function capturedGeometry(state) {
  const original=captureState(state.capture),capture=original.capture;
  const exact=['width','height','family','display','pose','rotation'].every(k=>state[k]===original[k]);
  if(!exact)return null;
  // UIKit rectangles are view-local; normalize a nonzero bounds origin for CSS.
  const regions=capture.regionsIncludingInactive.map(r=>({...r,frame:{...r.frame,
    x:r.frame.x-capture.viewBounds.x,y:r.frame.y-capture.viewBounds.y}}));
  return {...capture,regionsIncludingInactive:regions};
}
