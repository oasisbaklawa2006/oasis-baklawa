import { CARTON_APPEARANCE } from './carton-appearance';
import { inchesToMm, type CartonPhysicalSpec } from './carton-physical-spec';
import type { CartonAppearance } from './carton-svg';

/**
 * SUPPLEMENTARY physical exterior view: a closed, opaque white printed carton in a fixed oblique (cabinet) projection.
 * Presentation only: it draws no trays, reads no packing geometry and never changes a packing state. Proportions come from the owner-confirmed
 * INTERNAL dimensions as a proxy (external dimensions are not supplied). Print layout is indicative, taken from the factory photographs
 * (FP-03, FP-07, FP-11); the Oasis logo is the existing authorised asset, not the factory's rounder gold disc, and the side-panel print is indicative.
 */
const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]!));
const SIDE_TITLE: Record<string, string> = { 'bulk-6': 'BURME , 666', '888x4': '888X4', 'bulk-10': 'RTC1×10' };
const CATEGORIES = ['BAKLAWA', 'FUSIONSWEETS', 'CHOCOLATES', 'KHALEEZI'] as const;
const DEPTH_SCALE = 0.5; // cabinet projection: depth drawn at half length, 30 degrees
const COS = Math.cos(Math.PI / 6), SIN = Math.sin(Math.PI / 6);
const r = (n: number) => Math.round(n * 100) / 100;

export function renderCartonExteriorSvg(spec: CartonPhysicalSpec, appearance: CartonAppearance = CARTON_APPEARANCE): string {
  if (!appearance.logoDataUri || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(appearance.logoDataUri)) throw new Error('Missing local carton artwork');
  const [L, B, H] = spec.cartonInches.map(inchesToMm) as [number, number, number];
  const kx = DEPTH_SCALE * COS, ky = -DEPTH_SCALE * SIN;
  const s = Math.min(760 / (L + kx * B), 520 / (H - ky * B));
  const w = L * s, h = H * s, dx = kx * B * s, dy = ky * B * s;
  const x0 = r((1000 - (w + dx)) / 2), y0 = r(650 - 0); // front-bottom-left corner (y grows downward)
  const topY = r(y0 - h);
  const P = (pts: [number, number][]) => pts.map(([x, y]) => `${r(x)},${r(y)}`).join(' ');
  const front = P([[x0, topY], [x0 + w, topY], [x0 + w, y0], [x0, y0]]);
  const side = P([[x0 + w, y0], [x0 + w + dx, y0 + dy], [x0 + w + dx, topY + dy], [x0 + w, topY]]);
  const top = P([[x0, topY], [x0 + w, topY], [x0 + w + dx, topY + dy], [x0 + dx, topY + dy]]);
  // Tape runs the long way along the centre seam of the top, as photographed.
  const mid = (a: number) => [x0 + dx * 0.5 + a, topY + dy * 0.5] as [number, number];
  const tw = Math.abs(dy) * 0.16;
  const tape = P([[mid(0)[0], mid(0)[1] - tw], [mid(w)[0], mid(w)[1] - tw], [mid(w)[0], mid(w)[1] + tw], [mid(0)[0], mid(0)[1] + tw]]);
  const seam = `M${r(mid(0)[0])},${r(mid(0)[1])}H${r(mid(w)[0])}`;
  // Front print (fractions of the front face; indicative).
  const fx = (f: number) => r(x0 + w * f), fy = (f: number) => r(topY + h * f);
  const aw = Math.max(10, w * 0.022), ah = (f0: number, f1: number) => [fy(f0), fy(f1)] as const;
  const arrow = (cx: number, y0a: number, y1a: number, width: number) => `<polygon points="${r(cx - width * 2.4)},${r(y0a + width * 3.4)} ${cx},${y0a} ${r(cx + width * 2.4)},${r(y0a + width * 3.4)} ${r(cx + width * 0.7)},${r(y0a + width * 3.4)} ${r(cx + width * 0.7)},${y1a} ${r(cx - width * 0.7)},${y1a} ${r(cx - width * 0.7)},${r(y0a + width * 3.4)}" fill="#2c1a12"/>`;
  const [aTop, aBot] = ah(0.25, 0.8), [bTop, bBot] = ah(0.2, 0.86);
  const logoW = w * 0.42, logoH = logoW * (271 / 501);
  const logo = `<image href="${esc(appearance.logoDataUri)}" x="${r(fx(0.455) - logoW / 2)}" y="${r(fy(0.5) - logoH / 2)}" width="${r(logoW)}" height="${r(logoH)}" preserveAspectRatio="xMidYMid meet"/>`;
  const fs = Math.max(8, h * 0.026);
  const vegS = Math.max(16, w * 0.052);
  const veg = `<rect x="${r(fx(0.9) - vegS / 2)}" y="${fy(0.1)}" width="${r(vegS)}" height="${r(vegS)}" fill="none" stroke="#2f8f3a" stroke-width="${r(vegS * 0.1)}"/><circle cx="${fx(0.9)}" cy="${r(Number(fy(0.1)) + vegS / 2)}" r="${r(vegS * 0.3)}" fill="#2f8f3a"/>`;
  const frontPrint = `${arrow(fx(0.145), aTop, aBot, aw * 0.7)}<text x="${fx(0.145)}" y="${r(aBot + fs * 1.5)}" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="${r(fs)}" fill="#2c1a12">THIS SIDE UP</text>${logo}${arrow(fx(0.8), bTop, bBot, aw)}<text x="${fx(0.8)}" y="${r(bBot + fs * 1.6)}" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="${r(fs)}" fill="#2c1a12">THIS SIDE UP</text>${veg}`;
  // Side print in the side face's own coordinates (u along the depth, w down from the top), sheared into the oblique plane.
  const sideLen = B * s, ux = dx / sideLen, uy = dy / sideLen;
  const f2 = Math.max(9, h * 0.034), rowGap = f2 * 2.05, boxS = f2 * 1.25;
  const rows = CATEGORIES.map((c, i) => `<text x="${r(sideLen * 0.1)}" y="${r(h * 0.36 + i * rowGap)}" font-family="sans-serif" font-weight="600" font-size="${r(f2)}" fill="#2c1a12">${c}</text><rect x="${r(sideLen * 0.86)}" y="${r(h * 0.36 + i * rowGap - boxS * 0.9)}" width="${r(boxS)}" height="${r(boxS)}" fill="none" stroke="#2c1a12" stroke-width="1.2"/>`).join('');
  const heightOpts = spec.printedHeightOptionsMm ? spec.printedHeightOptionsMm.map((mm, i) => `<text x="${r(sideLen * 0.1)}" y="${r(h * 0.13 + i * rowGap)}" font-family="sans-serif" font-weight="600" font-size="${r(f2 * 0.9)}" fill="#2c1a12">${mm}mm</text><rect x="${r(sideLen * 0.86)}" y="${r(h * 0.13 + i * rowGap - boxS * 0.9)}" width="${r(boxS)}" height="${r(boxS)}" fill="none" stroke="#2c1a12" stroke-width="1.2"/>`).join('') : '';
  const sidePrint = `<g transform="matrix(${r(ux * 1e4) / 1e4} ${r(uy * 1e4) / 1e4} 0 1 ${r(x0 + w)} ${r(topY)})"><text x="${r(sideLen * 0.1)}" y="${r(h * 0.1)}" font-family="sans-serif" font-weight="800" font-size="${r(f2 * 1.25)}" fill="#2c1a12">${esc(SIDE_TITLE[spec.configId] ?? spec.label)}</text>${heightOpts}${rows}</g>`;
  const label = `${spec.label} carton, closed exterior`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1000 750" role="img" aria-label="${esc(label)}" data-view="exterior-oblique-closed"><defs><linearGradient id="xf" x2="0" y2="1"><stop stop-color="#ffffff"/><stop offset="1" stop-color="#ece9e2"/></linearGradient><linearGradient id="xs" x2="1"><stop stop-color="#dcd9d2"/><stop offset="1" stop-color="#c9c5bc"/></linearGradient><linearGradient id="xt" x2="0" y2="1"><stop stop-color="#fbfaf7"/><stop offset="1" stop-color="#eeebe4"/></linearGradient><radialGradient id="xsh"><stop stop-color="#49311e" stop-opacity=".32"/><stop offset="1" stop-color="#49311e" stop-opacity="0"/></radialGradient><pattern id="xfl" width="8" height="3" patternUnits="userSpaceOnUse"><path d="M0,1.5h8" stroke="#b8b2a4" stroke-opacity=".18"/></pattern></defs><rect width="1000" height="750" fill="#f9f8f6"/><ellipse cx="${r(x0 + (w + dx) / 2 + 20)}" cy="${r(y0 + 18)}" rx="${r((w + dx) * 0.62)}" ry="${r(26)}" fill="url(#xsh)"/><polygon points="${top}" fill="url(#xt)" stroke="#bdb6a8" stroke-width="1.4"/><polygon points="${top}" fill="url(#xfl)"/><path d="${seam}" stroke="#b9b2a2" stroke-width="1"/><polygon data-layer="tape" points="${tape}" fill="#dfe6e8" fill-opacity=".62" stroke="#c4cdd0" stroke-opacity=".8"/><polygon points="${side}" fill="url(#xs)" stroke="#a79f90" stroke-width="1.4"/>${sidePrint}<polygon points="${front}" fill="url(#xf)" stroke="#bdb6a8" stroke-width="1.4"/>${frontPrint}</svg>`;
}
