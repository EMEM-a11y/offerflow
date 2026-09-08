import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

test("shared typography avoids sub-13px text and keeps readable form controls", () => {
  const small = [...css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].filter(match => Number(match[1]) < 13);
  assert.equal(small.length, 0, "use the shared relative type scale for small labels");
  assert.match(css, /--text-xs:\s*\.8125rem/);
  assert.match(css, /input, textarea, select \{ font-size: var\(--text-base\)/);
});

test("application records keep a compact heading and adapt to narrow screens", () => {
  assert.match(css, /\.table-job-heading \{[^}]*width: 244px/);
  const mobile = css.slice(css.lastIndexOf("@media (max-width: 760px)"));
  assert.match(mobile, /\.pipeline-table \{ display: block; min-width: 0/);
  assert.match(mobile, /\.pipeline-table tbody tr \{ display: grid/);
  assert.match(mobile, /\.table-job-heading \{ width: 100%/);
  assert.match(mobile, /content: "岗位 \/ 地点"/);
  assert.match(mobile, /\.form-grid \{ grid-template-columns: 1fr/);
});
