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

test("home omits the next-action module while retaining progress and actionable reminders", async t => {
  const { run } = app(t);
  await run('applyCloudUser({id:"A"})');
  run('state.jobs=[{id:"job",company:"测试公司",role:"产品经理"}]; state.applications=[{id:"application",jobId:"job",status:"written",followUpAt:"2026-01-01",next:"完成笔试"}];');
  const html = run("renderHome()");
  assert.doesNotMatch(html, /home-next-action|下一步/);
  assert.match(html, /阶段分布/);
  assert.match(html, /模块进展/);
  assert.match(html, /完成笔试/);
  assert.match(html, /data-reminder-key=/);
  assert.match(html, /data-open-application="application"/);
  assert.equal((html.match(/class="home-morale-row"/g) || []).length, 1);
});

test("agenda completion survives cloud round trip, leaves progress intact and can be undone", async t => {
  const handlers = {};
  const { run, writes } = app(t, { document: { addEventListener: (type, handler) => { handlers[type] = handler; }, querySelector: () => null } });
  await run('applyCloudUser({id:"A"})');
  run('state.jobs=[{id:"job",company:"测试公司",role:"产品经理"}]; state.applications=[{id:"application",jobId:"job",status:"written",followUpAt:"2026-01-01",next:"完成笔试"}]; var originalApplications=JSON.stringify(state.applications); var reminderKey=workspaceReminders()[0].key;');
  assert.match(run("renderHomeAgenda(workspaceReminders())"), /1 件逾期/);
  const change = checked => handlers.change({ target: {
    checked, dataset: { reminderKey: run("reminderKey") },
    closest: () => null, matches: selector => selector === "[data-reminder-key]",
  } });
  change(true);
  assert.equal(run("workspaceReminders().length"), 0);
  assert.equal(run("JSON.stringify(state.applications)"), run("originalApplications"));
  assert.doesNotMatch(run("renderHomeAgenda(workspaceReminders())"), /件逾期/);
  assert.doesNotMatch(run("renderHomeAgenda(workspaceReminders())"), /完成笔试/);
  await run("workspaceSync.flush()");
  const saved = writes.at(-1)[1];
  assert.equal(Object.keys(saved.reminderCompletions).length, 1);
  run(`state=restoreState(${JSON.stringify(saved)}); homeAgendaView="completed";`);
  const html = run("renderHomeAgenda(workspaceReminders())");
  assert.match(html, /撤销完成：测试公司：完成笔试/);
  assert.match(html, /data-open-application="application"/);
  assert.equal(run("workspaceReminders().length"), 0);
  change(false);
  assert.equal(run("workspaceReminders().length"), 1);
  assert.equal(run("Object.keys(state.reminderCompletions).length"), 0);
});

test("rescheduled or new-stage reminders reappear without losing completed history", async t => {
  const { run } = app(t);
  await run('applyCloudUser({id:"A"})');
  run('state.jobs=[{id:"job",company:"测试公司",role:"产品经理"}]; state.applications=[{id:"application",jobId:"job",status:"written",followUpAt:"2026-01-01",next:"联系招聘方"}]; var key=workspaceReminders()[0].key; setReminderCompleted(key,true);');
  run('state.applications[0].followUpAt="2026-01-02";');
  assert.equal(run("workspaceReminders().length"), 1);
  run('state.applications[0].followUpAt="2026-01-01"; state.applications[0].status="interview_1";');
  assert.equal(run("workspaceReminders().length"), 1);
  run('state.applications[0].status="written"; state.applications[0].next="补交材料";');
  assert.equal(run("workspaceReminders().length"), 1);
  run('state.applications[0].archivedAt="2026-01-03"; homeAgendaView="completed";');
  assert.equal(run("workspaceReminders().length"), 0);
  assert.match(run("renderHomeAgenda(workspaceReminders())"), /联系招聘方/);
  run('setReminderCompleted(key,false);');
  assert.equal(run("workspaceReminders().length"), 0, "undo must not resurrect an archived application");
});

test("older pending interviews remain actionable and completions stay account scoped", async t => {
  const { run } = app(t);
  await run('applyCloudUser({id:"A"})');
  run('state.interviewRecords=[{id:"record",company:"测试公司",role:"产品经理",round:"一面",date:"2026-01-01",status:"scheduled"}];');
  assert.equal(run("workspaceReminders().length"), 1);
  run('setReminderCompleted(workspaceReminders()[0].key,true);');
  assert.equal(run("workspaceReminders().length"), 0);
  assert.equal(run("state.interviewRecords[0].status"), "scheduled");
  await run("workspaceSync.flush()");
  await run('applyCloudUser({id:"B"})');
  assert.equal(run("Object.keys(state.reminderCompletions).length"), 0);
  assert.equal(run("Object.keys(restoreState({}).reminderCompletions).length"), 0);
  await run("applyCloudUser(null)");
  run('setReminderCompleted("unauthorized",true);');
  assert.equal(run("Object.keys(state.reminderCompletions).length"), 0);
});

test("radar application can edit job details and persist without changing public jobs or progress", async t=>{
  const handlers = {};
  const {run,writes}=app(t, {
    document:{addEventListener:(type,handler)=>{handlers[type]=handler},querySelector:()=>null},
    requestAnimationFrame:callback=>callback(),
    FormData:class { constructor(form) { return Object.entries(form.values); } },
  });
  await run('applyCloudUser({id:"A"})');
  run('showToast = () => {}; saveRadarJob(radarJobs[0]); var originalRadar = JSON.stringify(radarJobs); var originalId = state.applications[0].id; var originalJobId = state.applications[0].jobId; state.applications[0].status = "written"; synchronizeApplicationProcessState(state.applications[0]); state.interviewRecords[0].answerNotes = "保留复盘"; var originalApplication = JSON.stringify(state.applications[0]);');
  const id = run("originalId");
  handlers.click({target:{closest:selector=>selector==="[data-edit-application]" ? {dataset:{editApplication:id}} : null}});
  assert.equal(run("state.modal"),"edit-application");
  const before=run("JSON.stringify(state.jobs)");
  const html=run("renderModal()");
  for (const field of ["company","role","location","applyUrl","deadline","notes"]) assert.match(html,new RegExp(`name="${field}"`));
  assert.equal(run("JSON.stringify(state.jobs)"),before,"opening editor must not save changes");
  const values={applicationId:id,company:' 测试公司 <A> ',role:' AI 产品经理 "校招" ',location:" 北京 / 上海 ",applyUrl:"https://example.com/jobs/42",deadline:"招满即止",notes:"内推岗位"};
  await handlers.submit({preventDefault(){},target:{id:"application-edit-form",values}});
  assert.equal(run("state.modal"),null);
  assert.equal(run("state.applications.length"),1);
  assert.equal(run("state.jobs.length"),1);
  assert.equal(run("state.jobs[0].id"),run("originalJobId"));
  assert.equal(run("state.jobs[0].role"),'AI 产品经理 "校招"');
  assert.equal(run("state.jobs[0].location"),"北京 / 上海");
  assert.equal(run("state.applications[0].notes"),"内推岗位");
  for (const key of ["id","jobId","status","createdAt","appliedAt","progressUrl","followUpAt","interviewRecordId"]) {
    assert.equal(run(`state.applications[0].${key}`),run(`JSON.parse(originalApplication).${key}`));
  }
  assert.equal(run("state.interviewRecords[0].role"),'AI 产品经理 "校招"');
  assert.equal(run("state.interviewRecords[0].answerNotes"),"保留复盘");
  assert.equal(run("JSON.stringify(radarJobs)"),run("originalRadar"));
  await run("workspaceSync.flush()");
  assert.equal(writes.at(-1)[1].jobs[0].location,"北京 / 上海");
  run('state = restoreState(JSON.parse(JSON.stringify(state))); state.modal="edit-application"; state.editingApplicationId=originalId;');
  assert.match(run("renderModal()"),/测试公司 &lt;A&gt;/);
  assert.match(run("renderModal()"),/AI 产品经理 &quot;校招&quot;/);
  assert.match(run("renderPipeline()"),/data-edit-application=/);
});

test("application detail edits reject invalid input without partial changes and respect privacy", async t=>{
  const {run}=app(t);
  assert.throws(()=>run('updateApplicationDetails("missing",{})'),/登录/);
  await run('applyCloudUser({id:"A"})');
  run('state.jobs=[{id:"job",company:"原公司",role:"原岗位"}]; state.applications=[{id:"app",jobId:"job"}]; var snapshot=JSON.stringify(state);');
  assert.throws(()=>run('updateApplicationDetails("app",{company:" ",role:"岗位"})'),/不能为空/);
  assert.throws(()=>run('updateApplicationDetails("app",{company:"公司",role:"岗位",applyUrl:"javascript:alert(1)"})'),/网址/);
  assert.throws(()=>run('updateApplicationDetails("missing",{company:"公司",role:"岗位"})'),/不存在/);
  assert.equal(run("JSON.stringify(state)"),run("snapshot"));
  await run("applyCloudUser(null)");
  run('state.modal="edit-application"; state.editingApplicationId="app";');
  assert.doesNotMatch(run("renderModal()"),/id="application-edit-form"/);
});

test("manual and archived applications keep their identity and allow clearing optional details",async t=>{
  const {run}=app(t);
  await run('applyCloudUser({id:"A"})');
  run('state.jobs=[{id:"manual",company:"公司",role:"岗位",location:"北京",applyUrl:"https://example.com",deadline:"待确认",jd:"已有JD"}]; state.applications=[{id:"app",jobId:"manual",archivedAt:"2026-09-01",feishuRecordId:"feishu",notes:"旧备注"}]; updateApplicationDetails("app",{company:"新公司",role:"新岗位"});');
  assert.equal(run("state.jobs[0].location"),"");
  assert.equal(run("state.jobs[0].applyUrl"),"");
  assert.equal(run("state.jobs[0].jd"),"已有JD");
  assert.equal(run("state.applications[0].archivedAt"),"2026-09-01");
  assert.equal(run("state.applications[0].syncStatus"),"pending_push");
});

test("guest email form explains registration and requires privacy consent", t=>{
  const {run}=app(t);
  run('state.modal = "account"');
  const html=run("renderModal()");
  assert.match(html,/注册与登录/);
  assert.match(html,/首次使用将自动创建账号/);
  assert.match(html,/访客可浏览岗位和练习题目/);
  assert.match(html,/维护者具备云端管理权限/);
  assert.match(html,/不随账号跨设备同步/);
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

test("restoring a resume preserves metadata and never queues a cloud write", async t=>{
  const {run,writes}=app(t, {fixtureFile:{name:"resume.pdf",size:4,type:"application/pdf",arrayBuffer:async()=>new Uint8Array([1,2,3,4]).buffer}});
  await run('applyCloudUser({id:"A"})');
  run('state.resumeDocuments=[{id:"doc",name:"resume.pdf",type:"application/pdf",sizeLabel:"1 KB",addedAt:"original"}]; let stored; getResumeFile=async()=>stored; putResumeFile=async(id,file,onlyIfMissing)=>{if(id!=="doc" || !onlyIfMissing) throw Error("unsafe write"); stored=file;};');
  const before=run("JSON.stringify(state.resumeDocuments)");
  await run('restoreResumeDocument("doc",fixtureFile)');
  assert.equal(run("JSON.stringify(state.resumeDocuments)"),before);
  assert.equal(writes.length,0);
  await assert.rejects(run('restoreResumeDocument("doc",fixtureFile)'),/已有/);
});

test("resume restoration rejects wrong files and an account switch before writing", async t=>{
  const {run}=app(t, {fixtureFile:{name:"resume.pdf",size:4,type:"application/pdf"}});
  await run('applyCloudUser({id:"A"})');
  run('state.resumeDocuments=[{id:"doc",name:"resume.pdf",type:"application/pdf",sizeLabel:"1 KB"}]; putResumeFile=async()=>{throw Error("must not write")};');
  await assert.rejects(run('restoreResumeDocument("doc",{...fixtureFile,name:"wrong.pdf"})'),/同名/);
  await assert.rejects(run('restoreResumeDocument("doc",{...fixtureFile,size:999999})'),/大小/);
  await assert.rejects(run('restoreResumeDocument("doc",{...fixtureFile,type:"text/plain"})'),/类型/);
  run('getResumeFile=async()=>{authEpoch++;return null}');
  await assert.rejects(run('restoreResumeDocument("doc",fixtureFile)'),/账号已变化/);
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
