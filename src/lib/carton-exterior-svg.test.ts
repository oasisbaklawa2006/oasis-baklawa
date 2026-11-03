import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderCartonExteriorSvg } from "./carton-exterior-svg";
import { CARTON_PHYSICAL_SPECS, inchesToMm } from "./carton-physical-spec";
import { CARTON_APPEARANCE } from "./carton-appearance";

describe("supplementary exterior view", () => {
  for (const spec of CARTON_PHYSICAL_SPECS) {
    it(`${spec.label}: deterministic, self-contained, opaque closed carton with tape, logo, arrows and vegetarian mark`, () => {
      const a = renderCartonExteriorSvg(spec), b = renderCartonExteriorSvg(spec);
      assert.equal(a, b);
      assert.match(a, /data-view="exterior-oblique-closed"/);
      assert.match(a, /data-layer="tape"/);
      assert.ok(a.includes(CARTON_APPEARANCE.logoDataUri));
      assert.equal((a.match(/THIS SIDE UP/g) || []).length, 2);
      assert.ok(!/https?:\/\//.test(a.replace('xmlns="http://www.w3.org/2000/svg"', '')), 'no remote references');
      assert.ok(!a.includes('<g id="tray-'), 'draws no packing state');
      assert.ok(!a.includes('fill-opacity=".17"'), 'no transparent-front treatment');
    });
    it(`${spec.label}: front-face proportions follow the confirmed internal length:height`, () => {
      const svg = renderCartonExteriorSvg(spec);
      const m = svg.match(/<polygon points="([^"]+)" fill="url\(#xf\)"/)![1].split(" ").map((p) => p.split(",").map(Number));
      const width = m[1][0] - m[0][0], height = m[2][1] - m[1][1];
      const [L, , H] = spec.cartonInches.map(inchesToMm);
      assert.ok(Math.abs(width / height - L / H) / (L / H) < 0.002, `${width / height} vs ${L / H}`);
      // everything stays inside the canvas
      const nums = [...svg.matchAll(/points="([^"]+)"/g)].flatMap((x) => x[1].split(" ").flatMap((p) => p.split(",").map(Number)));
      assert.ok(nums.every((n) => n >= 0 && n <= 1000));
    });
  }
  it("shows the photographed 32 mm / 40 mm tick-boxes only on the RTC carton and refuses missing artwork", () => {
    const [six, , rtc] = CARTON_PHYSICAL_SPECS;
    assert.ok(!renderCartonExteriorSvg(six).includes("40mm"));
    assert.ok(renderCartonExteriorSvg(rtc).includes("40mm"));
    assert.throws(() => renderCartonExteriorSvg(rtc, { logoDataUri: "" }));
  });
});
