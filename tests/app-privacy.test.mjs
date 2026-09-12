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

test("question quarantine preserves history and excludes unavailable answers from submission", t => {
  const { run } = app(t);
  run(`saveState=()=>{}; render=()=>{}; window.scrollTo=()=>{};
    state.practiceHistory=[]; state.wrongQuestionIds=['jd-supp-09'];
    state.practiceSession={id:'audit',title:'audit',status:'active',startedAt:Date.now(),index:0,
      questionIds:['jd-supp-09','official-hubei-2026-n-01'],answers:{'jd-supp-09':1,'official-hubei-2026-n-01':2}};`);
  assert.match(run("renderPracticeSession()"), /1\/1 已作答/);
  assert.match(run("renderPracticeSession()"), /不计入本次成绩/);
  run("submitPractice()");
  assert.equal(run("state.practiceHistory[0].results.length"), 1);
  assert.equal(run("state.practiceHistory[0].results[0].correct"), true);
  assert.equal(run("state.wrongQuestionIds.includes('jd-supp-09')"), true);
  assert.match(run("renderWrongBook()"), /历史错题暂不可用/);
});

test("broken image questions are skipped for this visit without erasing attempts", t => {
  const { run } = app(t);
  assert.equal(run("Boolean(questionById('jd2-n-01'))"), true);
  run("failedQuestionImageIds.add('jd2-n-01')");
  assert.equal(run("Boolean(questionById('jd2-n-01'))"), false);
  assert.match(run("renderQuestionImages(SEED_QUESTIONS.find(q=>q.id==='jd2-n-01'))"), /data-question-image="jd2-n-01"/);
});

test("sidebar toggles for guests without rerendering or cloud writes and restores browser preference", t => {
  const storage = new Map();
  const handlers = {};
  const attributes = {};
  const shell = { classList: { toggle: (name, value) => { attributes[name] = value; } } };
  const button = { setAttribute: (name, value) => { attributes[name] = value; } };
  const localStorage = { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem() {} };
  const { run, writes } = app(t, {
    localStorage,
    document: { addEventListener: (type, handler) => { handlers[type] = handler; }, querySelector: selector => selector === ".app-shell" ? shell : button },
  });
  run('render = () => { throw new Error("Sidebar must preserve the current DOM and unsaved inputs"); };');
  const click = () => handlers.click({ target: { closest: selector => selector === "[data-action]" ? { dataset: { action: "toggle-sidebar" } } : null } });
  assert.equal(run("sidebarCollapsed"), false);
  click();
  assert.equal(attributes["sidebar-collapsed"], true);
  assert.equal(attributes["aria-expanded"], "false");
  assert.equal(button.title, "展开导航栏");
  assert.equal(app(t, { localStorage }).run("sidebarCollapsed"), true);
  click();
  assert.equal(attributes["sidebar-collapsed"], false);
  assert.equal(attributes["aria-label"], "收起导航栏");
  assert.equal(app(t, { localStorage }).run("sidebarCollapsed"), false);
  assert.equal(writes.length, 0);
});

test("sidebar remains usable when preference storage is blocked", t => {
  const { run } = app(t, { localStorage: { removeItem() {}, getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } } });
  assert.equal(run("sidebarCollapsed"), false);
  assert.doesNotThrow(() => run("toggleSidebar()"));
  assert.equal(run("sidebarCollapsed"), true);
});

test("mobile navigation opens and closes without rerendering the page", t => {
  const handlers = {};
  let open = false;
  const { run } = app(t, { document: {
    addEventListener: (type, handler) => { handlers[type] = handler; },
    querySelector: () => ({ classList: { toggle: (name, value) => { assert.equal(name, "open"); open = value; } } }),
  } });
  run('render = () => { throw new Error("Do not rerender"); };');
  const click = () => handlers.click({ target: { closest: selector => selector === "[data-action]" ? { dataset: { action: "toggle-menu" } } : null } });
  click();
  assert.equal(open, true);
  assert.equal(run("state.mobileOpen"), true);
  click();
  assert.equal(open, false);
});

test("pipeline separates company and role and exposes progress links without expanding", async t => {
  const { run } = app(t);
  await run('applyCloudUser({id:"A"})');
  run('state.jobs=[{id:"j",company:"示例公司",role:"产品经理",location:"上海"}]; state.applications=[{id:"a",jobId:"j",status:"written",progressUrl:"https://join.qq.com/"}];');
  const html = run("renderPipeline()");
  const mainRow = html.match(/<tr data-application-row="a">([\s\S]*?)<\/tr>/)[1];
  assert.match(html, /<th>公司<\/th><th>岗位<\/th>/);
  assert.equal((mainRow.match(/<td\b/g) || []).length, 7);
  assert.match(mainRow, /href="https:\/\/join.qq.com\/"/);
  assert.match(mainRow, /查询状态 ↗/);
  assert.match(mainRow, /data-label="提醒日期"/);
  assert.match(mainRow, /type="date"[^>]*data-app-field="followUpAt"/);
  assert.doesNotMatch(mainRow, /data-app-field="next"/);
  assert.match(html, /<span>下一步<\/span><input[^>]*data-app-field="next"/);
  assert.equal((html.match(/data-app-field="followUpAt"/g) || []).length, 1);
  assert.match(html, /colspan="7"/);
  run('state.applications[0].progressUrl="javascript:alert(1)";');
  assert.doesNotMatch(run("renderPipeline()"), /href="javascript:/);
  assert.match(run("renderPipeline()"), /补充链接/);
});

test("pipeline counts current stages within archive scope, persists grouped filters and keeps completed rounds", async t => {
  const { run } = app(t);
  await run('applyCloudUser({id:"A"})');
  run('state.jobs=[{id:"j",company:"示例公司",role:"产品经理"}]; state.applications=[{id:"a",jobId:"j",status:"written"},{id:"b",jobId:"j",status:"interview_2"},{id:"c",jobId:"j",status:"rejected_assessment"},{id:"d",jobId:"j",status:"offer",archivedAt:"2026-09-01"}];');
  assert.equal(run('pipelineProgressCounts().reduce((sum, item)=>sum+item.count,0)'), 3);
  assert.equal(run('pipelineProgressCounts().find(item=>item.value==="interview_group").count'), 1);
  assert.equal(run('pipelineProgressCounts().find(item=>item.value==="rejected_group").count'), 1);
  run('state.pipelineFilters.scope="archived";');
  assert.equal(run('pipelineProgressCounts().find(item=>item.value==="offer").count'), 1);
  assert.equal(run('restoreState({pipelineFilters:{status:"interview_group"}}).pipelineFilters.status'), "interview_group");
  assert.equal(run('restoreState({pipelineFilters:{status:"rejected_group"}}).pipelineFilters.status'), "rejected_group");
  run('const record=ensureProcessRecord(state.applications[0]); updateProcessResult(record,"waiting");');
  assert.equal(run('state.applications[0].status'), "written");
  assert.equal(run('currentProcessRecord(state.applications[0]).result'), "waiting");
  run('state.applications[0].status="salary";');
  assert.doesNotMatch(run('renderProcessStateCell(state.applications[0], record, state.jobs[0])'), /data-process-result/);
});

test("practice and pipeline headings omit subtitles while keeping their actions", async t => {
  const { run } = app(t);
  await run('applyCloudUser({id:"A"})');
  assert.match(run('renderPractice()'), /<h1>北森职测训练<\/h1><\/div>/);
  assert.match(run('renderPipeline()'), /<h1>投递记录<\/h1><\/div>/);
  assert.match(run('renderPractice()'), /导入题库/);
  assert.match(run('renderPipeline()'), /导出投递表/);
});

test("practice overview keeps recommendations in cards with labelled metrics and a mixed entry", async t => {
  const { run } = app(t);
  await run('applyCloudUser({id:"A"})');
  let html = run("renderPracticeOverview()");
  assert.doesNotMatch(html, /practice-summary|category-recommendation|词语运用/);
  assert.equal((html.match(/class="category-card"/g) || []).length, 5);
  assert.equal((html.match(/<dt>正确率<\/dt>/g) || []).length, 5);
  assert.equal((html.match(/<dt>建议用时<\/dt>/g) || []).length, 5);
  assert.match(html, /data-start-category="mixed">混合练习/);
  run('state.practiceHistory=[{results:[{questionId:questionBank()[0].id,correct:false}]}];');
  html = run("renderPracticeOverview()");
  assert.equal((html.match(/class="category-recommendation"/g) || []).length, 1);
  assert.match(html, /<dd>0%<\/dd>/);
  assert.match(html, /class="btn small primary" data-start-category=/);
  run('questionBank=()=>[]; communityBankStatus="loading";');
  html = run("renderPracticeOverview()");
  assert.equal((html.match(/disabled>题库载入中/g) || []).length, 5);
});

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

test("legacy terminal phases restore into simple statuses without changing distribution groups", async t => {
  const {run}=app(t);
  await run('applyCloudUser({id:"A"})');
  const stages=run("FUNNEL_STAGES.map(([value])=>value)");
  assert.ok(stages.includes("ai_interview"));
  assert.ok(stages.includes("offer_intent"));
  assert.match(run('renderApplicationStageOptions("salary")'), /HR 谈薪/);
  for (const stage of stages) {
    for (const result of ["rejected", "withdrawn"]) {
      const status=`${result}_at_${stage}`;
      const selectedStatus=result === "withdrawn" ? "withdrawn" : stage === "applied" ? "rejected_resume" : ["assessment","ai_interview","written"].includes(stage) ? "rejected_assessment" : ["interview_1","interview_2","interview_3"].includes(stage) ? "rejected_interview" : "rejected_final";
      assert.equal(run(`normalizeApplicationStatus("${status}")`),selectedStatus);
      assert.equal(run(`restoreState({applications:[{id:"a",status:"${status}"}]}).applications[0].status`),selectedStatus);
      assert.equal(run(`isClosedApplicationStatus("${status}")`),true);
      assert.equal(run(`applicationMatchesPipelineStatus("${status}","${result === "rejected" ? "rejected_group" : "withdrawn"}")`),true);
      assert.match(run(`renderApplicationStageOptions("${status}")`), new RegExp(`value="${selectedStatus}" selected`));
      assert.ok(run(`applicationNextAction("${status}")`).length > 0);
    }
  }
  for (const status of ["rejected_resume","rejected_assessment","rejected_interview","rejected_final","withdrawn","offer"]) {
    assert.equal(run(`normalizeApplicationStatus("${status}")`),status);
  }
  assert.equal(run('isClosedApplicationStatus("offer_intent")'),false);
  assert.equal(run('applicationMatchesPipelineStatus("ai_interview","interview_group")'),false);
  assert.equal(run('applicationMatchesPipelineStatus("ai_interview","assessment_group")'),true);
  const options = run('renderApplicationStageOptions("ai_interview")');
  assert.match(options.match(/<optgroup label="测评与笔试">([\s\S]*?)<\/optgroup>/)[1], /value="ai_interview" selected/);
  assert.doesNotMatch(options.match(/<optgroup label="面试轮次">([\s\S]*?)<\/optgroup>/)[1], /ai_interview/);
  run('state.applications=[{id:"ai",status:"ai_interview"}];');
  assert.equal(run('appCount("assessment")'),1);
  assert.equal(run('appCount("interview")'),0);
  assert.equal(run('applicationMatchesPipelineStatus("offer_intent","offer")'),true);
  run('state.jobs=[{id:"j",company:"示例",role:"产品"}]; state.applications=APPLICATION_STAGES.map(([status],i)=>({id:String(i),jobId:"j",status}));');
  assert.equal(run('pipelineProgressCounts().reduce((sum,item)=>sum+item.count,0)'),run('state.applications.length'));
  assert.equal(run('PIPELINE_GROUPS.length'),7);
  const withdrawalOptions = run('renderApplicationStageOptions("withdrawn_at_interview_2")');
  assert.equal((withdrawalOptions.match(/>主动放弃<\/option>/g) || []).length,1);
  assert.doesNotMatch(withdrawalOptions,/value="withdrawn_at_/);
  const rejectionOptions = run('renderApplicationStageOptions("rejected_at_interview_2")');
  assert.equal((rejectionOptions.match(/<option value="rejected_/g) || []).length,4);
  assert.doesNotMatch(rejectionOptions,/value="rejected_at_|历史结束状态/);
});

test("each round maps to grouped rejection or withdrawal in both directions", t => {
  const {run}=app(t);
  for (const stage of run("PROCESS_STAGES")) {
    for (const result of ["rejected","withdrawn"]) {
      run(`state=restoreState({jobs:[{id:"j",company:"示例",role:"产品"}],applications:[{id:"a",jobId:"j",status:"${stage}"}]}); synchronizeProcessRecordsFromApplications();`);
      assert.equal(run('stageForProcessRecord(state.interviewRecords[0].round)'),stage);
      run(`updateProcessResult(state.interviewRecords[0],"${result}")`);
      const endedStatus=result === "withdrawn" ? "withdrawn" : ["assessment","ai_interview","written"].includes(stage) ? "rejected_assessment" : stage === "interview_more" ? "rejected_final" : "rejected_interview";
      assert.equal(run('state.applications[0].status'),endedStatus);
      run(`state.applications[0].status="${stage}"; synchronizeApplicationProcessState(state.applications[0]); updateProcessResult(state.interviewRecords[0],"waiting");`);
      assert.equal(run('state.applications[0].status'),stage);
      run(`state.applications[0].status="${endedStatus}"; synchronizeApplicationProcessState(state.applications[0]);`);
      assert.equal(run('state.interviewRecords[0].result'),result);
      assert.equal(run('state.interviewRecords[0].status'),"completed");
    }
  }
  assert.equal(run('stageForProcessRecord("AI笔试")'),"written");
});

function linkedWorkflow(t, overrides = {}) {
  const instance = app(t, overrides);
  instance.run(`state=restoreState({
    profile:{name:"测试用户"},
    jobs:[{id:"growth",company:"示例公司",role:"增长平台"},{id:"other",company:"示例公司",role:"另一岗位"}],
    applications:[{id:"a",jobId:"growth",status:"interview_1"},{id:"b",jobId:"other",status:"written"}]
  }); synchronizeProcessRecordsFromApplications();
  var application=state.applications[0]; var first=currentProcessRecord(application);
  first.date="2026-01-01T10:00"; first.questions=["保留的问题"]; first.recording={name:"保留录音.mp3"};`);
  return instance;
}

test("archive and restore affect all linked rounds, scope counts and reminders, not another role", t => {
  const { run } = linkedWorkflow(t);
  run('updateProcessResult(first,"passed"); application.status="interview_2"; synchronizeApplicationProcessState(application); var second=currentProcessRecord(application); second.date="2026-01-02T10:00";');
  assert.equal(run('interviewRecordsInScope("active").length'),3);
  assert.equal(run('workspaceReminders().some(item=>item.interviewRecordId===second.id)'),true);
  run('application.archivedAt="2026-01-03";');
  assert.equal(run('interviewRecordsInScope("active").length'),1);
  assert.equal(run('interviewRecordsInScope("archived").length'),2);
  assert.equal(run('interviewRecordsInScope("all").length'),3);
  assert.equal(run('workspaceReminders().some(item=>[first.id,second.id].includes(item.interviewRecordId))'),false);
  assert.equal(run('first.questions[0]'),"保留的问题");
  assert.equal(run('first.recording.name'),"保留录音.mp3");
  run('application.archivedAt="";');
  assert.equal(run('interviewRecordsInScope("active").length'),3);
  assert.equal(run('workspaceReminders().some(item=>item.interviewRecordId===second.id)'),true);
  assert.equal(run('first.result'),"passed");
});

test("older rounds and archived or ended records cannot roll back, end or reopen a current application", t => {
  const { run } = linkedWorkflow(t);
  run('application.status="interview_2"; synchronizeApplicationProcessState(application); var second=currentProcessRecord(application); var snapshot=JSON.stringify(application);');
  for (const result of ["pending","waiting","passed","rejected","withdrawn","offer"]) {
    run(`updateProcessResult(first,"${result}");`);
    assert.equal(run('JSON.stringify(application)'),run('snapshot'));
  }
  for (const status of ["interview_2","salary","offer_intent","offer","withdrawn","rejected_interview"]) {
    run(`application.status="${status}"; application.archivedAt="2026-01-03"; snapshot=JSON.stringify(application);`);
    run('updateProcessResult(second,"pending");');
    assert.equal(run('JSON.stringify(application)'),run('snapshot'));
  }
  run('application.archivedAt=""; application.status="rejected_interview"; snapshot=JSON.stringify(application); updateProcessResult(second,"waiting"); synchronizeProcessRecordsFromApplications();');
  assert.equal(run('JSON.stringify(application)'),run('snapshot'));
  assert.equal(run('second.result'),"waiting", "reload does not overwrite a deliberate historical correction");
});

test("only the current round is actionable; rejection, withdrawal, offer and missing parents stop reminders", t => {
  const { run } = linkedWorkflow(t);
  run('application.status="interview_2"; synchronizeApplicationProcessState(application); var second=currentProcessRecord(application); second.date="2026-01-02";');
  assert.equal(run('isActionableProcessRecord(first)'),false);
  assert.equal(run('interviewStatusLabel(first)'),"历史安排");
  assert.equal(run('isActionableProcessRecord(second)'),true);
  for (const status of ["salary","offer_intent","offer","withdrawn","rejected_interview","rejected_final"]) {
    run(`application.status="${status}";`);
    assert.equal(run('workspaceReminders().some(item=>item.interviewRecordId===second.id)'),false);
  }
  run('state.applications=state.applications.filter(app=>app.id!=="a");');
  assert.equal(run('isInterviewArchived(second)'),true);
  assert.equal(run('isActionableProcessRecord(second)'),false);
});

test("legacy matching requires a unique company and role; explicit IDs outrank conflicting pointers", t => {
  const { run } = linkedWorkflow(t);
  run('var legacy={id:"legacy",company:"示例公司",role:"增长平台",round:"二面"};');
  assert.equal(run('applicationForInterviewRecord(legacy)?.id'),"a");
  run('state.applications.push({id:"same-role-again",jobId:"growth",status:"applied"});');
  assert.equal(run('applicationForInterviewRecord(legacy)'),null);
  run('legacy.applicationId="b"; application.interviewRecordId="legacy";');
  assert.equal(run('applicationForInterviewRecord(legacy)?.id'),"b");
  run('legacy.applicationId="missing";');
  assert.equal(run('applicationForInterviewRecord(legacy)'),null);
});

test("manual linking follows the chosen job but does not alter its stage; explicit unlink survives reload", t => {
  const { run } = linkedWorkflow(t);
  run('linkInterviewRecord(first,"b");');
  assert.equal(run('first.role'),"另一岗位");
  assert.equal(run('state.applications[1].status'),"written");
  assert.equal(run('application.interviewRecordId'),"");
  run('linkInterviewRecord(first,""); synchronizeProcessRecordsFromApplications();');
  assert.equal(run('applicationForInterviewRecord(first)'),null);
  assert.equal(run('first.recording.name'),"保留录音.mp3");
  assert.throws(()=>run('linkInterviewRecord(first,"not-found")'),/已不存在/);
});

test("manual scheduling fills an empty generated placeholder and preserves existing content", t => {
  const { run } = linkedWorkflow(t);
  run('var draft={id:"new",applicationId:"b",company:"错误公司",role:"错误岗位",round:"笔试",status:"scheduled",result:"pending",date:"2026-01-02T10:00",questions:[]}; var originalId=state.applications[1].interviewRecordId; var saved=addInterviewRecord(draft);');
  assert.equal(run('saved.id'),run('originalId'));
  assert.equal(run('saved.company'),"示例公司");
  assert.equal(run('saved.role'),"另一岗位");
  assert.equal(run('state.interviewRecords.length'),2);
  run('saved.questions=["已有笔试复盘"]; addInterviewRecord({...draft,id:"another",date:"2026-01-03T10:00"});');
  assert.equal(run('state.interviewRecords.length'),3);
  assert.equal(run('saved.questions[0]'),"已有笔试复盘");
  assert.equal(run('first.recording.name'),"保留录音.mp3");
  run('var solo=addInterviewRecord({...draft,id:"solo",applicationId:"",company:"示例公司",role:"增长平台"});');
  assert.equal(run('applicationForInterviewRecord(solo)'),null);
});

test("deleting an archived application preserves and archives every round without resurrecting deadlines", t => {
  const { run } = linkedWorkflow(t);
  run('application.status="interview_2"; synchronizeApplicationProcessState(application); var second=currentProcessRecord(application); second.date="2026-01-02"; state.jobs[0].deadline=localDateKey();');
  run('removeApplication("a");');
  assert.equal(run('state.applications.length'),2,"only archived applications can be deleted");
  run('application.archivedAt="2026-01-03"; removeApplication("a"); synchronizeProcessRecordsFromApplications();');
  assert.equal(run('state.applications.length'),1);
  assert.equal(run('interviewRecordsInScope("archived").length'),2);
  assert.equal(run('applicationForInterviewRecord(first)'),null);
  assert.equal(run('first.recording.name'),"保留录音.mp3");
  assert.equal(run('workspaceReminders().some(item=>["interview-"+first.id,"interview-"+second.id,"deadline-growth"].includes(item.id))'),false);
});

test("creating a later interview advances an active application, while backfills and closed applications stay put", t => {
  const { run } = linkedWorkflow(t);
  run('var second=addInterviewRecord({id:"second",applicationId:"a",round:"二面",date:"2026-01-02",status:"scheduled",result:"pending",questions:[],nextActions:"准备二面"});');
  assert.equal(run('application.status'),"interview_2");
  assert.equal(run('currentProcessRecord(application).id'),"second");
  assert.equal(run('isActionableProcessRecord(first)'),false);
  run('addInterviewRecord({id:"backfill",applicationId:"a",round:"一面",date:"2026-01-01",status:"completed",result:"passed",questions:[]});');
  assert.equal(run('application.status'),"interview_2");
  assert.equal(run('currentProcessRecord(application).id'),"second");
  run('application.status="withdrawn"; addInterviewRecord({id:"third",applicationId:"a",round:"三面",date:"2026-01-03",status:"scheduled",result:"pending",questions:[]});');
  assert.equal(run('application.status'),"withdrawn");
  assert.equal(run('workspaceReminders().some(item=>item.interviewRecordId==="third")'),false);
});

test("interview metrics and home badges follow the same scope and actionable rules", async t => {
  const { run } = linkedWorkflow(t);
  await run('applyCloudUser({id:"A"})');
  run('state.profile.name="测试"; state.jobs=[{id:"j",company:"示例",role:"产品"}]; state.applications=[{id:"a",jobId:"j",status:"interview_1"}]; synchronizeProcessRecordsFromApplications(); state.applications[0].archivedAt="2026-01-03";');
  assert.match(run('renderInterview()'),/data-interview-status-filter="scheduled"><span>待进行<\/span><strong>0<\/strong>/);
  assert.match(run('renderHome()'),/0 场待进行/);
  run('state.interviewFilters.scope="archived";');
  assert.match(run('renderInterview()'),/data-interview-status-filter="all"><span>全部环节<\/span><strong>1<\/strong>/);
  assert.match(run('renderInterview()'),/关联投递 · 已归档/);
  assert.equal(run('applicationStaticProcessLabel("rejected_final")'),"未通过");
  assert.equal(run('applicationStaticProcessLabel("withdrawn")'),"主动放弃");
});

test("explicitly archived standalone records can be recovered without inventing an application", async t => {
  const handlers={};
  const { run }=app(t,{document:{addEventListener:(type,handler)=>{handlers[type]=handler;},querySelector:()=>null}});
  await run('applyCloudUser({id:"A"})');
  run('state.interviewRecords=[{id:"standalone",company:"示例",role:"产品",round:"一面",result:"pending",status:"scheduled",date:"2026-01-01",questions:[],detachedFromApplication:true}];');
  const click=()=>handlers.click({target:{closest:selector=>selector==='[data-toggle-record-archive]'?{dataset:{toggleRecordArchive:"standalone"}}:null}});
  click();
  assert.equal(run('interviewRecordsInScope("active").length'),0);
  assert.equal(run('workspaceReminders().length'),0);
  click();
  assert.equal(run('interviewRecordsInScope("active").length'),1);
  assert.equal(run('workspaceReminders().length'),1);
  assert.equal(run('state.applications.length'),0);
});

test("AI and other assessment reminders use the event time when set; rescheduling invalidates old acknowledgements", async t => {
  const { run } = linkedWorkflow(t);
  await run('applyCloudUser({id:"A"})');
  run('state.jobs=[{id:"j",company:"示例",role:"产品"}]; state.applications=[{id:"a",jobId:"j",status:"ai_interview"}]; synchronizeProcessRecordsFromApplications(); var record=currentProcessRecord(state.applications[0]);');
  assert.equal(run('workspaceReminders()[0].id'),"missing-a");
  run('record.date="2026-01-01T10:00";');
  assert.equal(run('workspaceReminders().length'),1);
  assert.equal(run('workspaceReminders()[0].interviewRecordId'),run('record.id'));
  run('setReminderCompleted(workspaceReminders()[0].key,true);');
  assert.equal(run('workspaceReminders().length'),0);
  run('record.date="2026-01-02T10:00";');
  assert.equal(run('workspaceReminders().length'),1);
  run('updateProcessResult(record,"waiting");');
  assert.equal(run('workspaceReminders().length'),0);
});

test("archived records remain exported regardless of filters, including older replaced entries", async t => {
  let blob;
  const { run } = linkedWorkflow(t, { Blob, URL:{createObjectURL:value=>{blob=value;return "blob:test";},revokeObjectURL(){}}, document:{addEventListener(){},querySelector:()=>null,createElement:()=>({click(){}})} });
  run('application.archivedAt="2026-01-03"; first.superseded=true; state.interviewFilters.scope="active";');
  assert.equal(run('exportInterviewRecordsCsv()'),2);
  const csv=await blob.text();
  assert.match(csv,/归档状态/);
  assert.match(csv,/已归档/);
  assert.match(csv,/已被后续安排替代/);
  assert.match(csv,/保留的问题/);
  assert.match(csv,/保留录音/);
});

test("archived deep links choose archived scope and home routing uses only active actionable records", async t => {
  const handlers={};
  const { run }=linkedWorkflow(t,{requestAnimationFrame(){},window:{addEventListener(){},scrollTo(){}},document:{addEventListener:(type,handler)=>{handlers[type]=handler;},querySelector:()=>null}});
  await run('applyCloudUser({id:"A"})');
  run('state.jobs=[{id:"j",company:"示例",role:"产品"}]; state.applications=[{id:"a",jobId:"j",status:"interview_1"}]; synchronizeProcessRecordsFromApplications(); var record=currentProcessRecord(state.applications[0]); state.applications[0].archivedAt="2026-01-03";');
  handlers.click({target:{closest:selector=>selector==='[data-open-interview]'?{dataset:{openInterview:run('record.id')}}:null}});
  assert.equal(run('state.interviewFilters.scope'),"archived");
  assert.equal(run('selectedInterviewRecord().id'),run('record.id'));
  handlers.click({target:{closest:selector=>selector==='[data-home-route]'?{dataset:{homeRoute:"interview"}}:null}});
  assert.equal(run('state.interviewFilters.scope'),"active");
  assert.equal(run('interviewRecordsForFilters().length'),0);
});

test("restored workspaces cannot mutate empty defaults or leak auto-created records across accounts", async t => {
  const { run } = app(t);
  await run('applyCloudUser({id:"A"})');
  run('state.jobs=[{id:"private-job",company:"A的公司",role:"A的岗位"}]; state.applications=[{id:"private-app",jobId:"private-job",status:"interview_1"}]; synchronizeProcessRecordsFromApplications(); state.answerBank.push({answer:"PRIVATE_ANSWER"}); state.radarActivity.savedJobIds.push("PRIVATE_JOB"); state.profile.skills.push("PRIVATE_SKILL");');
  assert.equal(run('initialState.interviewRecords.length'),0);
  assert.equal(run('initialState.answerBank.length'),0);
  assert.equal(run('initialState.radarActivity.savedJobIds.length'),0);
  assert.equal(run('initialState.profile.skills.length'),0);
  await run('applyCloudUser(null)');
  assert.equal(run('state.interviewRecords.length'),0);
  await run('applyCloudUser({id:"B"})');
  assert.equal(run('state.interviewRecords.length'),0);
  run('var snapshot={interviewRecords:[{id:"old",questions:["original"]}]}; var restored=restoreState(snapshot); restored.interviewRecords[0].questions.push("changed");');
  assert.equal(run('snapshot.interviewRecords[0].questions.length'),1);
});

test("legacy completed records without a result stay completed and do not generate scheduled reminders", t => {
  const { run } = app(t);
  run('state=restoreState({interviewRecords:[{id:"legacy",company:"示例",role:"产品",round:"一面",status:"completed",date:"2026-01-01"}]});');
  assert.equal(run('state.interviewRecords[0].result'),"waiting");
  assert.equal(run('processResultLabel(state.interviewRecords[0])'),"已完成，待结果");
  assert.equal(run('workspaceReminders().length'),0);
});

test("structured backup import validates format and never pretends to restore attachments",t=>{
  const {run}=app(t);
  assert.throws(()=>run('parseWorkspaceBackup("{}")'));
  run('var backupFixture={format:"offerflow-workspace-backup",version:1,state:{profile:{name:"SYNTHETIC"},applications:[],jobs:[],resumeDocuments:[{id:"file1"}],interviewRecords:[{id:"record1",recording:{name:"test.mp3"}}]}}');
  assert.equal(run("parseWorkspaceBackup(JSON.stringify(backupFixture)).state.profile.name"),"SYNTHETIC");
  assert.equal(run("parseWorkspaceBackup(JSON.stringify(backupFixture)).state.resumeDocuments.length"),0);
  assert.equal(run("parseWorkspaceBackup(JSON.stringify(backupFixture)).state.interviewRecords[0].recording"),null);
});
