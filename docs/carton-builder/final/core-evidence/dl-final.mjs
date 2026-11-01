import { createRequire } from 'node:module';
// Resolve @react-navigation/core from the repository root (run from the repo root: node docs/carton-builder/final/core-evidence/dl-final.mjs)
const require = createRequire(process.cwd() + '/');
const { getStateFromPath } = require('@react-navigation/core');
const cfg = { screens: { OrderDetail: 'order/:orderId', OrderConfirmation: 'order/:orderId/confirmation', CommunicationLog: 'communication/:entityId', CommercialReview: 'commercial-review' } };
const MAX=512, ESC=24; const safe=(p)=>typeof p==='string'&&p.length>0&&p.length<=MAX&&((p.match(/%/g)||[]).length<=ESC)&&!/%(?![0-9a-fA-F]{2})/.test(p);
const t=(p)=>{const s=process.hrtime.bigint();getStateFromPath(p,cfg);return +(Number(process.hrtime.bigint()-s)/1e6).toFixed(1)};
const rows=[];
for (const n of [24,100,200,400,800]) { const p='order/abc?q='+'%AA'.repeat(n); rows.push({ chars:p.length, escapes:n, unguarded_ms:t(p), guard_accepts:safe(p) }); }
console.log(JSON.stringify(rows,null,0));
