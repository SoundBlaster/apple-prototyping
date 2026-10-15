import {geometry,fitScale} from './geometry.js';
export {presets,preset} from './presets.js';
export {geometry,rotate,normalize} from './geometry.js';

// This owner never reparents or replaces application content.
export class DevicePreview {
  constructor({screen,frame,space,stage,maxHeight=700,bezel=10,onFit=()=>{}}) {
    Object.assign(this,{screen,frame,space,stage,maxHeight,bezel,onFit});
    screen.classList.add('apple-screen');frame.classList.add('apple-frame');space.classList.add('apple-space');
    frame.style.setProperty('--device-bezel',`${bezel}px`);
    this.overlay=document.createElement('div');this.overlay.className='apple-overlays';this.overlay.setAttribute('aria-hidden','true');screen.append(this.overlay);
    this.observer=new ResizeObserver(()=>this.fit());this.observer.observe(stage);
  }
  update(input,options={}) {
    const g=geometry(input,options);this.current=g;
    const {screen}=this,{state}=g;
    for(const key of ['family','display','pose']) screen.dataset[key]=state[key];
    screen.dataset.geometryEvidence=g.evidence;screen.dataset.native=String(g.exact);
    screen.dataset.guides=String(!!options.guides);
    screen.style.width=`${state.width}px`;screen.style.height=`${state.height}px`;
    for(const edge of ['top','right','bottom','left']) {
      screen.style.setProperty(`--safe-${edge}`,`${g.safe[edge]}px`);
      screen.style.setProperty(`--native-${edge}`,`${g.safe[edge]}px`);
    }
    screen.style.setProperty('--edge-lane',`${g.edgeLane}px`);
    const gap=g.division?Math.min(g.division.width,g.division.height):18;
    screen.style.setProperty('--fold',`${gap}px`);screen.style.setProperty('--half-division',`${gap/2}px`);
    for(const key of ['x','y','width','height']) screen.style.setProperty(`--division-${key}`,`${g.division?.[key]??0}px`);
    this.overlay.replaceChildren();
    const add=(cls,rect)=>{const node=document.createElement('div');node.className=cls;if(rect)Object.assign(node.style,{left:rect.x+'px',top:rect.y+'px',width:rect.width+'px',height:rect.height+'px'});this.overlay.append(node);return node;};
    add('apple-safe-guide');
    if(g.division) add('apple-division',g.division);
    for(const r of g.regions.filter(r=>r.kind==='occlusion')) {
      const n=add('apple-occlusion',r.frame);n.dataset.active=String(r.active);
      n.dataset.camera=String(r.frame.width===37&&r.frame.height===37);
    }
    if(g.exact)add('apple-home-indicator');
    this.fit();
    screen.dispatchEvent(new CustomEvent('devicechange',{detail:structuredClone(g)}));
    return g;
  }
  fit() {
    if(!this.current)return;
    const {width,height}=this.current.state;
    const css=getComputedStyle(this.stage);
    const available=this.stage.clientWidth-parseFloat(css.paddingLeft||0)-parseFloat(css.paddingRight||0);
    const zoom=fitScale(width,height,available,this.maxHeight,this.bezel);
    this.frame.style.transform=`scale(${zoom})`;
    this.space.style.width=`${(width+2*this.bezel)*zoom}px`;
    this.space.style.height=`${(height+2*this.bezel)*zoom}px`;
    this.screen.dataset.previewScale=String(zoom);this.onFit({width,height,zoom});
  }
  toLocal(clientX,clientY) {
    const rect=this.screen.getBoundingClientRect();
    return {x:(clientX-rect.left)/Number(this.screen.dataset.previewScale),y:(clientY-rect.top)/Number(this.screen.dataset.previewScale)};
  }
  destroy() {this.observer.disconnect();this.overlay.remove();}
}
