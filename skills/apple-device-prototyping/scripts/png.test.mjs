import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validatePNG} from './png.mjs';

const capture={viewBounds:{width:1,height:1},scale:1};
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==','base64');
test('complete screenshot validates; truncated data, missing IEND and corrupted CRC are rejected',()=>{
  assert.doesNotThrow(()=>validatePNG(png,capture));
  assert.throws(()=>validatePNG(png.subarray(0,24),capture),/Invalid PNG/);
  assert.throws(()=>validatePNG(png.subarray(0,-12),capture),/missing IEND/);
  const corrupt=Buffer.from(png);corrupt[45]^=1;
  assert.throws(()=>validatePNG(corrupt,capture),/CRC/);
});
test('valid chunk CRCs do not conceal invalid image data or scanlines',()=>{
  for(const encoded of [
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAABklEQVRicm9rZW5jnxQXAAAAAElFTkSuQmCC',
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGP4DwABAQEAsTj2FAAAAABJRU5ErkJggg==',
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP9z8DwHwAFGQIEfQUW8QAAAABJRU5ErkJggg=='
  ])assert.throws(()=>validatePNG(Buffer.from(encoded,'base64'),capture),/Invalid PNG: (image data|scanline filter)/);
});
