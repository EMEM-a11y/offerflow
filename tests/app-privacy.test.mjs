import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { webcrypto } from "node:crypto";
import * as questions from "../src/question-bank.js";
import * as radar from "../src/job-radar.js";
import { WorkspaceSync } from "../src/workspace-sync.js";
import { createLoginRequest } from "../src/login-request.js";
import { createLoginCaptcha } from "../src/login-captcha.js";

const source=readFileSync(new URL("../src/app.js",import.meta.url),"utf8")
  .replace(/^import .*;\n/gm, "")
  .replaceAll("import.meta.env.DEV", "false")
  .replace(/^initializeApp\(\);$/m, "");

function app(t, overrides = {}) {
  const storage=new Map();
  const writes=[];
  const context=vm.createContext({
    ...questions,...radar, WorkspaceSync, createLoginRequest, createLoginCaptcha, captchaSiteKey:"", structuredClone, console, URL, crypto:webcrypto,
    setTimeout, clearTimeout, setInterval(){},
    cloudConfigured:true, assetUrl:p=>`/offerflow/${p.replace(/^\//,"")}`,
    document:{addEventListener(){},querySelector(){return null;}},
    window:{addEventListener(){}},
    localStorage:{getItem:()=>null,removeItem(){}},
    sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
    loadCloudWorkspace:async id=>id==="A" ? {updated_at:"1",state:{profile:{name:"PRIVATE_A"},companyReviewQueue:["测试公司"],companyDiagnoses:{测试公司:{conclusion:"PRIVATE_NOTE_A"}}}} : null,
    saveCloudWorkspace:async (...args)=>{writes.push(args);return {updated_at:"2"};},
    ...overrides,
  });
  vm.runInContext(source,context);
  vm.runInContext("render = () => {};",context);
  t.after(()=>vm.runInContext("workspaceSync.close()",context));
  return { run:code=>vm.runInContext(code,context),writes };
}

test("guest email form explains registration and requires privacy consent", t=>{
  const {run}=app(t);
  run('state.modal = "account"');
  const html=run("renderModal()");
  assert.match(html,/注册 \/ 登录/);
  assert.match(html,/首次使用此邮箱会创建账号/);
  assert.match(html,/不注册也能刷题/);
  assert.match(html,/name="privacyConsent"[^>]*required/);
});

test("configured CAPTCHA is present and keeps the login button locked before verification", t=>{
  const button = {};
  const form = {querySelector:selector => selector === "button[type='submit']" ? button : {classList:{toggle(){}}}};
  const {run}=app(t, {
    captchaSiteKey:"synthetic-public-key",
    document:{addEventListener(){},querySelector:selector => selector === "#cloud-login-form" ? form : null},
  });
  run('state.modal = "account"');
  assert.match(run("renderModal()"), /id="login-captcha"/);
  run("updateLoginRequest()");
  assert.equal(button.disabled,true);
});

test("logout clears all personal state, modal, diagnosis and private gates",async t=>{
  const {run}=app(t);
  await run('applyCloudUser({id:"A"})');
  assert.equal(run("state.profile.name"),"PRIVATE_A");
  await run("applyCloudUser(null)");
  assert.equal(run("hasPrivateAccess()"),false);
  assert.equal(run("state.profile.name"),"");
  assert.equal(run("Object.keys(state.companyDiagnoses).length"),0);
  assert.match(run("renderCompanyMatches()"),/登录后查看/);
  for (const view of ["Home","Resume","Interview","Pipeline"]) {
    // Test the actual gate without rendering its decorative content.
    run('renderPrivacyGate = view => "LOCKED:" + view');
    assert.match(run(`render${view}()`),/^LOCKED:/);
  }
});

test("account B never inherits A and login itself never uploads a workspace",async t=>{
  const {run,writes}=app(t);
  await run('applyCloudUser({id:"A"})');
  await run('applyCloudUser({id:"B"})');
  assert.equal(run("state.profile.name"),"");
  assert.equal(writes.length,0);
});

test("public questions include shared JD papers without login",t=>{
  const {run}=app(t);
  assert.ok(run('questionBank().some(q=>q.id==="jd2-v-01")'));
  assert.ok(run('availablePracticePapers().some(p=>p.id==="jd-assessment-set-2")'));
});

test("attachment databases are account-scoped and locked for guests",async t=>{
  const {run}=app(t);
  assert.throws(()=>run('accountDatabaseName("files")'));
  await run('applyCloudUser({id:"A"})');
  assert.equal(run('accountDatabaseName("files")'),"files:A");
  await run('applyCloudUser({id:"B"})');
  assert.equal(run('accountDatabaseName("files")'),"files:B");
});

test("CSV exports neutralize formula text",t=>{
  const {run}=app(t);
  assert.equal(run('csvCell("=1+1")'), '"\'=1+1"');
  assert.equal(run('csvCell("普通备注")'), '"普通备注"');
});

test("application stage generates one written-test record and result stays linked", t=>{
  const {run}=app(t);
  run('state = restoreState({jobs:[{id:"job1",company:"测试公司",role:"产品"}],applications:[{id:"app1",jobId:"job1",status:"written"}]}); synchronizeProcessRecordsFromApplications();');
  assert.equal(run("state.interviewRecords.length"),1);
  run("synchronizeProcessRecordsFromApplications()");
  assert.equal(run("state.interviewRecords.length"),1);
  run('updateProcessResult(state.interviewRecords[0], "rejected")');
  assert.equal(run("state.applications[0].status"),"rejected_assessment");
});

test("structured backup import validates format and never pretends to restore attachments",t=>{
  const {run}=app(t);
  assert.throws(()=>run('parseWorkspaceBackup("{}")'));
  run('var backupFixture={format:"offerflow-workspace-backup",version:1,state:{profile:{name:"SYNTHETIC"},applications:[],jobs:[],resumeDocuments:[{id:"file1"}],interviewRecords:[{id:"record1",recording:{name:"test.mp3"}}]}}');
  assert.equal(run("parseWorkspaceBackup(JSON.stringify(backupFixture)).state.profile.name"),"SYNTHETIC");
  assert.equal(run("parseWorkspaceBackup(JSON.stringify(backupFixture)).state.resumeDocuments.length"),0);
  assert.equal(run("parseWorkspaceBackup(JSON.stringify(backupFixture)).state.interviewRecords[0].recording"),null);
});
