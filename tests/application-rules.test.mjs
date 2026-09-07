import test from "node:test";
import assert from "node:assert/strict";
import { APPLICATION_RULES, APPLICATION_RULES_UPDATED_AT } from "../src/application-rules.js";
import { collectSource, extractRuleExcerpts } from "../scripts/collect-application-rules.mjs";

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
