import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("company names lead the list hierarchy over counts and role summaries", () => {
  const css = readFileSync(new URL("../src/workspace-layout.css", import.meta.url), "utf8");
  assert.match(css, /\.radar-list-panel \.radar-row-top > strong \{ font-size: 22px; font-weight: 700;.*color: var\(--ink\)/);
  assert.match(css, /\.radar-list-panel \.radar-row-title \{ font-size: var\(--text-sm\); font-weight: 400/);
  assert.match(css, /\.radar-list-panel \.radar-role-line \{ font-weight: 400/);
});
