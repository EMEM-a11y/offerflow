import test from "node:test";
import assert from "node:assert/strict";
import { normalizeOfficialPosition, prepareOfficialSnapshot, validateOfficialApplyUrl } from "../scripts/update-official-jobs.mjs";
import { validateRadarJobLinks } from "../src/job-radar.js";

const company = { id: "tencent", name: "腾讯", linkRules: [["join.qq.com"]], requirePostId: true };

test("normalizes an official position into the radar schema", () => {
  const job = normalizeOfficialPosition(company, {
    post_id: "123",
    title: "AI产品经理",
    project: "2027校园招聘",
    recruit_label: "应届毕业生",
    work_cities: "深圳 / 北京",
    apply_url: "https://join.qq.com/post_detail.html?postid=123",
  }, "2026-09-08");
  assert.equal(job.company, "腾讯");
  assert.equal(job.cohort, "2027届");
  assert.equal(job.batch, "正式批");
  assert.deepEqual(job.locations, ["深圳", "北京"]);
  assert.match(job.applyUrl, /^https:\/\/join\.qq\.com\//);
  assert.equal(validateRadarJobLinks([job])[0].linkStatus, "verified");
});

test("rejects a valid-looking URL that belongs to another company", () => {
  const result = validateOfficialApplyUrl(company, "https://jobs.bytedance.com/campus/position/123/detail", "123");
  assert.equal(result.ok, false);
  assert.match(result.reason, /不属于腾讯/);
});

test("rejects an official-domain URL carrying another position ID", () => {
  const result = validateOfficialApplyUrl(company, "https://join.qq.com/post_detail.html?postid=999", "123");
  assert.equal(result.ok, false);
  assert.match(result.reason, /岗位 ID/);
});

test("keeps the previous successful rows when one source fails", () => {
  const oldJob = normalizeOfficialPosition(company, {
    post_id: "123",
    title: "AI产品经理",
    work_cities: "深圳",
    apply_url: "https://join.qq.com/post_detail.html?postid=123",
  }, "2026-09-07");
  const supportingResults = Array.from({ length: 5 }, (_, index) => ({
    company: { id: `ok-${index}`, name: `公司${index}` },
    ok: true,
    positions: [],
    source: "https://example.com",
  }));
  const snapshot = prepareOfficialSnapshot([
    { company, ok: false, positions: [], message: "timeout" },
    ...supportingResults,
  ], { jobs: [oldJob] }, "2026-09-08T01:00:00.000Z");
  assert.equal(snapshot.jobs.length, 1);
  assert.equal(snapshot.jobs[0].lastSeen, "2026-09-07");
  assert.equal(snapshot.sources[0].state, "error");
});
