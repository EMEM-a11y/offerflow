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
  assert.match(css, /\.record-position \{ width: 244px/);
  const mobile = css.slice(css.indexOf("@media (max-width: 760px)", css.indexOf("/* Reading-first layout")));
  assert.match(mobile, /\.pipeline-table \{ display: block; min-width: 0/);
  assert.match(mobile, /\.pipeline-table tbody tr \{ display: grid/);
  assert.match(mobile, /\.table-job-heading \{ width: 100%/);
  assert.match(mobile, /content: "岗位 \/ 地点"/);
  assert.match(mobile, /\.form-grid \{ grid-template-columns: 1fr/);
});

test("records are list-first and company / position directly open the existing editor", () => {
  const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
  const view = app.slice(app.indexOf("function renderPipeline()"), app.indexOf("function updateApplicationDetails"));
  assert.doesNotMatch(view, /pipeline-metrics|pipeline-connection-note|table-job-edit/);
  assert.match(view, /record-edit-target record-company" data-edit-application=/);
  assert.match(view, /record-edit-target record-position" data-edit-application=/);
  assert.match(view, /id="pipeline-search"/);
  assert.match(view, /data-pipeline-scope="archived"/);
  assert.match(css, /tbody tr\[hidden\] \{ display: none/);
});
