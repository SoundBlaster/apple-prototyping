// Run with a real exported JSON capture and a served starter.
export async function runCaptureBrowserSmoke(page,capture,baseURL='http://127.0.0.1:8766/') {
  await page.goto(baseURL);
  await page.setViewportSize({width:1440,height:1100});
  await page.locator('#count').click();
  await page.locator('#captureFile').setInputFiles({
    name:'capture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(capture))
  });
  await page.waitForFunction(()=>document.querySelector('#preset').value.startsWith('capture-'));
  const id=await page.locator('#preset').inputValue();
  const measured=await page.evaluate(()=>{
    const screen=document.querySelector('#screen'),css=getComputedStyle(screen);
    return {width:screen.clientWidth,height:screen.clientHeight,evidence:screen.dataset.geometryEvidence,
      safe:Object.fromEntries(['top','right','bottom','left'].map(k=>[k,parseFloat(css.getPropertyValue('--safe-'+k))])),
      guides:getComputedStyle(screen.querySelector('.apple-safe-guide')).display,
      note:document.querySelector('#evidence').textContent,count:document.querySelector('#countValue').textContent};
  });
  if(Math.abs(measured.width-capture.viewBounds.width)>1||Math.abs(measured.height-capture.viewBounds.height)>1)
    throw Error('Imported view bounds differ');
  if(JSON.stringify(measured.safe)!==JSON.stringify(Object.fromEntries(['top','right','bottom','left'].map(k=>[k,capture.safeAreaInsets[k]]))))
    throw Error('Imported safe area differs');
  if(measured.evidence!==capture.source.kind+'-measured'||measured.guides==='none'||measured.count!=='1')
    throw Error('Import lost provenance, guides or application state');
  if(!measured.note.includes(capture.configuration.target))throw Error('Owning-view context hidden');
  await page.locator('#rotate').click();
  if(await page.locator('#screen').getAttribute('data-native')!=='false')throw Error('Rotation kept stale measured geometry');
  await page.selectOption('#preset',id);
  if(await page.locator('#screen').getAttribute('data-native')!=='true')throw Error('Cannot restore capture');
  await page.locator('#captureFile').setInputFiles({
    name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"schemaVersion":999}')
  });
  await page.waitForFunction(()=>document.querySelector('#importStatus').textContent.includes('unsupported schemaVersion'));
  if(await page.locator('#preset').inputValue()!==id)throw Error('Invalid import changed active profile');
  return {measured,rotationInvalidates:true,selectionRestores:true,invalidImportPreservesState:true};
}
