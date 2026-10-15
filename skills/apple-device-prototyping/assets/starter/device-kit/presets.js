// Logical CSS pixels model points; preview zoom is independent of these dimensions.
export const presets = Object.freeze({
  ipad: {label:'iPad landscape',width:1024,height:768,family:'ordinary'},
  ipadPortrait: {label:'iPad portrait',width:768,height:1024,family:'ordinary'},
  phone: {label:'Long iPhone',width:844,height:390,family:'ordinary'},
  phonePortrait: {label:'iPhone portrait',width:390,height:844,family:'ordinary'},
  duo: {label:'Duo inner landscape',width:951,height:669,family:'duo',display:'inner'},
  duoPortrait: {label:'Duo inner portrait',width:669,height:951,family:'duo',display:'inner'},
  duoOuter: {label:'Duo outer landscape',width:678,height:466,family:'duo',display:'outer'},
  duoOuterLeft: {label:'Duo outer landscape left',width:678,height:466,family:'duo',display:'outer',rotation:'left'},
  duoOuterPortrait: {label:'Duo outer portrait',width:466,height:678,family:'duo',display:'outer'},
  book: {label:'Duo vertical fold',width:951,height:669,family:'duo',display:'inner',pose:'vertical'},
  tabletop: {label:'Duo tabletop',width:669,height:951,family:'duo',display:'inner',pose:'tabletop'},
  largeFold: {label:'Large foldable (hypothesis)',width:1280,height:1000,family:'duo',display:'hypothetical',pose:'tabletop'},
  window: {label:'Narrow iPad window',width:500,height:720,family:'ordinary'}
});
export function preset(id) {
  if (!Object.hasOwn(presets,id)) throw new RangeError(`Unknown preset: ${id}`);
  return {pose:'flat',display:'generic',rotation:'right',...presets[id]};
}
