import { writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { CARTON_GEOMETRIES, occupiedForFrame } from '../src/lib/carton-geometry';
import { renderCartonSvg } from '../src/lib/carton-svg';
import { renderCartonExteriorSvg } from '../src/lib/carton-exterior-svg';
import { CARTON_PHYSICAL_SPECS } from '../src/lib/carton-physical-spec';
const dir='docs/carton-builder/evidence'; mkdirSync(dir,{recursive:true});
// Default appearance is shared with the live CartonVisual path.
const manifest=[];
for(const g of CARTON_GEOMETRIES) for(let f=1;f<=g.capacity+2;f++) {
 const occupied=occupiedForFrame(g,f); const svg=renderCartonSvg(g,occupied,f===g.capacity+2?'closed':'open');
 const file=`${g.id}-frame-${f}.svg`;writeFileSync(`${dir}/${file}`,svg);
 manifest.push({file,occupied,geometryVersion:g.version,physicalApproval:g.approval,sha256:createHash('sha256').update(svg).digest('hex')});
}
writeFileSync(`${dir}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');
writeFileSync(`${dir}/contact-sheet.html`,`<!doctype html><html lang="en"><meta charset="utf-8"><title>Carton visual review — draft</title><style>body{background:#f9f8f6;color:#49311e;font:16px system-ui}main{display:grid;grid-template-columns:repeat(4,1fr)}img{width:100%}figure{margin:8px}figcaption{padding:8px}</style><h1>Draft geometry — physical dimensions and owner approval pending</h1><main>${manifest.map(m=>`<figure><img src="${m.file}" alt="${m.file}, ${m.occupied.length} occupied slots"><figcaption>${m.file}: ${m.occupied.length} trays</figcaption></figure>`).join('')}</main></html>`);

// Supplementary physical exterior views (presentation only; not part of the 26 packing states).
const ext=CARTON_PHYSICAL_SPECS.map(sp=>{const svg=renderCartonExteriorSvg(sp);const file=`${sp.configId}-exterior.svg`;writeFileSync(`${dir}/${file}`,svg);return {file,sha256:createHash('sha256').update(svg).digest('hex')};});
writeFileSync(`${dir}/exterior-manifest.json`,JSON.stringify(ext,null,2)+'\n');
