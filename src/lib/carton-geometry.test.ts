import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { CARTON_GEOMETRIES, geometryErrors, occupiedForFrame, resolveGeometry } from './carton-geometry';
import { renderCartonSvg } from './carton-svg';
import { CARTON_APPEARANCE, CARTON_IVORY, OPEN_BRANDING_OPACITY } from './carton-appearance';
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

test('runtime defaults and evidence use identical local artwork without an invented fallback',()=>{
 const g=CARTON_GEOMETRIES[0];
 const svg=renderCartonSvg(g,[], 'open');
 assert.equal(svg,renderCartonSvg(g,[], 'open', CARTON_APPEARANCE));
 assert.ok(svg.includes(CARTON_APPEARANCE.logoDataUri));
 assert.equal(createHash('sha256').update(Buffer.from(CARTON_APPEARANCE.logoDataUri.split(',')[1],'base64')).digest('hex'),
   '3395c2ed5f41e159a3d849ef08faebbd1961e110db730cdca1a75f7f8ecbb884');
 assert.match(svg,/preserveAspectRatio="xMidYMid meet"/);
 assert.ok(!svg.includes('font-style="italic"'));
 for(const logoDataUri of ['', 'https://example.test/logo.png', 'data:image/svg+xml,<script/>', 'data:image/png;base64,x" onload="x']) {
   assert.throws(()=>renderCartonSvg(g,[], 'open',{logoDataUri}));
 }
 assert.throws(()=>renderCartonSvg(g,[], 'unknown' as 'open'));
});

test('branding watermark and ivory closure do not depend on tray occupancy',()=>{
 for(const g of CARTON_GEOMETRIES) {
   const groups=[];
   for(let n=0;n<=g.capacity;n++) {
     const svg=renderCartonSvg(g,g.insertionOrder.slice(0,n),'open');
     const group=svg.match(/<g data-layer="branding".*?<\/g>/)![0];
     groups.push(group);
     assert.ok(group.includes(`opacity="${OPEN_BRANDING_OPACITY}"`));
   }
   assert.equal(new Set(groups).size,1);
   assert.ok(OPEN_BRANDING_OPACITY<=.2, 'open printing must let at least 80% of underlying light through');
   const closed=renderCartonSvg(g,g.insertionOrder,'closed');
   assert.match(closed,/<g data-layer="branding" opacity="1">/);
   assert.ok(closed.includes(`data-layer="closed-top" points="${g.flaps.closed}" fill="${CARTON_IVORY}"`));
   assert.ok(!closed.includes('<g id="tray-'));
 }
});

test('audited carton dimensions, floor, tray and slot positions are unchanged',()=>{
 for(const g of CARTON_GEOMETRIES) {
   const h=g.id==='bulk-6'?104:126; const levels=g.capacity/2;
   assert.deepEqual(g.body,{x:140,y:650-levels*h,width:720,height:levels*h});
   assert.equal(g.floor,650);
   assert.deepEqual(g.tray,{width:332,height:h,lidDepth:22,orientation:'long-axis-depth'});
   for(let i=0;i<g.capacity;i++) assert.deepEqual(g.slots[i],{id:`tray-${i+1}`,x:i%2===0?166:502,y:650-(Math.floor(i/2)+1)*h});
 }
});

test('rejects malformed flap coordinates, lid geometry and approval state',()=>{
 const g=CARTON_GEOMETRIES[0];
 assert.ok(geometryErrors({...g,flaps:{...g.flaps,front:'0,0 1,NaN 2,2'}}).includes('flaps'));
 assert.ok(geometryErrors({...g,flaps:{...g.flaps,front:'0,0 1,1'}}).includes('flaps'));
 assert.ok(geometryErrors({...g,tray:{...g.tray,lidDepth:500}}).includes('geometry'));
 assert.ok(geometryErrors({...g,approval:'unknown' as 'pending'}).includes('state/orientation'));
});

test('all fourteen committed vector snapshots match current serializer',async()=>{

 const manifest=JSON.parse(readFileSync('docs/carton-builder/evidence/manifest.json','utf8')) as {file:string;occupied:string[];sha256:string}[];

 assert.equal(manifest.length,14);
 for(const g of CARTON_GEOMETRIES) for(let frame=1;frame<=g.capacity+2;frame++) {
  const m=manifest.find(m=>m.file===`${g.id}-frame-${frame}.svg`)!;
  const svg=renderCartonSvg(g,occupiedForFrame(g,frame),frame===g.capacity+2?'closed':'open');
  assert.equal(createHash('sha256').update(svg).digest('hex'),m.sha256);
  assert.equal(readFileSync(`docs/carton-builder/evidence/${m.file}`,'utf8'),svg);
 }
});
