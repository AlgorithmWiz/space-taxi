import {test} from 'node:test';
import assert from 'node:assert/strict';
import {modelFit, PROP_FITS} from '../src/model-fit.js';

test('freestanding props preserve proportions despite shallow fallback depth',()=>{
  const scale=modelFit([2,4,1],[3,6,.2],PROP_FITS.crystalSwitch);
  assert.deepEqual(scale,[1.5,1.5,1.5]);
});
test('obstacle silhouettes preserve collision width and height without flattening depth',()=>{
  assert.deepEqual(modelFit([2,4,1],[3,12,.2],PROP_FITS.pine),[1.5,3,1.5]);
});
test('landing surfaces and walls retain exact collision dimensions',()=>{
  const source=[2,.2,1], target=[12,.6,3.5];
  const scale=modelFit(source,target);
  scale.forEach((s,i)=>assert.ok(Math.abs(s*source[i]-target[i])<1e-10));
});
