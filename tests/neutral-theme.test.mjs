import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const layout = readFileSync(new URL("../src/workspace-layout.css", import.meta.url), "utf8");
const palettes = [...css.matchAll(/:root\s*\{([^}]+)\}/g)].map(match =>
  Object.fromEntries([...match[1].matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, key, value]) => [key, value.trim()])));
const luminance = hex => {
  const rgb = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255)
    .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
};
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);

test("light and dark themes use neutral accents with legible text and inverse buttons", () => {
  assert.equal(palettes.length, 2);
  for (const palette of palettes) {
    for (const key of ["--canvas", "--surface", "--panel", "--panel-muted", "--accent", "--accent-soft", "--accent-contrast"]) {
      const channels = palette[key].slice(1).match(/../g);
      assert.equal(new Set(channels).size, 1, key);
    }
    for (const background of ["--canvas", "--surface", "--panel", "--panel-muted"]) {
      for (const foreground of ["--ink", "--muted", "--faint"]) {
        assert.ok(contrast(palette[foreground], palette[background]) >= 4.5, `${foreground} on ${background}`);
      }
    }
    for (const background of ["--accent", "--accent-hover"]) {
      assert.ok(contrast(palette["--accent-contrast"], palette[background]) >= 4.5);
    }
    for (const key of ["--success", "--warning", "--danger"]) assert.ok(palette[key]);
  }
  assert.doesNotMatch(layout, /--faint:/, "layout must not override theme colors");
});

test("brand and interaction states no longer contain hardcoded blue or white-on-white accents", () => {
  assert.doesNotMatch(css, /#(?:0071e3|0066cc|2997ff|0a84ff|409cff|75baff|e8f2ff|12395d)|rgba\((?:0,\s*113,\s*227|10,\s*132,\s*255),/i);
  for (const rule of css.matchAll(/[^{}]*\{([^{}]+)\}/g)) {
    if (rule[1].includes("background: var(--accent)")) assert.doesNotMatch(rule[1], /color: (?:white|#fff);/);
  }
  assert.match(css, /\.brand-mark\s*\{[^}]*background: var\(--accent\);[^}]*color: var\(--accent-contrast\)/);
  assert.match(css, /\.nav-item\.active \.nav-glyph \{ color: var\(--ink\); background: transparent/);
  assert.match(css, /:focus-visible/);
});
