/** Visual coordinates only. Millimetres must come from Operations, never raster pixels. */
export interface Box { x: number; y: number; width: number; height: number }
export interface PhysicalMeasurements { outerMm: readonly [number, number, number]; innerMm: readonly [number, number, number]; trayMm: readonly [number, number, number]; wallMm: number; evidence: string }
export interface CartonGeometry {
  id: string; version: number; capacity: number; label: string;
  approval: 'pending' | 'approved'; evidence: string;
  physical: PhysicalMeasurements | null;
  body: Box; floor: number; wallThickness: number;
  tray: { width: number; height: number; lidDepth: number; orientation: 'long-axis-depth' | 'long-axis-width'; /** Optional drawing style; omitted means the lidded box drawing. */ style?: 'flat-tray' };
  slots: readonly { id: string; x: number; y: number }[];
  insertionOrder: readonly string[];
  frontOpacity: number;
  branding: { x: number; y: number; width: number; height: number };
  flaps: { rear: string; left: string; right: string; front: string; closed: string };
}
const make = (id: string, levels: number, trayHeight: number): CartonGeometry => {
  const floor = 650; const top = floor - levels * trayHeight;
  const slots = Array.from({length: levels * 2}, (_, i) => ({id: `tray-${i+1}`, x: i % 2 === 0 ? 166 : 502, y: floor - (Math.floor(i / 2) + 1) * trayHeight}));
  return { id, version: 2, capacity: slots.length, label: id === 'bulk-6' ? '666×6' : '888×4',
    approval: 'pending', physical: null, evidence: id === 'bulk-6' ? 'Owner directive 2026-10-30: two columns, three levels' : 'Provisional two-column/two-level review draft; factory packing arrangement, measurements and owner geometry approval unverified',
    body: {x: 140, y: top, width: 720, height: floor-top}, floor, wallThickness: 10,
    tray: {width: 332, height: trayHeight, lidDepth: 22, orientation: 'long-axis-depth'}, slots, insertionOrder: slots.map(s=>s.id), frontOpacity: .17,
    branding: {x: 390, y: top + 12, width: 220, height: 112},
    flaps: {rear: `150,${top} 850,${top} 825,${top-110} 175,${top-110}`, left: `140,${top} 150,${top-70} 65,${top-150} 25,${top-95}`, right: `860,${top} 850,${top-70} 935,${top-150} 975,${top-95}`, front: `140,${top} 860,${top} 900,${top-12} 100,${top-12}`, closed: `140,${top} 860,${top} 850,${top-70} 150,${top-70}`}
  };
};
/** Layout drafts are available for review, never an eligibility/physical approval source. */
/**
 * RTC1×10: ten 300 × 210 × 32 mm trays in ONE vertical stack inside a 13 × 8.5 × 13 in internal carton (owner-confirmed).
 * Presentation scale 1.4 units/mm on both axes: carton 462 × 462 units, tray 420 × 45 (32 mm rounds 44.8 → 45; the stack is 450 of 462 units,
 * physical 320 of 330.2 mm). Pending: pack-and-close trial and approved artwork have not been performed.
 */
const makeStack = (id: string, levels: number): CartonGeometry => {
  const floor = 650, bw = 462, bh = 462, trayW = 420, trayH = 45, bx = (1000 - bw) / 2, top = floor - bh;
  const slots = Array.from({length: levels}, (_, i) => ({id: `tray-${i+1}`, x: bx + (bw - trayW) / 2, y: floor - (i + 1) * trayH}));
  return { id, version: 1, capacity: levels, label: 'RTC1×10', approval: 'pending', physical: null,
    evidence: 'Owner-confirmed one vertical stack of ten 300 x 210 x 32 mm trays; presentation scale 1.4 units/mm; pack-and-close trial NOT performed',
    body: {x: bx, y: top, width: bw, height: bh}, floor, wallThickness: 10,
    tray: {width: trayW, height: trayH, lidDepth: 14, orientation: 'long-axis-width', style: 'flat-tray'}, slots, insertionOrder: slots.map(s=>s.id), frontOpacity: .17,
    branding: {x: 390, y: top + 12, width: 220, height: 112},
    flaps: {rear: `${bx+10},${top} ${bx+bw-10},${top} ${bx+bw-35},${top-110} ${bx+35},${top-110}`, left: `${bx},${top} ${bx+10},${top-70} ${bx-75},${top-150} ${bx-115},${top-95}`, right: `${bx+bw},${top} ${bx+bw-10},${top-70} ${bx+bw+75},${top-150} ${bx+bw+115},${top-95}`, front: `${bx},${top} ${bx+bw},${top} ${bx+bw+40},${top-12} ${bx-40},${top-12}`, closed: `${bx},${top} ${bx+bw},${top} ${bx+bw-10},${top-70} ${bx+10},${top-70}`}
  };
};
export const CARTON_GEOMETRIES: readonly CartonGeometry[] = [make('bulk-6',3,104), make('888x4',2,126), makeStack('bulk-10',10)];
export function geometryErrors(g: CartonGeometry): string[] {
  const errors: string[] = [];
  const positive = (n: number) => Number.isFinite(n) && n > 0;
  if (!['pending','approved'].includes(g.approval) || !['long-axis-depth','long-axis-width'].includes(g.tray.orientation)) errors.push('state/orientation');
  if (!g.id || !Number.isSafeInteger(g.version) || g.version < 1 || !Number.isSafeInteger(g.capacity) || g.capacity < 1 || g.capacity > 100) errors.push('identity/capacity');
  if (![g.body.width,g.body.height,g.wallThickness,g.tray.width,g.tray.height,g.tray.lidDepth].every(positive) || ![g.body.x,g.body.y,g.floor,g.branding.x,g.branding.y,g.branding.width,g.branding.height].every(Number.isFinite) || g.floor !== g.body.y+g.body.height || g.wallThickness*2 >= Math.min(g.body.width,g.body.height)) errors.push('geometry');
  if (g.slots.length !== g.capacity || new Set(g.slots.map(s=>s.id)).size !== g.slots.length) errors.push('slots');
  if (g.insertionOrder.length !== g.capacity || new Set(g.insertionOrder).size !== g.capacity || g.insertionOrder.some(id=>!g.slots.some(s=>s.id===id))) errors.push('sequence');
  if (g.tray.lidDepth > g.tray.height || ![g.branding.width,g.branding.height].every(positive)) errors.push('geometry');
  for (const polygon of Object.values(g.flaps)) {
    const points = polygon.trim().split(/\s+/).map(p=>p.split(',').map(Number));
    if (points.length<3 || points.some(p=>p.length!==2 || !p.every(Number.isFinite))) errors.push('flaps');
  }
  if (!Number.isFinite(g.frontOpacity) || g.frontOpacity<0 || g.frontOpacity>1) errors.push('opacity');
  for (const s of g.slots) {
    if (!s.id || ![s.x,s.y].every(Number.isFinite) || s.x < g.body.x || s.y < g.body.y || s.x+g.tray.width>g.body.x+g.body.width || s.y+g.tray.height>g.floor) errors.push('bounds');
    if (s.y+g.tray.height !== g.floor && !g.slots.some(b=>b.x===s.x && b.y===s.y+g.tray.height)) errors.push('support');
    for (const b of g.slots) if (b!==s && s.x<b.x+g.tray.width && b.x<s.x+g.tray.width && s.y<b.y+g.tray.height && b.y<s.y+g.tray.height) errors.push('overlap');
  }
  // Supporting trays must precede supported trays in the insertion order.
  for (const id of g.insertionOrder) { const s=g.slots.find(s=>s.id===id); if (!s) continue;
    const below=g.slots.find(b=>b.x===s.x && b.y===s.y+g.tray.height);
    if (below && g.insertionOrder.indexOf(below.id)>g.insertionOrder.indexOf(id)) errors.push('support-order');
  }
  if (g.approval==='approved' && (!g.physical || !g.physical.evidence)) errors.push('physical-evidence');
  if (g.physical && (![...g.physical.outerMm,...g.physical.innerMm,...g.physical.trayMm,g.physical.wallMm].every(positive))) errors.push('physical-measurements');
  return [...new Set(errors)];
}
export function occupiedForFrame(g: CartonGeometry, frame: number): readonly string[] {
  if (geometryErrors(g).length || !Number.isSafeInteger(frame) || frame<1 || frame>g.capacity+2) throw new Error('Invalid carton frame');
  return g.insertionOrder.slice(0, Math.min(frame-1,g.capacity));
}
export function resolveGeometry(id: string, capacity: number, allowDraft=false): CartonGeometry | undefined {
  return CARTON_GEOMETRIES.find(g=>g.id===id && g.capacity===capacity && !geometryErrors(g).length && (allowDraft || g.approval==='approved'));
}
