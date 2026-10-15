import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {collectDirectory,collectDevice} from './collect.mjs';
import {parseCatalog} from '../assets/starter/device-kit/catalog.js';

function fixture(id='one') {
  const b={x:0,y:0,width:400,height:800},i={top:0,right:0,bottom:0,left:0};
  return {schemaVersion:1,id,capturedAt:'2026-10-15T00:00:00Z',source:{kind:'simulator',model:'synthetic-test',osVersion:'27.1',osBuild:'test',scannerVersion:'0.1'},
    configuration:{mode:'fullscreen',target:'test.view',orientation:'portrait',statusBarHidden:false,homeIndicatorAutoHidden:false,navigationBarVisible:false,toolbarVisible:false,tabBarVisible:false},
    units:'pt',coordinateSpace:'view-local',viewBounds:b,windowBounds:b,screenBounds:b,viewFrameInWindow:b,nativeBounds:b,safeAreaFrame:b,readableContentFrame:b,
    safeAreaInsets:i,layoutMargins:i,scale:1,nativeScale:1,regionsSupported:false,regionsIncludingInactive:[],
    traits:{horizontalSizeClass:'compact',verticalSizeClass:'regular',contentSizeCategory:'large',userInterfaceStyle:'light',layoutDirection:'ltr'}};
}
async function setup(t) {
  const root=await mkdtemp(join(process.env.TEST_TMPDIR||tmpdir(),'geometry-collect-test-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const input=join(root,'input'),output=join(root,'catalog');await mkdir(input);
  return {input,output,save:(name,capture)=>writeFile(join(input,name+'.json'),JSON.stringify(capture)),manifest:()=>readFile(join(output,'catalog.json'),'utf8')};
}
test('repeat collection is idempotent; equal measurements retain observations; changed configuration separates profiles',async t=>{
  const s=await setup(t);await s.save('one',fixture());
  assert.equal((await collectDirectory(s)).addedProfiles,1);
  const before=await s.manifest();assert.equal((await collectDirectory(s)).duplicates,1);assert.equal(await s.manifest(),before);
  const two=fixture('two');two.capturedAt='2026-10-16T00:00:00Z';await s.save('two',two);
  const three=fixture('three');three.configuration.target='embedded.view';await s.save('three',three);
  const result=await collectDirectory(s),catalog=parseCatalog(await s.manifest());
  assert.equal(result.addedObservations,2);assert.equal(result.totalProfiles,2);
  const grouped=catalog.profiles.find(p=>p.observations.length===2);assert.equal(grouped.capture.id,'two');
});
test('invalid batch, conflicting export ID and corrupt existing asset leave manifest unchanged',async t=>{
  const s=await setup(t);await s.save('one',fixture());await collectDirectory(s);const before=await s.manifest();
  await s.save('bad',{schemaVersion:999});await assert.rejects(collectDirectory(s),/unsupported schemaVersion/);assert.equal(await s.manifest(),before);
  await rm(join(s.input,'bad.json'));const altered=fixture();altered.source.osBuild='changed';await s.save('conflict',altered);
  await assert.rejects(collectDirectory(s),/Conflicting export ID/);assert.equal(await s.manifest(),before);
  await rm(join(s.input,'conflict.json'));
  const file=parseCatalog(before).profiles[0].observations[0].json;await writeFile(join(s.output,file),'{}');
  await assert.rejects(collectDirectory(s),/checksum mismatch/);assert.equal(await s.manifest(),before);
});
test('catalog rejects escaping asset paths; collector refuses malformed PNG and concurrent writer',async t=>{
  const s=await setup(t);await s.save('one',fixture());await collectDirectory(s);const catalog=JSON.parse(await s.manifest());
  catalog.profiles[0].observations[0].json='../outside.json';assert.throws(()=>parseCatalog(JSON.stringify(catalog)),/asset path/);
  await writeFile(join(s.input,'one.png'),'not a PNG');await assert.rejects(collectDirectory(s),/Invalid PNG/);
  await rm(join(s.input,'one.png'));await writeFile(join(s.output,'.collect.lock'),'test');
  await assert.rejects(collectDirectory(s),/locked/);
});
test('device collection uses an explicit target and CoreDevice arguments; staging directory is removed',async t=>{
  const s=await setup(t);let staging;
  const run=async(command,args)=>{
    assert.equal(command,'xcrun');assert.equal(args[args.indexOf('--device')+1],'test-physical-udid');
    assert.equal(args[args.indexOf('--domain-identifier')+1],'dev.soundblaster.apple-prototyping.scanner');
    staging=args[args.indexOf('--destination')+1];await mkdir(staging);await writeFile(join(staging,'geometry-one.json'),JSON.stringify(fixture()));
  };
  assert.equal((await collectDevice({device:'test-physical-udid',output:s.output,run})).addedObservations,1);
  await assert.rejects(readFile(join(staging,'geometry-one.json')),/ENOENT/);
  await assert.rejects(collectDevice({device:'',output:s.output,run}),/explicit device/);
});
