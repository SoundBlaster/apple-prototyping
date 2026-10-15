import {test} from 'node:test';
import assert from 'node:assert/strict';
import {preset,presets} from '../assets/starter/device-kit/presets.js';
import {geometry,rotate,fitScale} from '../assets/starter/device-kit/geometry.js';

test('recorded Duo sizes and lane do not double-count safe area',()=>{
 const inner=geometry(preset('duo')),outer=geometry(preset('duoOuterPortrait'));
 assert.equal(inner.evidence,'simulator-measured');assert.equal(inner.state.width,951);
 assert.equal(outer.safe.right,84);assert.equal(outer.edgeLane,84);
 assert.equal(outer.state.width-outer.edgeLane,382);
 assert.equal(geometry(preset('duoOuterLeft')).safe.left,84);
});
test('rotate swaps full dimensions and fold axis without changing area',()=>{
 const start=preset('book'),table=rotate(start);
 assert.deepEqual([table.width,table.height,table.pose],[669,951,'tabletop']);
 assert.equal(table.width*table.height,start.width*start.height);
 assert.deepEqual(geometry(table).division,{x:0,y:455.5,width:669,height:40});
 assert.deepEqual(rotate(table),start);
});
test('flat inactive divisions never become barriers',()=>{
 assert.equal(geometry(preset('duo')).division,null);
 assert.equal(geometry(preset('duoPortrait')).division,null);
 assert.equal(geometry({...preset('duoOuter'),pose:'tabletop'}).division,null);
});
test('custom bounds do not reuse stale native rectangles',()=>{
 const result=geometry({...preset('duo'),width:952});
 assert.equal(result.exact,false);assert.equal(result.evidence,'fixture');
 assert.equal(result.sample,null);assert.deepEqual(result.regions,[]);
 assert.deepEqual(result.safe,{top:0,right:0,bottom:0,left:0});
 assert.equal(geometry(preset('largeFold')).evidence,'fixture');
});
test('simulated activation never mutates recorded samples',()=>{
 const state=preset('duoPortrait');
 const before=geometry(state),active=geometry(state,{cameraActive:true}),after=geometry(state);
 assert.ok(active.simulated);assert.deepEqual(after,before);
 assert.ok(active.regions.filter(r=>r.kind==='occlusion').every(r=>r.active));
});
test('all presets are valid; preview scaling preserves aspect at small widths',()=>{
 for(const id of Object.keys(presets)){
  const s=preset(id);assert.ok(geometry(s));
  const zoom=fitScale(s.width,s.height,300);
  assert.ok(zoom>0&&zoom<=1);assert.ok((s.width+20)*zoom<=300+1e-8);
 }
 assert.throws(()=>geometry({width:0,height:300}),RangeError);
 assert.throws(()=>preset('missing'),RangeError);
});
