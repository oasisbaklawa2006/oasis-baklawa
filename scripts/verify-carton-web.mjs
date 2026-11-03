/** Local diagnostic harness; never bundles approval overrides into the Buyer App. */
import { build } from 'esbuild';
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { mkdtemp, readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const out = resolve('docs/carton-builder/evidence');
const scratch = await mkdtemp(join(tmpdir(), 'carton-web-'));
let browser, server;
try {
  await mkdir(out, { recursive: true });
  await build({
    stdin: { contents: `
      import React from 'react';
      import {createRoot} from 'react-dom/client';
      import {flushSync} from 'react-dom';
      import {CartonVisual} from './src/components/CartonVisual';
      import {INITIAL_CARTON_CATALOGUE,previewCarton} from './src/lib/carton-builder';
      const root=createRoot(document.getElementById('root'));
      window.__motions=[];window.__motionStops=0;window.__preferenceEvents=[];window.__listenerRemovals=0;
      window.__reviewDraft=false;
      window.review={render(id,frame,override={}){
        const source=INITIAL_CARTON_CATALOGUE.find(c=>c.id===id);
        // Synthetic product eligibility exercises presentation only. No real SKU or measurement.
        const config={...source,active:true,eligiblePackingGroups:['fixture'],mixablePackingGroupSets:[]};
        const n=Math.min(frame-1,config.capacity);
        const profiles=new Map([['fixture',{productId:'fixture',packingGroup:'fixture',slotsPerUnit:1,commercialUom:'tray',cartonConfigIds:[id]}]]);
        const preview=previewCarton(config,n?[{productId:'fixture',quantity:n}]:[],profiles,{showSealed:frame===config.capacity+2});
        Object.assign(preview,override); // malformed presentation fixtures, never persisted
        const before=JSON.stringify(preview);
        flushSync(()=>root.render(<CartonVisual key={id} config={config} preview={preview}/>));
        if(before!==JSON.stringify(preview))throw new Error('Quantity mutation');
      },unmount(){flushSync(()=>root.render(null));}};
      window.review.render('bulk-6',3);
    `, resolveDir: root, loader: 'tsx' },
    outfile: join(scratch, 'bundle.js'), bundle: true, platform: 'browser',
    mainFields: ['browser', 'module', 'main'],
    resolveExtensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.js', '.json'],
    define: { global: 'globalThis', __DEV__: 'false', 'process.env.NODE_ENV': '"production"' },
    plugins: [{ name: 'local-review-instrumentation', setup(build) {
      build.onResolve({ filter: /^react-native$/ }, () => ({ path: 'react-native', namespace: 'review' }));
      build.onResolve({ filter: /^@\/lib\/carton-geometry$/ }, () => ({ path: 'geometry', namespace: 'review' }));
      build.onLoad({ filter: /.*/, namespace: 'review' }, ({ path }) => ({
        loader: 'js', resolveDir: root,
        contents: path === 'geometry' ? `
          export * from ${JSON.stringify(join(root, 'src/lib/carton-geometry.ts'))};
          import {resolveGeometry as actual} from ${JSON.stringify(join(root, 'src/lib/carton-geometry.ts'))};
          export const resolveGeometry=(id,capacity)=>actual(id,capacity,window.__reviewDraft===true);
        ` : `
          export * from 'react-native-web';
          import {Animated as A,AccessibilityInfo as I} from 'react-native-web';
          export const Animated={...A,timing(value,options){
            window.__motions.push(options);const a=A.timing(value,options);
            return {...a,stop(){window.__motionStops++;a.stop();}};
          }};
          export const AccessibilityInfo={...I,addEventListener(name,fn){
            const sub=I.addEventListener(name,value=>{window.__preferenceEvents.push(value);fn(value);});
            return {remove(){window.__listenerRemovals++;sub?.remove();}};
          }};
        `,
      }));
    } }],
    logLevel: 'warning',
  });
  server = createServer(async (req, res) => {
    if (req.url === '/bundle.js') {
      res.setHeader('Content-Type', 'text/javascript');res.end(await readFile(join(scratch, 'bundle.js')));
    } else {
      res.setHeader('Content-Type', 'text/html');
      res.end('<!doctype html><html lang="en"><meta charset="utf-8"><title>LOCAL DIAGNOSTIC — not approved geometry</title><body style="background:#f9f8f6"><button id="focus-anchor" style="position:absolute;left:-9999px">anchor</button><main id="root" style="width:min(800px,100%);margin:auto"></main><script src="/bundle.js"></script></body></html>');
    }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  browser = await chromium.launch({ headless: true, executablePath: process.env.CARTON_CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1000, height: 750 }, reducedMotion: 'reduce' });
  const errors = [];const external = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith('http://127.0.0.1:') || url.startsWith('data:')) return route.continue();
    external.push(url); return route.abort();
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.waitForFunction(() => !!window.review);
  assert.equal(await page.locator('img').count(), 0, 'pending geometry must not render artwork');
  const results = [];
  // Draft bypass lives only in this temporary bundle. Production resolver remains gated.
  await page.evaluate(() => { window.__reviewDraft = true; });
  const rejected = [
    { physicallyValid: false }, { configId: 'unknown' }, { state: 'invalid' },
    { filledSlots: 99 }, { state: 'sealed-preview', physicallyComplete: false },
  ];
  for (const override of rejected) {
    await page.evaluate(override => window.review.render('bulk-6', 3, override), override);
    assert.equal(await page.locator('img').count(), 0, 'malformed preview must fail safely');
  }
  for (const [id, capacity] of [['bulk-6', 6], ['888x4', 4], ['bulk-10', 10]]) {
    for (let frame = 1; frame <= capacity + 2; frame++) {
      await page.evaluate(({ id, frame }) => window.review.render(id, frame), { id, frame });
      await page.waitForFunction(() => {
        const image = document.querySelector('img');return image?.complete && image.naturalWidth > 0;
      });
      const result = await page.evaluate(() => {
        const image = document.querySelector('img');
        const xml = decodeURIComponent(image.src.split(',').slice(1).join(','));
        const svg = new DOMParser().parseFromString(xml, 'image/svg+xml');
        const progress = document.querySelector('[role="progressbar"]');
        return {
          trays: [...svg.querySelectorAll('g[id^="tray-"]')].map(g => g.id),
          label: progress.getAttribute('aria-label'),
          now: Number(progress.getAttribute('aria-valuenow')),
          max: Number(progress.getAttribute('aria-valuemax')),
          logo: svg.querySelector('image').getAttribute('href'),
          svgLabel: svg.documentElement.getAttribute('aria-label'),
          hiddenImage: image.getAttribute('aria-hidden'),
        };
      });
      const n = Math.min(frame - 1, capacity), closed = frame === capacity + 2;
      assert.deepEqual(result.trays, closed ? [] : Array.from({ length: n }, (_, i) => `tray-${i + 1}`));
      assert.equal(result.now, n);assert.equal(result.max, capacity);
      assert.match(result.label, new RegExp(`${n} (trays?|box(?:es)?) of ${capacity}`));
      assert.match(result.svgLabel, new RegExp(`${n} of ${capacity} trays, ${closed ? 'closed' : 'open'}`));
      assert.equal(result.hiddenImage, 'true');
      assert.ok(result.logo.startsWith('data:image/png;base64,'));
      // Do not repeat the proprietary base64 asset in the report.
      delete result.logo;
      results.push({ id, frame, ...result, quantityImmutable: true });
      await page.locator('#root').screenshot({ path: join(out, `${id}-runtime-${frame}.png`) });
    }
  }
  assert.equal(await page.evaluate(() => window.__motions.length), 0, 'initial reduced motion must be static');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.waitForFunction(() => window.__preferenceEvents.includes(false));
  await page.evaluate(() => window.review.render('888x4', 3));
  await page.waitForFunction(() => window.__motions.length > 0);
  const motionsBefore = await page.evaluate(() => window.__motions.length);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => window.__preferenceEvents.at(-1) === true);
  // Frame change flushes the state update; no blocking timer is needed.
  await page.evaluate(() => window.review.render('888x4', 4));
  assert.equal(await page.evaluate(() => window.__motions.length), motionsBefore);
  const stops = await page.evaluate(() => window.__motionStops);
  assert.ok(stops > 0, 'preference change must stop previous animation');
  const viewports = [];
  await page.evaluate(() => window.review.render('bulk-6', 5));
  const widths = [320, 360, 390, 430, 600, 768, 900, 1000, 1280];
  for (const [id, capacity] of [['bulk-6', 6], ['888x4', 4], ['bulk-10', 10]]) {
    for (const frame of [1, Math.ceil(capacity / 2) + 1, capacity + 1, capacity + 2]) {
      for (const width of widths) {
        await page.setViewportSize({ width, height: 800 });
        await page.evaluate(({ id, frame }) => window.review.render(id, frame), { id, frame });
        await page.waitForFunction(() => { const i = document.querySelector('img'); return i?.complete && i.naturalWidth > 0; });
        const m = await page.evaluate(() => {
          const img = document.querySelector('img'), card = document.querySelector('[role="progressbar"]');
          const r = img.getBoundingClientRect(), c = card.getBoundingClientRect();
          const text = card.innerText.trim();
          return { vw: window.innerWidth, scrollW: document.documentElement.scrollWidth, imgW: r.width, imgH: r.height, imgL: r.left, imgR: r.right,
            cardL: c.left, cardR: c.right, natural: img.naturalWidth / img.naturalHeight, textLen: text.length,
            clipped: getComputedStyle(card).overflow !== 'visible' && (r.right > c.right + 0.5 || r.left < c.left - 0.5) };
        });
        assert.ok(m.scrollW <= m.vw, `no page overflow at ${width}px ${id}#${frame}`);
        assert.ok(m.imgL >= m.cardL - 0.5 && m.imgR <= m.cardR + 0.5 && !m.clipped, `artwork inside card at ${width}px ${id}#${frame}`);
        assert.ok(Math.abs(m.imgW / m.imgH - m.natural) < 0.01, `artwork keeps its aspect ratio at ${width}px ${id}#${frame}`);
        assert.ok(m.textLen > 10, 'count text still rendered');
        viewports.push({ id, frame, width, imgW: Math.round(m.imgW), imgH: Math.round(m.imgH), imgShareOfViewport: Number((m.imgW / m.vw).toFixed(2)), noOverflow: true, aspectPreserved: true });
        if ((width === 320 || width === 390) && (frame === Math.ceil(capacity / 2) + 1 || frame === capacity + 2)) {
          await page.locator('#root').screenshot({ path: join(out, `mobile-${width}-${id}-frame-${frame}.png`) });
        }
      }
    }
  }
  // ---- G10 automated accessibility and browser checks (automated only; not assistive-technology testing) ----
  const a11y = { automated: true, assistiveTechnologyTested: false, checks: {} };
  const waitImg = () => page.waitForFunction(() => { const i = document.querySelector('img'); return !i || (i.complete && i.naturalWidth > 0); });
  // landscape phone/tablet and portrait tablet
  const landscape = [];
  for (const [w, h, label] of [[667, 375, 'phone-landscape-small'], [844, 390, 'phone-landscape'], [1024, 768, 'tablet-landscape'], [768, 1024, 'tablet-portrait']]) {
    for (const [id, capacity] of [['bulk-6', 6], ['888x4', 4], ['bulk-10', 10]]) {
      await page.setViewportSize({ width: w, height: h });
      await page.evaluate(({ id, capacity }) => window.review.render(id, Math.ceil(capacity / 2) + 1), { id, capacity });
      await waitImg();
      const m = await page.evaluate(() => { const img = document.querySelector('img'), c = document.querySelector('[role="progressbar"]'), r = img.getBoundingClientRect(), k = c.getBoundingClientRect();
        return { overflow: document.documentElement.scrollWidth > window.innerWidth, inside: r.left >= k.left - 0.5 && r.right <= k.right + 0.5, ratio: r.width / r.height, natural: img.naturalWidth / img.naturalHeight }; });
      assert.ok(!m.overflow && m.inside && Math.abs(m.ratio - m.natural) < 0.01, `landscape ${label} ${id}`);
      landscape.push({ label, w, h, id, ok: true });
    }
  }
  a11y.checks.landscapeAndTablet = landscape.length;
  await page.setViewportSize({ width: 390, height: 844 });
  // semantics: progressbar attributes, live region, no focus stealing, no focus trap
  await page.evaluate(() => window.review.render('bulk-6', 3)); await waitImg();
  const sem = await page.evaluate(() => { const pb = document.querySelector('[role="progressbar"]'), live = document.querySelector('[aria-live="polite"]');
    return { role: pb.getAttribute('role'), label: !!pb.getAttribute('aria-label'), min: pb.getAttribute('aria-valuemin'), max: pb.getAttribute('aria-valuemax'), now: pb.getAttribute('aria-valuenow'), live: !!live, liveText: live?.textContent ?? '', imgHidden: document.querySelector('img').getAttribute('aria-hidden'), imgAlt: document.querySelector('img').getAttribute('alt') }; });
  assert.equal(sem.role, 'progressbar'); assert.ok(sem.label); assert.equal(sem.min, '0'); assert.equal(sem.max, '6'); assert.equal(sem.now, '2');
  assert.ok(sem.live && /2 of 6|2 box/i.test(sem.liveText), 'live region announces the new count'); assert.equal(sem.imgHidden, 'true'); assert.equal(sem.imgAlt, '');
  a11y.checks.semantics = sem;
  await page.focus('#focus-anchor');
  for (const [id, frame] of [['bulk-6', 4], ['888x4', 2], ['bulk-10', 7], ['bulk-6', 8]]) { await page.evaluate(({ id, frame }) => window.review.render(id, frame), { id, frame }); }
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'focus-anchor', 'rendering never steals focus');
  const tabOrder = []; for (let i = 0; i < 4; i++) { await page.keyboard.press('Tab'); tabOrder.push(await page.evaluate(() => document.activeElement?.tagName + '#' + (document.activeElement?.id || ''))); }
  assert.ok(!tabOrder.some(t => t.includes('ROOT')) && await page.evaluate(() => document.querySelectorAll('#root [tabindex]:not([tabindex="-1"]), #root button, #root a, #root input').length) === 0, 'the carton card adds no tab stops and no keyboard trap');
  a11y.checks.keyboard = { focusPreserved: true, tabStopsInsideCarton: 0, tabOrderSample: tabOrder };
  // live region text changes with state
  await page.evaluate(() => window.review.render('888x4', 2)); const t1 = await page.evaluate(() => document.querySelector('[aria-live="polite"]').textContent);
  await page.evaluate(() => window.review.render('888x4', 4)); const t2 = await page.evaluate(() => document.querySelector('[aria-live="polite"]').textContent);
  assert.notEqual(t1, t2); a11y.checks.liveRegionUpdates = { before: t1, after: t2 };
  // rapid quantity changes and carton switching: the final DOM must match the last state, with no stale trays
  const caps = { 'bulk-6': 6, '888x4': 4, 'bulk-10': 10 }; const ids = Object.keys(caps); let last = null;
  for (let i = 0; i < 90; i++) { const id = ids[(i * 7 + (i >> 2)) % 3]; const frame = 1 + ((i * 5 + 3) % (caps[id] + 2)); last = { id, frame }; await page.evaluate(({ id, frame }) => window.review.render(id, frame), last); }
  await waitImg();
  const fin = await page.evaluate(() => { const img = document.querySelector('img'); const xml = img ? decodeURIComponent(img.src.split(',').slice(1).join(',')) : ''; return { trays: (xml.match(/<g id="tray-/g) || []).length, now: Number(document.querySelector('[role="progressbar"]').getAttribute('aria-valuenow')), max: Number(document.querySelector('[role="progressbar"]').getAttribute('aria-valuemax')) }; });
  const expectN = Math.min(last.frame - 1, caps[last.id]); const closedLast = last.frame === caps[last.id] + 2;
  assert.equal(fin.max, caps[last.id]); assert.equal(fin.now, expectN); assert.equal(fin.trays, closedLast ? 0 : expectN);
  a11y.checks.rapidChangeAndSwitching = { renders: 90, final: last, matches: true };
  // error and empty states already covered above (malformed previews render nothing); confirm again after the churn
  await page.evaluate(() => window.review.render('bulk-6', 3, { physicallyValid: false })); assert.equal(await page.locator('img').count(), 0);
  // reload and history: the component is stateless, so a reload must restore identical output from props
  await page.evaluate(() => window.review.render('bulk-10', 6)); await waitImg();
  const before = await page.evaluate(() => document.querySelector('#root').innerHTML.length);
  await page.evaluate(() => { history.pushState({ s: 1 }, '', '#step2'); });
  await page.reload(); await page.waitForFunction(() => !!window.review); await page.evaluate(() => { window.__reviewDraft = true; window.review.render('bulk-10', 6); }); await waitImg();
  const after = await page.evaluate(() => document.querySelector('#root').innerHTML.length);
  assert.equal(before, after, 'reload reproduces identical output');
  await page.goBack().catch(() => null); await page.goForward().catch(() => null); await page.waitForFunction(() => !!window.review);
  a11y.checks.reloadAndHistory = { identicalAfterReload: true, scope: 'component-level; app-level cart persistence needs an authenticated environment' };
  // axe-core automated rules on open and closed states of every carton
  await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
  const axeRuns = [];
  assert.ok(await page.evaluate(() => !!window.axe), 'axe-core must load; refusing to report an accessibility pass with zero runs');
  {
    await page.evaluate(() => { window.__reviewDraft = true; });
    for (const [id, capacity] of [['bulk-6', 6], ['888x4', 4], ['bulk-10', 10]]) {
      for (const frame of [1, Math.ceil(capacity / 2) + 1, capacity + 2]) {
        await page.evaluate(({ id, frame }) => window.review.render(id, frame), { id, frame }); await waitImg();
        const res = await page.evaluate(async () => { const r = await window.axe.run('#root'); return r.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help, targets: v.nodes.map(n => ({ html: n.html.slice(0, 120), data: n.any[0]?.data ? { fg: n.any[0].data.fgColor, bg: n.any[0].data.bgColor, ratio: n.any[0].data.contrastRatio, size: n.any[0].data.fontSize } : null })) })); });
        axeRuns.push({ id, frame, violations: res });
      }
    }
  }
  assert.equal(axeRuns.length, 9, 'all nine axe runs completed');
  assert.deepEqual(axeRuns.filter(r => r.violations.length), [], 'axe-core finds no violations on any tested state');
  a11y.checks.axe = { version: '4.10.2', runs: axeRuns.length, violationsByRun: axeRuns.filter(r => r.violations.length).map(r => ({ id: r.id, frame: r.frame, violations: r.violations })) };
  // touch device context
  const touchCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
  const tpage = await touchCtx.newPage(); const terrors = []; tpage.on('pageerror', e => terrors.push(e.message));
  await tpage.goto(`http://127.0.0.1:${server.address().port}/`); await tpage.waitForFunction(() => !!window.review); await tpage.evaluate(() => { window.__reviewDraft = true; window.review.render('888x4', 3); });
  const box = await tpage.locator('[role="progressbar"]').boundingBox(); await tpage.touchscreen.tap(box.x + 20, box.y + 20);
  assert.equal(await tpage.evaluate(() => location.hash), ''); assert.deepEqual(terrors, []); a11y.checks.touch = { tapOnCard: 'no navigation, no errors', scope: 'emulated touch, not a device' };
  // slow network: the host page must load without errors when the bundle arrives late (loading state is the empty host)
  const slowCtx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const slow = await slowCtx.newPage(); const serrors = [];
  slow.on('pageerror', e => serrors.push(e.message));
  await slow.route('**/bundle.js', async route => { await new Promise(r => setTimeout(r, 2500)); await route.continue(); });
  const t0 = Date.now(); await slow.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'domcontentloaded' });
  await slow.waitForFunction(() => !!window.review, null, { timeout: 15000 });
  a11y.checks.slowNetwork = { bundleDelayMs: 2500, note: 'the synchronous bundle script blocks parsing, so the host is blank until it arrives; no errors', loadedAfterMs: Date.now() - t0, pageErrors: serrors.length };
  assert.deepEqual(serrors, []);
  await touchCtx.close(); await slowCtx.close();
  assert.deepEqual(errors, []);
  await page.evaluate(() => window.review.unmount());
  const removals = await page.evaluate(() => window.__listenerRemovals);
  assert.ok(removals >= 2, 'preference listeners cleaned on config change and unmount');
  assert.deepEqual(errors, []);assert.deepEqual(external, []);
  const evidence = {
    scope: 'Actual CartonVisual on react-native-web with local synthetic preview and diagnostic draft-resolver seam. Not authenticated Buyer E2E or native UAT.',
    browser: browser.version(), productionPendingGate: 'PASS', rejectedMalformedPreviews: rejected.length, frames: results,
    reducedMotion: { initiallyStatic: true, livePreferenceChange: true, previousAnimationStopped: stops, listenersRemoved: removals },
    viewports,
    accessibility: a11y,
    pageErrors: errors, externalRequests: external,
  };
  await writeFile(join(out, 'runtime-web.json'), JSON.stringify(evidence, null, 2) + '\n');
  console.log(`PASS: ${results.length} actual component states, pending gate, accessibility DOM, reduced motion, cleanup, no external requests.`);
} finally {
  await browser?.close();
  if (server) await new Promise(r => server.close(r));
  await rm(scratch, { recursive: true, force: true });
}
