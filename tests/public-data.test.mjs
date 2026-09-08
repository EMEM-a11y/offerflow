import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { SEED_QUESTIONS, PRACTICE_PAPERS, validateImportedQuestions } from "../src/question-bank.js";
import { JOB_REFRESH_WORKFLOW_URL, JOB_ROLE_CATEGORIES, companyCareerUrl, jobRoleCategories, validateRadarJobLinks } from "../src/job-radar.js";
import { prepareSnapshot } from "../scripts/update-jobs.mjs";

test("public question IDs, answers, stems and local images are complete", () => {
  assert.equal(new Set(SEED_QUESTIONS.map(q=>q.id)).size, SEED_QUESTIONS.length);
  assert.equal(validateImportedQuestions(SEED_QUESTIONS).length, SEED_QUESTIONS.length);
  for (const q of SEED_QUESTIONS) {
    for (const image of [q.image,...(q.images||[]),...(q.optionImages||[])].filter(Boolean)) {
      if (image.startsWith("/")) assert.ok(existsSync(new URL(`../public${image}`,import.meta.url)), `${q.id}: missing image`);
    }
  }
  for (const paper of PRACTICE_PAPERS) for (const id of paper.questionIds) assert.ok(SEED_QUESTIONS.some(q=>q.id===id));
});

test("question import refuses missing chart, duplicate choices and invalid answer", () => {
  const valid = {prompt:"根据下图，哪项正确？",options:["A","B"],answer:0};
  assert.throws(()=>validateImportedQuestions([valid]));
  assert.throws(()=>validateImportedQuestions([{...valid,prompt:"测试",options:["A","A"]}]));
  assert.throws(()=>validateImportedQuestions([{...valid,prompt:"测试",answer:4}]));
});

test("ByteDance link cannot point to Moonton; javascript links are blocked", () => {
  const jobs=validateRadarJobLinks([
    {company:"字节跳动",applyUrl:"https://moonton.jobs.feishu.cn/campus"},
    {company:"测试公司",applyUrl:"javascript:alert(1)"},
  ]);
  assert.equal(jobs[0].applyUrl,"https://jobs.bytedance.com/campus/position");
  assert.equal(jobs[0].linkStatus,"corrected");
  assert.equal(jobs[1].applyUrl,"");
});

test("known company domains and shared recruitment tenants cannot be assigned to unrelated companies", () => {
  const jobs = validateRadarJobLinks([
    { company: "齐心集团", applyUrl: "https://talent.antgroup.com/campus/position/123" },
    { company: "公司甲", applyUrl: "https://unknown.jobs.feishu.cn/campus/position/111/detail" },
    { company: "公司乙", applyUrl: "https://unknown.jobs.feishu.cn/campus/position/222/detail" },
    { company: "京东方", applyUrl: "https://boe.m.zhiye.com/2022/campus2022.html" },
    { company: "小鹏", applyUrl: "https://xiaopeng.jobs.feishu.cn/campus/position/333/detail" },
    { company: "智元", applyUrl: "https://agirobot.jobs.feishu.cn/campus/position/444/detail" },
  ]);
  assert.equal(jobs[0].linkStatus, "mismatch");
  assert.equal(jobs[0].applyUrl, "");
  assert.equal(jobs[1].linkStatus, "conflict");
  assert.equal(jobs[2].linkStatus, "conflict");
  assert.equal(jobs[3].linkStatus, "verified");
  assert.equal(jobs[4].linkStatus, "verified");
  assert.equal(jobs[5].linkStatus, "verified");
});

test("company career links are separate from concrete job links", () => {
  assert.equal(companyCareerUrl({
    applyUrl: "https://join.qq.com/post_detail.html?postid=123",
    linkStatus: "verified",
  }), "https://join.qq.com/");
  assert.equal(companyCareerUrl({
    applyUrl: "https://app.mokahr.com/campus_apply/megviihr/38642#/job/abc",
    linkStatus: "verified",
  }), "https://app.mokahr.com/campus_apply/megviihr/38642");
  assert.equal(companyCareerUrl({
    applyUrl: "https://jobs.smartrecruiters.com/HoYoverse/123-product-manager",
    linkStatus: "verified",
  }), "https://jobs.smartrecruiters.com/HoYoverse");
  assert.equal(companyCareerUrl({
    applyUrl: "https://unknown.example/jobs/123",
    linkStatus: "source",
  }), "");
  const appSource = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
  assert.match(appSource, /公司招聘官网 ↗/);
  assert.match(appSource, /查看岗位 ↗/);
});

test("updater rejects empty, changed and unexpectedly shrunken sources", () => {
  assert.throws(()=>prepareSnapshot([]));
  assert.throws(()=>prepareSnapshot(Array(20).fill({foo:1})));
  const rows=Array.from({length:20},(_,i)=>({company:`公司${i}`,positions:["产品"]}));
  assert.throws(()=>prepareSnapshot(rows,100));
  assert.equal(prepareSnapshot(rows).jobs.length,20);
});

test("manual job refresh opens the repository workflow over HTTPS", () => {
  const url = new URL(JOB_REFRESH_WORKFLOW_URL);
  assert.equal(url.protocol, "https:");
  assert.equal(url.hostname, "github.com");
  assert.equal(url.pathname, "/EMEM-a11y/offerflow/actions/workflows/update-official-jobs.yml");
  const appSource = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
  assert.match(appSource, /data-modal="job-refresh-info"/);
  assert.match(appSource, /仅仓库管理员可以运行/);
  assert.match(appSource, /普通用户无需操作/);
});

test("radar groups concrete jobs by company and filters product-related roles", () => {
  assert.ok(JOB_ROLE_CATEGORIES.includes("产品/项目"));
  assert.deepEqual(jobRoleCategories({ role: "AI 产品经理" }), ["产品/项目", "技术/研发"]);
  assert.ok(jobRoleCategories({ role: "用户增长运营" }).includes("运营/增长"));
  assert.ok(jobRoleCategories({ role: "商业数据分析师" }).includes("数据/分析"));
  assert.deepEqual(jobRoleCategories({ role: "总裁办公室助理" }), ["其他"]);
  const appSource = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
  assert.match(appSource, /岗位方向/);
  assert.match(appSource, /groupRadarJobsByCompany/);
  assert.match(appSource, /符合筛选的具体岗位/);
});
