import test from "node:test";
import assert from "node:assert/strict";
import { APPLICATION_RULES, APPLICATION_RULES_UPDATED_AT } from "../src/application-rules.js";
import { readFileSync } from "node:fs";
import { collectSource, extractRuleExcerpts, compareSources, renderReview } from "../scripts/collect-application-rules.mjs";

test("rules have unique companies, complete cards and public HTTPS sources", () => {
  assert.equal(new Set(APPLICATION_RULES.map(rule => rule.id)).size, APPLICATION_RULES.length);
  assert.equal(new Set(APPLICATION_RULES.map(rule => rule.company)).size, APPLICATION_RULES.length);
  for (const rule of APPLICATION_RULES) {
    for (const field of ["company", "cohort", "signal", "evidenceLabel", "quota", "parallel", "retry", "change", "advice"]) assert.ok(rule[field]?.trim(), `${rule.id}: ${field}`);
    assert.ok(["official", "mixed"].includes(rule.evidence));
    assert.ok(rule.sources.length);
    for (const source of rule.sources) {
      const url = new URL(source.url);
      assert.equal(url.protocol, "https:");
      assert.equal(url.username + url.password, "");
      assert.ok(source.label);
    }
    if (rule.checkedAt) {
      assert.match(rule.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(rule.checkedAt <= APPLICATION_RULES_UPDATED_AT);
    }
  }
});

test("new rules distinguish cohort, intention, special plan and shared batch quota", () => {
  const get = id => APPLICATION_RULES.find(rule => rule.id === id);
  assert.match(get("honor-campus").quota, /1 个职位.*第二意向/);
  assert.match(get("honor-campus").advice, /社招.*不能套用/);
  assert.match(get("dji-2027").quota, /数字管理构建者计划.*不占/);
  assert.match(get("giant-2027").change, /不再支持职位更改/);
  assert.match(get("sangfor-2027").quota, /提前批.*正式批.*1 次/);
  for (const id of ["honor-campus", "dji-2027", "giant-2027", "sangfor-2027"]) assert.ok(get(id).checkedAt);
});

test("extractor ignores script, style and comment text and bounds candidate output", () => {
  assert.deepEqual(extractRuleExcerpts('<script>投递99次</script><style>志愿</style><!-- 重投 --><p>加载中</p>'), []);
  const excerpts = extractRuleExcerpts('<p>校招投递两个岗位</p>'.repeat(100));
  assert.ok(excerpts.length > 0 && excerpts.length <= 3);
  assert.ok(excerpts.every(excerpt => excerpt.length <= 120));
});

test("collection is read-only and never treats successful HTTP as verified rules", async () => {
  const rule = APPLICATION_RULES[0];
  const before = JSON.stringify(APPLICATION_RULES);
  let options;
  const result = await collectSource(rule, rule.sources[0], async (url, opts) => {
    options = opts;
    return new Response('<p>投递1次</p>', { headers: { "content-type": "text/html" } });
  });
  assert.equal(options.redirect, "error");
  assert.equal(result.status, "candidate_only");
  assert.equal(JSON.stringify(APPLICATION_RULES), before);
  const empty = await collectSource(rule, rule.sources[0], async () => new Response('<p>Loading</p>', { headers: { "content-type": "text/html" } }));
  assert.equal(empty.status, "manual_required");
  const failed = await collectSource(rule, rule.sources[0], async () => new Response('', { status: 403 }));
  assert.equal(failed.status, "unavailable");
  const pdf = await collectSource(rule, rule.sources[0], async () => new Response('', { headers: { "content-type": "application/pdf" } }));
  assert.equal(pdf.status, "manual_required");
});

const sourceRow = (hash = "a".repeat(64)) => ({ company: "测试公司", cohort: "2027 届校招", source: "https://example.com/faq", status: "candidate_only", contentHash: hash, excerpts: ["校招可投递1个岗位"], fetchedAt: "2026-09-07T01:23:00Z" });

test("comparison distinguishes first, unchanged, changed and cohort changes without mutating inputs", () => {
  const row = sourceRow();
  const first = compareSources([row]);
  assert.equal(first.rows[0].change, "first_seen");
  const before = JSON.stringify(first.baseline);
  assert.equal(compareSources([{ ...row, fetchedAt: "2026-09-08T01:23:00Z" }], first.baseline).rows[0].change, "unchanged");
  const changed = compareSources([{ ...sourceRow("b".repeat(64)), excerpts: ["校招可投递2个岗位"] }], first.baseline);
  assert.equal(changed.rows[0].change, "changed");
  assert.deepEqual(changed.rows[0].previousExcerpts, row.excerpts);
  assert.equal(compareSources([{ ...row, cohort: "2028 届校招" }], first.baseline).rows[0].change, "changed");
  assert.equal(JSON.stringify(first.baseline), before);
  assert.equal(row.change, undefined);
  assert.equal(compareSources([row]).rows[0].change, "first_seen", "lost cache must not be reported as unchanged");
});

test("failed or empty sources preserve last successful baseline and compare after recovery", () => {
  const original = compareSources([sourceRow()]).baseline;
  for (const status of ["unavailable", "manual_required"]) {
    const failed = compareSources([{ ...sourceRow(), status, contentHash: "b".repeat(64), excerpts: [] }], original);
    assert.equal(failed.rows[0].change, "uncheckable");
    assert.deepEqual(failed.baseline, original);
    assert.equal(compareSources([sourceRow("c".repeat(64))], failed.baseline).rows[0].change, "changed");
  }
  assert.throws(() => compareSources([sourceRow()], { version: 2, sources: [] }), /格式异常/);
  assert.throws(() => compareSources([{ ...sourceRow(), contentHash: null }]), /指纹/);
});

test("fingerprint catches text changes beyond the preview but ignores scripts and whitespace", async () => {
  const rule = APPLICATION_RULES[0];
  const collect = html => collectSource(rule, rule.sources[0], async () => new Response(html, { headers: { "content-type": "text/html" } }));
  const prefix = '<p>投递岗位' + '说明'.repeat(70) + '</p>';
  const base = prefix.repeat(4);
  const a = await collect(base + '<p>名额为一</p><script>1</script>');
  const b = await collect(base + '<p>名额为二</p><script>1</script>');
  assert.deepEqual(a.excerpts, b.excerpts);
  assert.notEqual(a.contentHash, b.contentHash);
  const c = await collect(base + '\n<p>名额为一</p>  <script>2</script>');
  assert.equal(a.contentHash, c.contentHash);
});

test("review report escapes remote markup and includes before/after and failures", () => {
  const row = sourceRow();
  const previous = compareSources([row]).baseline;
  const changed = compareSources([{ ...sourceRow("b".repeat(64)), excerpts: ['<img src=x> [click](https://example.org) | **text**'] }], previous);
  const report = renderReview([...changed.rows, { ...row, change: "uncheckable", reason: "HTTP 403", lastSuccessAt: row.fetchedAt }]);
  assert.ok(report.includes("上次摘录"));
  assert.ok(report.includes("本次摘录"));
  assert.ok(report.includes("保留上次成功记录"));
  assert.ok(!report.includes("<img"));
  assert.ok(!report.includes("[click]"));
});

test("scheduled source check has read-only permissions and cannot block page deployment", () => {
  const workflow = readFileSync(new URL("../.github/workflows/deploy.yml", import.meta.url), "utf8");
  assert.match(workflow, /cron: '23 1 \* \* \*'/);
  const rulesJob = workflow.split("  rules:\n")[1].split("  build:\n")[0];
  assert.match(rulesJob, /actions\/cache@v4/);
  assert.match(rulesJob, /node scripts\/collect-application-rules.mjs/);
  assert.match(rulesJob, /if: always\(\)/);
  assert.match(rulesJob, /retention-days: 30/);
  assert.doesNotMatch(rulesJob, /secrets\.|contents: write|update:jobs|git push/);
  assert.match(workflow, /  deploy:\n    needs: build/);
});
