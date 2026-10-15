import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseCapture,captureState} from '../assets/starter/device-kit/capture.js';
import {geometry,rotate} from '../assets/starter/device-kit/geometry.js';

// Synthetic contract fixture, deliberately not a device evidence record.
function fixture() {
  const bounds={x:0,y:0,width:400,height:800};
  return {schemaVersion:1,id:'contract-fixture',capturedAt:'2026-10-15T00:00:00Z',
    source:{kind:'simulator',model:'test-fixture',osVersion:'27.1',osBuild:'test',scannerVersion:'0.1.0'},
    configuration:{mode:'fullscreen',target:'scanner.rootView',orientation:'portrait',
      statusBarHidden:false,homeIndicatorAutoHidden:false,navigationBarVisible:false,toolbarVisible:false,tabBarVisible:false},
    units:'pt',coordinateSpace:'view-local',viewBounds:bounds,windowBounds:bounds,
    screenBounds:bounds,viewFrameInWindow:bounds,nativeBounds:{...bounds,width:1200,height:2400},
    scale:3,nativeScale:3,safeAreaInsets:{top:60,right:0,bottom:34,left:0},
    safeAreaFrame:{x:0,y:60,width:400,height:706},layoutMargins:{top:60,right:20,bottom:34,left:20},
    readableContentFrame:{x:20,y:60,width:360,height:706},
    traits:{horizontalSizeClass:'compact',verticalSizeClass:'regular',contentSizeCategory:'large',
      userInterfaceStyle:'light',layoutDirection:'ltr'},
    regionsSupported:true,regionsIncludingInactive:[
      {kind:'occlusion',active:false,frame:{x:150,y:0,width:100,height:40},margins:{top:0,right:0,bottom:0,left:0}}
    ]};
}
test('native capture roundtrip retains measured insets, provenance and state isolation',()=>{
  const raw=fixture(),capture=parseCapture(JSON.stringify(raw)),state=captureState(capture);
  const g=geometry(state);
  assert.equal(g.exact,true);assert.equal(g.evidence,'simulator-measured');
  assert.deepEqual(g.safe,raw.safeAreaInsets);assert.equal(g.sample.source.model,'test-fixture');
  assert.equal(g.edgeLane,0); // Never guess a toolbar width from an imported model.
  geometry(state,{cameraActive:true});
  assert.equal(geometry(state).regions[0].active,false);
  raw.source.kind='device';
  assert.equal(geometry(captureState(raw)).evidence,'device-measured');
});
test('size, pose or orientation changes invalidate imported geometry without catalog fallback',()=>{
  const state=captureState(fixture());
  for(const changed of [rotate(state),{...state,width:401},{...state,pose:'vertical'},
    {...state,rotation:'left'},{...state,family:'duo',display:'inner',width:951,height:669}]){
    const g=geometry(changed);
    assert.equal(g.exact,false);assert.equal(g.evidence,'fixture');
    assert.deepEqual(g.safe,{top:0,right:0,bottom:0,left:0});assert.equal(g.regions.length,0);
  }
});
test('reject unsupported, malformed and inconsistent native data',()=>{
  const mutate=[
    x=>x.schemaVersion=2,x=>x.source.kind='browser',x=>x.units='px',
    x=>x.viewBounds={x:0,y:0,width:0,height:800},
    x=>x.safeAreaInsets.top=900,x=>x.safeAreaFrame.y=0,x=>x.scale=0,
    x=>x.configuration.statusBarHidden='false',x=>x.configuration.orientation='flat',
    x=>x.regionsIncludingInactive[0].active=1,x=>x.regionsSupported=false,
    x=>x.capturedAt='not-a-date',x=>x.traits.horizontalSizeClass='wide'
  ];
  for(const change of mutate){const raw=fixture();change(raw);assert.throws(()=>parseCapture(JSON.stringify(raw)));}
  assert.throws(()=>parseCapture(' '.repeat(1024*1024+1)));
  assert.throws(()=>parseCapture('{broken'));
});
test('reserved rectangles normalize bounds origins and inactive divisions stay inactive',()=>{
  const raw=fixture();
  raw.viewBounds.x=10;raw.viewBounds.y=20;raw.safeAreaFrame.x+=10;raw.safeAreaFrame.y+=20;
  raw.regionsIncludingInactive[0].frame.x+=10;raw.regionsIncludingInactive[0].frame.y+=20;
  raw.regionsIncludingInactive.push({kind:'division',active:false,
    frame:{x:10,y:400,width:400,height:40},margins:{top:20,bottom:20,left:0,right:0}});
  const state=captureState(raw),g=geometry(state);
  assert.equal(g.regions[0].frame.x,150);assert.equal(g.regions[0].frame.y,0);
  assert.equal(state.pose,'flat');assert.equal(g.division,null);
  raw.regionsIncludingInactive[1].active=true;
  assert.equal(captureState(raw).pose,'tabletop');
  assert.deepEqual(geometry(captureState(raw)).division,{x:0,y:380,width:400,height:40});
});
