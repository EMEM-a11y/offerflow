import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const base = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const layout = readFileSync(new URL("../src/workspace-layout.css", import.meta.url), "utf8");
const css = base + layout;
const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");

test("shared page headings have one desktop/mobile scale without legacy overrides", () => {
  assert.match(layout, /--page-title: 28px/);
  assert.match(layout, /--page-title: 24px/);
  assert.match(layout, /\.content h1 \{ font-size: var\(--page-title\)/);
  for (const rule of base.matchAll(/[^{}]*h1[^{}]*\{([^{}]*)\}/g)) assert.doesNotMatch(rule[1], /font-size|line-height|font-weight|letter-spacing/);
  assert.equal([...css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].filter(m=>+m[1]<13).length, 0);
  assert.match(layout, /input, textarea, select \{ font-size: var\(--text-base\)/);
  assert.match(readFileSync(new URL("../index.html",import.meta.url),"utf8"), /workspace-layout.css/);
});
test("records keep direct editing and collapse secondary fields, never remove them", () => {
  const view=app.slice(app.indexOf("function renderPipeline()"),app.indexOf("function updateApplicationDetails"));
  assert.doesNotMatch(view,/pipeline-metrics|pipeline-connection-note|table-job-edit/);
  assert.match(view,/record-edit-target record-company" data-edit-application=/);
  assert.match(view,/record-edit-target record-position" data-edit-application=/);
  assert.match(view,/data-expand-application=/);
  assert.match(view,/aria-controls="application-extra-/);
  for (const field of ["next","appliedAt","progressUrl","followUpAt"]) assert.ok(view.includes('data-app-field="'+field+'"'));
  assert.match(layout,/tbody tr\[hidden\] \{ display: none/);
  assert.match(layout,/\.application-list-table \{ display: block; min-width: 0/);
  assert.match(layout,/content: attr\(data-label\)/);
});
test("mobile keeps account access; answer sheet fits available width", () => {
  assert.match(layout,/\.top-actions \.btn.account-button \{ display: inline-flex/);
  assert.match(layout,/\.top-actions \.cloud-status.error \{ display: inline-flex/);
  assert.match(layout,/repeat\(auto-fit, minmax\(40px, 1fr\)\)/);
  assert.match(app,/data-radar-back/);
  assert.match(layout,/detail-open \.radar-list-panel \{ display: none/);
});
test("page chrome is reduced and source rules stay available on demand", () => {
  const home=app.slice(app.indexOf("function renderHome()"),app.indexOf("function renderPractice"));
  assert.doesNotMatch(home,/home-next-action/);
  assert.match(app,/class="radar-advanced"/);
  assert.match(app,/class="rule-details"/);
  assert.match(app,/class="resume-file-priority"/);
  assert.match(app,/handleWorkspaceKeydown\(event, document\)/);
});
