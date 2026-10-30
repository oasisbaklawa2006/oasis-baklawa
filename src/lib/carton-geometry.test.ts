import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { CARTON_GEOMETRIES, geometryErrors, occupiedForFrame, resolveGeometry } from './carton-geometry';
import { renderCartonSvg } from './carton-svg';
for(const g of CARTON_GEOMETRIES) {
  test(`${g.label}: every frame count and coordinates are deterministic`,()=>{
    assert.deepEqual(geometryErrors(g),[]);
    for(let frame=1;frame<=g.capacity+2;frame++) {
      const slots=occupiedForFrame(g,frame); const state=frame===g.capacity+2?'closed':'open';
      const before=JSON.stringify(g); const svg=renderCartonSvg(g,slots,state);
      assert.equal(svg,renderCartonSvg(g,slots,state)); assert.equal(JSON.stringify(g),before);
      assert.equal((svg.match(/<g id="tray-/g)||[]).length,state==='closed'?0:Math.min(frame-1,g.capacity));
      for(const s of g.slots) assert.equal(svg.includes(`id="${s.id}"`),state==='open' && slots.includes(s.id));
      assert.match(svg,new RegExp(`${slots.length} of ${g.capacity} trays`));
    }
    assert.equal(resolveGeometry(g.id,g.capacity),undefined); // physical approval absent
    assert.equal(resolveGeometry(g.id,g.capacity,true),g);
    assert.throws(()=>renderCartonSvg(g,[], 'closed'));
    assert.throws(()=>renderCartonSvg(g,['tray-3'],'open'));
    assert.throws(()=>renderCartonSvg(g,['tray-1','tray-1'],'open'));
    assert.throws(()=>renderCartonSvg(g,['unknown'],'open'));
    assert.throws(()=>occupiedForFrame(g,NaN));
  });
  test(`${g.label}: rejects invalid geometry, slot identity, bounds and support order`,()=>{
    assert.ok(geometryErrors({...g,capacity:0}).length);
    assert.ok(geometryErrors({...g,slots:[g.slots[0],g.slots[0]]}).length);
    assert.ok(geometryErrors({...g,slots:g.slots.map((s,i)=>i===0?{...s,x:-10}:s)}).includes('bounds'));
    assert.ok(geometryErrors({...g,tray:{...g.tray,height:NaN}}).length);
    assert.ok(geometryErrors({...g,insertionOrder:[...g.insertionOrder].reverse()}).includes('support-order'));
    assert.ok(geometryErrors({...g,approval:'approved'}).includes('physical-evidence'));
    assert.equal(resolveGeometry(g.id,99,true),undefined);
  });
}
test('nonuniform translated layout does not require renderer changes',()=>{
 const g=structuredClone(CARTON_GEOMETRIES[0]); g.id='future-review'; g.slots=g.slots.map(s=>({...s,x:s.x+2}));
 assert.deepEqual(geometryErrors(g),[]); assert.match(renderCartonSvg(g,['tray-1'],'open'),/x="168"/);
});

test('all fourteen committed vector snapshots match current serializer',async()=>{

 const manifest=JSON.parse(readFileSync('docs/carton-builder/evidence/manifest.json','utf8')) as {file:string;occupied:string[];sha256:string}[];
 const logoDataUri='data:image/png;base64,'+readFileSync('assets/carton-builder/oasis-reference-oval.png').toString('base64');
 assert.equal(manifest.length,14);
 for(const g of CARTON_GEOMETRIES) for(let frame=1;frame<=g.capacity+2;frame++) {
  const m=manifest.find(m=>m.file===`${g.id}-frame-${frame}.svg`)!;
  const svg=renderCartonSvg(g,occupiedForFrame(g,frame),frame===g.capacity+2?'closed':'open',{logoDataUri});
  assert.equal(createHash('sha256').update(svg).digest('hex'),m.sha256);
  assert.equal(readFileSync(`docs/carton-builder/evidence/${m.file}`,'utf8'),svg);
 }
});
