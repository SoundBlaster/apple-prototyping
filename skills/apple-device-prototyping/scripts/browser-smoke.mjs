// Import from a Playwright runner; call runBrowserSmoke(page, servedStarterURL).
// No Playwright dependency is needed by the kit or the geometry unit suite.
export async function runBrowserSmoke(page, baseURL='http://127.0.0.1:8766/') {
  const errors=[];
  const listener=error=>errors.push(error.message);
  page.on('pageerror',listener);
  try {
    await page.goto(baseURL);
    await page.setViewportSize({width:1440,height:1100});
    if(await page.locator('#rotate, #pose').count())throw Error('Redundant Rotate/Pose controls are present');
    await page.locator('#count').click();
    const ids=await page.evaluate(async()=>Object.keys((await import('./device-kit/device-preview.js')).presets));
    const results=[];
    for(const id of ids){
      await page.selectOption('#preset',id);
      const r=await page.evaluate(()=>{
        const s=document.querySelector('#screen'),b=s.getBoundingClientRect(),z=Number(s.dataset.previewScale);
        return {width:s.clientWidth,height:s.clientHeight,visualWidth:b.width/z,visualHeight:b.height/z,
          evidence:s.dataset.geometryEvidence,count:document.querySelector('#countValue').textContent};
      });
      if(Math.abs(r.width-r.visualWidth)>0.1||Math.abs(r.height-r.visualHeight)>0.1||r.count!=='1')throw Error(JSON.stringify({id,...r}));
      results.push({id,...r});
    }
    await page.selectOption('#preset','duo');
    await page.locator('#width').fill('952');await page.locator('#width').dispatchEvent('change');
    if(await page.locator('#screen').getAttribute('data-native')!=='false')throw Error('Custom dimensions claimed native measurement');
    await page.evaluate(async()=>{
      const {DevicePreview,preset}=await import('./device-kit/device-preview.js');
      const host=document.createElement('div');host.style.cssText='width:400px;padding:10px';
      host.innerHTML='<div class="space"><div class="frame"><div class="screen"><button>Keep my node</button></div></div></div>';
      document.body.append(host);
      const screen=host.querySelector('.screen'),button=screen.querySelector('button');
      const kit=new DevicePreview({screen,frame:host.querySelector('.frame'),space:host.querySelector('.space'),stage:host});
      for(const id of ['duo','duoPortrait','duoOuter','duoOuterLeft','duoOuterPortrait']){
        for(const cameraActive of [false,true]){
          kit.update(preset(id),{cameraActive,guides:false});
          const regions=[...screen.querySelectorAll('.apple-occlusion')];
          if(!regions.length)throw Error('Missing measured occlusions: '+id);
          for(const region of regions){
            const style=getComputedStyle(region),active=region.dataset.active==='true';
            if((style.display!=='none')!==active)throw Error('Occlusion visibility mismatch: '+id);
            if(active&&style.backgroundColor!=='rgb(21, 37, 42)')throw Error('Active occlusion is not opaque: '+id);
          }
        }
      }
      kit.update(preset('tabletop'));
      const rect=screen.getBoundingClientRect(),z=Number(screen.dataset.previewScale);
      const p=kit.toLocal(rect.left+100*z,rect.top+120*z);
      if(Math.abs(p.x-100)>0.01||Math.abs(p.y-120)>0.01)throw Error('Pointer mapping broken');
      kit.update(preset('phone'));
      if(screen.querySelector('button')!==button||document.querySelector('#countValue').textContent!=='1')throw Error('App identity or other instance changed');
      kit.destroy();if(screen.querySelector('.apple-overlays'))throw Error('Overlay leaked after destroy');
      if(screen.querySelector('button')!==button)throw Error('Destroy removed application');
      host.remove();
    });
    await page.selectOption('#preset','tabletop');
    if(errors.length)throw Error(errors.join('\n'));
    return {presets:results,activeOcclusions:true,customFixture:true,pointerMapping:true,multipleInstances:true,destroyPreservesApp:true,errors};
  } finally {page.off('pageerror',listener);}
}
