import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

test('interview panes stretch together without the list determining desktop height', () => {
  assert.match(css, /\.interview-record-layout \{[^}]*align-items: stretch/);
  const list = css.match(/\.interview-record-list \{([^}]+)\}/)[1];
  assert.match(list, /contain: size/);
  assert.match(list, /overflow: auto/);
  assert.doesNotMatch(list, /max-height/);
});

test('stacked interview layout restores natural list sizing with bounded scrolling', () => {
  const workspaceCss = readFileSync(new URL('../src/workspace-layout.css', import.meta.url), 'utf8');
  const narrow = workspaceCss.slice(workspaceCss.indexOf('@media (max-width: 1200px)'));
  assert.match(narrow, /\.interview-record-list \{ contain: none; max-height: 360px; min-height: 0; \}/);
});
