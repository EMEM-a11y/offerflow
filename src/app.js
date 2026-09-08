import { PRACTICE_CATEGORIES, PRACTICE_PAPERS, SEED_QUESTIONS, categoryById, validateImportedQuestions } from "./question-bank.js";
import { COMMUNITY_BANK_SOURCE, createCommunityPaper, loadCommunityQuestionBank } from "./community-question-bank.js";
import { FALLBACK_RADAR_JOBS, INDUSTRY_GROUPS, JOB_REFRESH_WORKFLOW_URL, JOB_ROLE_CATEGORIES, JOB_SOURCES, jobRoleCategories, loadRadarJobs } from "./job-radar.js";
import { APPLICATION_RULES, APPLICATION_RULES_UPDATED_AT } from "./application-rules.js";
import { cloudConfigured, captchaSiteKey, currentCloudUser, loadCloudWorkspace, saveCloudWorkspace, sendLoginLink, signOutCloud, watchCloudAuth } from "./cloud.js";
import { WorkspaceSync } from "./workspace-sync.js";
import { assetUrl } from "./asset-url.js";
import { createLoginRequest } from "./login-request.js";
import { createLoginCaptcha } from "./login-captcha.js";

const PROTECTED_VIEWS = new Set(["home", "resume", "interview", "pipeline"]);
const INTERVIEW_AUDIO_DB = "offerflow-interview-audio";
const INTERVIEW_AUDIO_STORE = "recordings";
const RESUME_FILE_DB = "offerflow-resume-files";
const RESUME_FILE_STORE = "files";

localStorage.removeItem("offerflow-privacy-v1");
sessionStorage.removeItem("offerflow-privacy-unlocked");

let communityQuestions = [];
let communityPapers = [];
let communityBankStatus = "loading";

const EMPTY_PROFILE = {
  source: "empty",
  name: "",
  targetRole: "",
  targetCity: "",
  years: "",
  skills: [],
  email: "",
  phone: "",
  summary: "",
  experience: "",
  education: "",
  school: "",
  major: "",
  degree: "",
  graduation: "",
  internshipCompany: "",
  internshipRole: "",
  availability: "",
  portfolio: ""
};

const EMPTY_INTERVIEW_PREP = { intro60: "", intro180: "", reminders: "" };

const initialState = {
  activeView: "home",
  mobileOpen: false,
  modal: null,
  profile: structuredClone(EMPTY_PROFILE),
  jdContext: { jobId: "", keywords: [], gaps: [] },
  practiceView: "overview",
  practiceSession: null,
  practiceHistory: [],
  wrongQuestionIds: [],
  importedQuestions: [],
  interviewView: "records",
  selectedInterviewRecord: "",
  interviewRecords: [],
  interviewFilters: { stage: "all", status: "all" },
  interviewPrep: structuredClone(EMPTY_INTERVIEW_PREP),
  resumeView: "vault",
  resumeDocuments: [],
  answerBank: [],
  applicationDrafts: [],
  activeApplicationDraft: null,
  jobView: "radar",
  ruleFilters: { query: "" },
  jobFilters: { query: "", roleCategory: "产品/项目", industry: "互联网/科技", batch: "全部批次", linkMode: "可直接投递", inbox: "全部岗位", sort: "偏好优先", industryFocusInitialized: true },
  radarActivity: {
    schemaVersion: 1,
    baselineInitialized: false,
    knownJobIds: [],
    newJobIds: [],
    viewedAt: {},
    dailyViewed: {},
    lastViewedJobId: "",
    lastViewedAt: "",
    lastSyncAt: "",
    savedJobIds: [],
    hiddenJobIds: []
  },
  selectedRadarJob: FALLBACK_RADAR_JOBS[0].id,
  companyReviewQueue: [],
  companyDiagnoses: {},
  selectedDiagnosisCompany: "",
  woodenFishCount: 0,
  selectedJob: "",
  editingApplicationId: "",
  jobs: [],
  pipelineFilters: { query: "", company: "全部公司", status: "全部进度", processResult: "全部环节状态", scope: "active" },
  applications: [],
  reminderCompletions: {},
  projects: [],
  dataSync: null,
  tasks: {
    analyze: false,
    resume: false,
    practice: false,
    interview: false
  }
};

const viewMeta = {
  home: ["求职概览", "阶段分布、待办与近期安排"],
  practice: ["职测场", "专项练习、模拟套卷与错题复盘"],
  jobs: ["岗位雷达", "发现值得投入的机会"],
  resume: ["简历智填", "调用你的经历，为不同岗位生成填写内容"],
  interview: ["笔面手记", "从事前准备到事后复盘，记下每一次笔面经历"],
  pipeline: ["投递记录", "查看每个岗位从投递到结果走到了哪里"]
};

const navItems = [
  ["home", "概", "求职概览"],
  ["practice", "练", "职测场"],
  ["jobs", "岗", "岗位雷达"],
  ["resume", "简", "简历智填"],
  ["interview", "面", "笔面手记"],
  ["pipeline", "投", "投递记录"]
];

const MAILBOX_PROVIDERS = [
  { name: "Gmail", description: "Google 邮箱", url: "https://mail.google.com/mail/u/0/#inbox", domains: ["gmail.com", "googlemail.com"] },
  { name: "QQ 邮箱", description: "QQ 与 Foxmail", url: "https://mail.qq.com/", domains: ["qq.com", "foxmail.com"] },
  { name: "网易 163", description: "163 邮箱", url: "https://mail.163.com/", domains: ["163.com"] },
  { name: "网易 126", description: "126 邮箱", url: "https://mail.126.com/", domains: ["126.com"] },
  { name: "Outlook", description: "Outlook 与 Hotmail", url: "https://outlook.live.com/mail/0/", domains: ["outlook.com", "hotmail.com", "live.com", "msn.com"] },
  { name: "新浪邮箱", description: "新浪个人邮箱", url: "https://mail.sina.com.cn/", domains: ["sina.com", "sina.cn"] }
];

const DAILY_ENCOURAGEMENT_STORAGE_KEY = "offerflow-daily-encouragement-v5";
const DAILY_ENCOURAGEMENT_ENDPOINT = "https://hub.saintic.com/openservice/sentence/rensheng.lizhi.json";
const DAILY_ENCOURAGEMENT_FALLBACKS = [
  { text: "长风破浪会有时，直挂云帆济沧海。", author: "李白", source: "行路难·其一" },
  { text: "千磨万击还坚劲，任尔东西南北风。", author: "郑燮", source: "竹石" },
  { text: "路漫漫其修远兮，吾将上下而求索。", author: "屈原", source: "离骚" },
  { text: "纸上得来终觉浅，绝知此事要躬行。", author: "陆游", source: "冬夜读书示子聿" },
  { text: "博观而约取，厚积而薄发。", author: "苏轼", source: "稼说送张琥" },
  { text: "欲穷千里目，更上一层楼。", author: "王之涣", source: "登鹳雀楼" },
  { text: "莫听穿林打叶声，何妨吟啸且徐行。", author: "苏轼", source: "定风波" },
  { text: "大鹏一日同风起，扶摇直上九万里。", author: "李白", source: "上李邕" },
  { text: "不积跬步，无以至千里；不积小流，无以成江海。", author: "荀子", source: "劝学" },
  { text: "操千曲而后晓声，观千剑而后识器。", author: "刘勰", source: "文心雕龙" }
];
const ENCOURAGEMENT_EXCLUDE = /相思|爱情|恋人|情人|红颜|爱意|爱着|吻|妾|君兮|想你|爱你|喜欢你|心动|拥抱/;

const APPLICATION_STAGES = [
  ["applied", "已投递 / 简历筛选"],
  ["assessment", "测评"],
  ["written", "笔试"],
  ["interview_1", "一面"],
  ["interview_2", "二面"],
  ["interview_3", "三面"],
  ["interview_more", "加面 / 终面"],
  ["salary", "谈薪"],
  ["offer", "Offer（录用意向）"],
  ["rejected_resume", "简历未通过"],
  ["rejected_assessment", "测评 / 笔试未通过"],
  ["rejected_interview", "面试未通过"],
  ["rejected_final", "终面 / 最终未通过"],
  ["withdrawn", "已放弃"]
];

const FUNNEL_STAGES = APPLICATION_STAGES.slice(0, 9);
const INTERVIEW_STAGES = ["interview_1", "interview_2", "interview_3", "interview_more"];
const PROCESS_STAGES = ["assessment", "written", ...INTERVIEW_STAGES];
const INTERVIEW_STAGE_FILTERS = [
  ["all", "全部环节"],
  ["assessment", "测评"],
  ["written", "笔试"],
  ["interview_1", "一面"],
  ["interview_2", "二面"],
  ["interview_3", "三面"],
  ["interview_more", "加面 / 终面"]
];
const REJECTION_STAGES = ["rejected_resume", "rejected_assessment", "rejected_interview", "rejected_final"];
const PROCESS_RESULT_OPTIONS = [
  ["pending", "待进行"],
  ["waiting", "已完成，待结果"],
  ["passed", "已通过"],
  ["rejected", "未通过"],
  ["offer", "已获 Offer"]
];

let state = structuredClone(initialState);
let cloudUser = null;
let cloudSyncStatus = cloudConfigured ? "checking" : "local";
let authEpoch = 0;
let legacyMigrationNote = "";
let loginRequestTimer;
const loginCaptcha = createLoginCaptcha(captchaSiteKey, updateLoginRequest);
const loginRequest = createLoginRequest(email => sendLoginLink(email, loginCaptcha.getToken()), updateLoginRequest);
const workspaceSync = new WorkspaceSync({
  load: loadCloudWorkspace, save: saveCloudWorkspace, storage: sessionStorage,
  onStatus: status => { cloudSyncStatus = status; updateSyncStatus(); },
});
let toastTimer;
let homeAgendaView = "pending";
let pendingWorkspaceImport = null;
let radarJobs = [...FALLBACK_RADAR_JOBS];
let radarSourceStatus = JOB_SOURCES.map(source => ({ ...source, state: "loading", count: 0, checkedAt: "" }));
let radarLoading = true;
let radarOffline = false;
let dailyEncouragementState = loadCachedEncouragement();
let dailyEncouragementLoading = false;

function restoreState(saved) {
  if (!saved) return structuredClone(initialState);
  const savedPipelineStatus = saved.pipelineFilters?.status;
  const restored = {
    ...structuredClone(initialState),
    ...saved,
    profile: { ...initialState.profile, ...saved.profile },
    jdContext: { ...initialState.jdContext, ...saved.jdContext },
    tasks: { ...initialState.tasks, ...saved.tasks },
    reminderCompletions: { ...initialState.reminderCompletions, ...saved.reminderCompletions },
    resumeDocuments: saved.resumeDocuments || [],
    answerBank: saved.answerBank || initialState.answerBank,
    applicationDrafts: saved.applicationDrafts || [],
    interviewRecords: saved.interviewRecords || initialState.interviewRecords,
    interviewFilters: { ...initialState.interviewFilters, ...saved.interviewFilters },
    interviewPrep: { ...initialState.interviewPrep, ...saved.interviewPrep },
    ruleFilters: { ...initialState.ruleFilters, ...saved.ruleFilters },
    jobFilters: { ...initialState.jobFilters, ...saved.jobFilters },
    radarActivity: { ...initialState.radarActivity, ...saved.radarActivity },
    companyDiagnoses: saved.companyDiagnoses && typeof saved.companyDiagnoses === "object" ? saved.companyDiagnoses : {},
    pipelineFilters: {
      ...initialState.pipelineFilters,
      ...saved.pipelineFilters,
      status: !savedPipelineStatus || savedPipelineStatus === "全部进度" ? "全部进度" : normalizeApplicationStatus(savedPipelineStatus)
    },
    applications: (saved.applications || initialState.applications).map(item => ({
      feishuRecordId: "",
      syncStatus: "local_only",
      updatedAt: "",
      appliedAt: "",
      followUpAt: "",
      archivedAt: "",
      progressUrl: "",
      notes: "",
      interviewRecordId: "",
      createdAt: "",
      ...item,
      status: normalizeApplicationStatus(item.status)
    }))
  };
  if (!Object.hasOwn(viewMeta, restored.activeView)) restored.activeView = "home";
  if (!saved.jobFilters?.industryFocusInitialized) {
    restored.jobFilters.industry = "互联网/科技";
    restored.jobFilters.industryFocusInitialized = true;
  }
  if (restored.jobFilters.inbox === "已投递") restored.jobFilters.inbox = "有投递记录";
  if (saved.radarActivity && !saved.radarActivity.schemaVersion) {
    restored.radarActivity.schemaVersion = 1;
    restored.radarActivity.viewedAt = {};
    restored.radarActivity.dailyViewed = {};
    restored.radarActivity.lastViewedJobId = "";
    restored.radarActivity.lastViewedAt = "";
  }
  return restored;
}

function normalizeApplicationStatus(status) {
  if (status === "saved" || status === "interested") return "applied";
  if (status === "interview" || status === "interview_pending" || status === "interviewing") return "interview_1";
  if (status === "rejected") return "rejected_resume";
  return APPLICATION_STAGES.some(([value]) => value === status) ? status : "applied";
}

function isClosedApplicationStatus(status) {
  return status === "offer" || status === "withdrawn" || REJECTION_STAGES.includes(status);
}

function saveState(message) {
  if (hasPrivateAccess()) workspaceSync.queue(state);
  if (message) showToast(message);
}

function createEmptyPersonalState() {
  const empty = structuredClone(initialState);
  empty.activeView = "home";
  empty.modal = null;
  empty.profile = { ...structuredClone(EMPTY_PROFILE), email: cloudUser?.email || "" };
  empty.jdContext = { jobId: "", keywords: [], gaps: [] };
  empty.practiceSession = null;
  empty.practiceHistory = [];
  empty.wrongQuestionIds = [];
  empty.importedQuestions = [];
  empty.interviewRecords = [];
  empty.selectedInterviewRecord = "";
  empty.interviewPrep = { intro60: "", intro180: "", reminders: "" };
  empty.resumeDocuments = [];
  empty.answerBank = [];
  empty.applicationDrafts = [];
  empty.activeApplicationDraft = null;
  empty.jobs = [];
  empty.selectedJob = "";
  empty.applications = [];
  empty.projects = [];
  empty.companyReviewQueue = [];
  empty.companyDiagnoses = {};
  empty.selectedDiagnosisCompany = "";
  empty.tasks = { analyze: false, resume: false, practice: false, interview: false };
  empty.dataSync = null;
  return empty;
}

function deleteLocalDatabase(name) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("本地文件仍在使用中"));
  });
}

function exportWorkspaceBackup() {
  if (!hasPrivateAccess()) return;
  downloadWorkspaceState(state);
}

function downloadWorkspaceState(workspaceState, label = "备份") {
  const backup = {
    format: "offerflow-workspace-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    note: "此备份包含结构化资料，不包含简历文件和面试录音。",
    state: workspaceState
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `OfferFlow-${label}-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${(/^[\s]*[=+@-]/.test(text) ? "'" + text : text).replace(/"/g, '""')}"`;
}

function exportApplicationsCsv() {
  const headers = ["公司", "岗位", "工作地点", "当前阶段", "环节状态", "投递日期", "查看状态网址", "提醒日期", "下一步", "笔面记录", "备注", "是否归档", "数据来源", "最后更新"];
  const rows = state.applications
    .slice()
    .sort((a, b) => (b.updatedAt || b.appliedAt || "").localeCompare(a.updatedAt || a.appliedAt || ""))
    .map(app => {
      const job = state.jobs.find(item => item.id === app.jobId) || {};
      const currentRecord = currentProcessRecord(app);
      const linkedRecords = (state.interviewRecords || [])
        .filter(record => !record.superseded && (record.applicationId === app.id || record.id === app.interviewRecordId))
        .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
      const processSummary = linkedRecords.map(record => {
        const date = record.date ? ` ${record.date}` : "";
        return `${record.round || "笔面环节"}${date}：${processResultLabel(record)}`;
      }).join(" | ");
      const processState = currentRecord
        ? processResultLabel(currentRecord)
        : PROCESS_STAGES.includes(app.status) ? "待进行" : "";
      return [
        job.company || "",
        job.role || "",
        job.location || "",
        applicationStageLabel(app.status),
        processState,
        app.appliedAt || "",
        app.progressUrl || "",
        app.followUpAt || "",
        app.next || "",
        processSummary,
        app.notes || "",
        app.archivedAt ? "已归档" : "未归档",
        app.syncStatus === "imported" ? "飞书导入" : app.feishuRecordId ? "飞书关联" : "工作台记录",
        app.updatedAt || app.date || ""
      ];
    });
  const csv = `\uFEFF${[headers, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `OfferFlow-投递记录-${localDateKey()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  return rows.length;
}

function exportInterviewRecordsCsv() {
  const headers = ["公司", "岗位", "环节", "日期时间", "记录状态", "环节结果", "时长", "题目 / 问题", "回答与现场记录", "做得好的", "需要改进", "助手复盘结论", "下一步行动", "录音备份提示", "关联投递"];
  const rows = (state.interviewRecords || [])
    .filter(record => !record.superseded)
    .slice()
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .map(record => {
      const application = state.applications.find(app => app.id === record.applicationId || app.interviewRecordId === record.id);
      const questions = Array.isArray(record.questions) ? record.questions.join("\n") : String(record.questions || "");
      const recordingNote = record.recording
        ? `有录音：${record.recording.name || "未命名文件"}（录音仅存于当前浏览器，未包含在 CSV 中）`
        : "无录音";
      return [
        record.company || "",
        record.role || "",
        record.round || "",
        record.date || "",
        record.status === "scheduled" ? "待进行" : "已完成",
        processResultLabel(record),
        record.duration || "",
        questions,
        record.answerNotes || "",
        record.strengths || "",
        record.improvements || "",
        record.assistantReview || "",
        record.nextActions || "",
        recordingNote,
        application ? `${applicationStageLabel(application.status)}${application.appliedAt ? `（${application.appliedAt}）` : ""}` : "未关联"
      ];
    });
  const csv = `\uFEFF${[headers, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `OfferFlow-笔面记录-${localDateKey()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  return rows.length;
}

function parseWorkspaceBackup(text) {
  const backup = JSON.parse(text);
  if (backup?.format !== "offerflow-workspace-backup" || backup?.version !== 1 || !backup?.state || typeof backup.state !== "object" || Array.isArray(backup.state)) {
    throw new Error("这不是有效的 OfferFlow 备份文件");
  }
  if (!backup.state.profile || !Array.isArray(backup.state.applications) || !Array.isArray(backup.state.jobs) || !Array.isArray(backup.state.interviewRecords)) {
    throw new Error("备份文件缺少必要的求职数据");
  }
  const imported = restoreState(backup.state);
  imported.activeView = "home";
  imported.mobileOpen = false;
  imported.modal = null;
  imported.resumeDocuments = [];
  imported.interviewRecords = imported.interviewRecords.map(record => ({ ...record, recording: null }));
  return {
    state: imported,
    exportedAt: backup.exportedAt || "",
    applications: imported.applications.length,
    interviews: imported.interviewRecords.length,
    projects: imported.projects.length
  };
}

async function importWorkspaceBackup() {
  if (!pendingWorkspaceImport || !hasPrivateAccess()) throw new Error("备份文件或登录状态已失效");
  const epoch = authEpoch;
  const imported = pendingWorkspaceImport.state;
  await workspaceSync.flush();
  assertSession(epoch);
  workspaceSync.queue(imported);
  await workspaceSync.flush();
  assertSession(epoch);
  state = imported;
  synchronizeProcessRecordsFromApplications();
  pendingWorkspaceImport = null;
}

async function clearPersonalWorkspace() {
  if (!hasPrivateAccess()) throw new Error("请先登录");
  const epoch = authEpoch;
  const audioDb = accountDatabaseName(INTERVIEW_AUDIO_DB);
  const resumeDb = accountDatabaseName(RESUME_FILE_DB);
  await workspaceSync.flush();
  assertSession(epoch);
  interviewAudioUrls.forEach(url => URL.revokeObjectURL(url));
  interviewAudioUrls = [];
  const empty = createEmptyPersonalState();
  pendingWorkspaceImport = null;
  workspaceSync.queue(empty);
  await workspaceSync.flush();
  assertSession(epoch);
  state = empty;
  try {
    await Promise.all([
      deleteLocalDatabase(audioDb),
      deleteLocalDatabase(resumeDb)
    ]);
  } catch {
    throw new Error("结构化资料已清空，但本机附件尚未清完。请关闭其他页面后重试。");
  }
}

let interviewAudioUrls = [];

function assertSession(epoch) {
  if (epoch !== authEpoch || !hasPrivateAccess()) throw new Error("账号已变化，请重新操作");
}

function accountDatabaseName(name) {
  if (!hasPrivateAccess()) throw new Error("请先登录");
  return `${name}:${cloudUser.id}`;
}

function openInterviewAudioDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(accountDatabaseName(INTERVIEW_AUDIO_DB), 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(INTERVIEW_AUDIO_STORE)) request.result.createObjectStore(INTERVIEW_AUDIO_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putInterviewRecording(recordId, file) {
  const db = await openInterviewAudioDb();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(INTERVIEW_AUDIO_STORE, "readwrite");
    transaction.objectStore(INTERVIEW_AUDIO_STORE).put(file, recordId);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

async function getInterviewRecording(recordId) {
  const epoch = authEpoch;
  const db = await openInterviewAudioDb();
  const blob = await new Promise((resolve, reject) => {
    const request = db.transaction(INTERVIEW_AUDIO_STORE, "readonly").objectStore(INTERVIEW_AUDIO_STORE).get(recordId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  assertSession(epoch);
  return blob;
}

async function removeInterviewRecording(recordId) {
  const db = await openInterviewAudioDb();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(INTERVIEW_AUDIO_STORE, "readwrite");
    transaction.objectStore(INTERVIEW_AUDIO_STORE).delete(recordId);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

async function hydrateInterviewRecordings() {
  interviewAudioUrls.forEach(url => URL.revokeObjectURL(url));
  interviewAudioUrls = [];
  const players = [...document.querySelectorAll("[data-recording-audio]")];
  await Promise.all(players.map(async player => {
    try {
      const blob = await getInterviewRecording(player.dataset.recordingAudio);
      if (!blob || !player.isConnected) return;
      const url = URL.createObjectURL(blob);
      interviewAudioUrls.push(url);
      player.src = url;
    } catch {
      player.replaceWith(Object.assign(document.createElement("span"), { className: "recording-unavailable", textContent: "录音暂时无法读取" }));
    }
  }));
}

function openResumeFileDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(accountDatabaseName(RESUME_FILE_DB), 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(RESUME_FILE_STORE)) request.result.createObjectStore(RESUME_FILE_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putResumeFile(id, file, onlyIfMissing = false) {
  const db = await openResumeFileDb();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(RESUME_FILE_STORE, "readwrite");
    const store = transaction.objectStore(RESUME_FILE_STORE);
    if (onlyIfMissing) store.add(file, id);
    else store.put(file, id);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

async function getResumeFile(id) {
  const epoch = authEpoch;
  const db = await openResumeFileDb();
  const blob = await new Promise((resolve, reject) => {
    const request = db.transaction(RESUME_FILE_STORE, "readonly").objectStore(RESUME_FILE_STORE).get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  assertSession(epoch);
  return blob;
}

async function restoreResumeDocument(id, file) {
  const epoch = authEpoch;
  assertSession(epoch);
  const meta = state.resumeDocuments.find(item => item.id === id);
  if (!meta) throw new Error("这条简历记录已不存在");
  if (!file?.size || file.name !== meta.name) throw new Error("请选择与这条记录同名的原始文件");
  const sizeLabel = file.size >= 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`;
  if (sizeLabel !== meta.sizeLabel || (meta.type && file.type !== meta.type)) throw new Error("文件大小或类型与原记录不符，请核对原件");
  const existing = await getResumeFile(id);
  assertSession(epoch);
  if (existing) throw new Error("当前浏览器已有这份文件，未覆盖");
  // add() also prevents a simultaneous tab from being overwritten.
  await putResumeFile(id, file, true);
  assertSession(epoch);
  const restored = await getResumeFile(id);
  const digest = async blob => new Uint8Array(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()));
  const [before, after] = await Promise.all([digest(file), digest(restored)]);
  assertSession(epoch);
  if (!before.every((value, index) => value === after[index])) throw new Error("文件校验未通过，请保留备份并联系维护者");
}

async function removeResumeFile(id) {
  const db = await openResumeFileDb();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(RESUME_FILE_STORE, "readwrite");
    transaction.objectStore(RESUME_FILE_STORE).delete(id);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}

function isProtectedView(view) {
  return PROTECTED_VIEWS.has(view);
}

function hasPrivateAccess() {
  return Boolean(cloudUser && workspaceSync.ready && workspaceSync.userId === cloudUser.id);
}

function availablePracticePapers() {
  return [...communityPapers, ...PRACTICE_PAPERS];
}

function cloudStatusLabel() {
  if (!cloudConfigured) return "云同步未配置";
  if (cloudSyncStatus === "checking") return "正在检查账号";
  if (cloudSyncStatus === "syncing") return "正在同步";
  if (cloudSyncStatus === "saving") return "正在保存";
  if (cloudSyncStatus === "conflict") return "云端有更新 · 已阻止覆盖";
  if (cloudSyncStatus === "cache-full") return "本机缓存不足";
  if (cloudSyncStatus === "error") return "同步失败";
  return cloudUser ? "已同步" : "访客模式";
}

function updateSyncStatus() {
  const label = document.querySelector(".cloud-status");
  if (label) {
    label.textContent = cloudStatusLabel();
    label.classList.toggle("error", ["error", "conflict", "cache-full"].includes(cloudSyncStatus));
  }
}

function requirePrivateAccess() {
  if (hasPrivateAccess()) return true;
  state.modal = "account";
  render();
  return false;
}

function appCount(status) {
  const groups = {
    applied: ["applied"],
    assessment: ["assessment", "written"],
    interview: INTERVIEW_STAGES,
    offer: ["offer"]
  };
  const accepted = groups[status] || [status];
  return state.applications.filter((item) => !item.archivedAt && accepted.includes(normalizeApplicationStatus(item.status))).length;
}

function applicationStageLabel(status) {
  return APPLICATION_STAGES.find(([value]) => value === normalizeApplicationStatus(status))?.[1] || "已投递";
}

function applicationMatchesPipelineStatus(status, filterStatus) {
  if (filterStatus === "全部进度") return true;
  if (filterStatus === "assessment_group") return ["assessment", "written"].includes(status);
  if (filterStatus === "interview_group") return INTERVIEW_STAGES.includes(status);
  return status === filterStatus;
}

function parseCalendarDate(value) {
  if (!value) return null;
  const date = new Date(String(value).length <= 10 ? `${value}T12:00:00` : value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function startOfLocalDay(value = new Date()) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function daysFromToday(date) {
  return Math.round((startOfLocalDay(date) - startOfLocalDay()) / 86400000);
}

function formatReminderTiming(date) {
  if (!date) return "日期待补充";
  const days = daysFromToday(date);
  if (days < 0) return `已逾期 ${Math.abs(days)} 天`;
  if (days === 0) return "今天";
  if (days === 1) return "明天";
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日`;
}

function workspaceReminders() {
  const reminders = [];
  const activeApplications = state.applications.filter(app => !app.archivedAt && !isClosedApplicationStatus(app.status));
  activeApplications.forEach(app => {
    const job = state.jobs.find(item => item.id === app.jobId);
    if (!job) return;
    const date = parseCalendarDate(app.followUpAt);
    if (date && daysFromToday(date) <= 14) {
      reminders.push({
        id: `follow-${app.id}`,
        applicationId: app.id,
        stage: app.status,
        date,
        title: `${job.company}：${app.next || applicationNextAction(app.status)}`,
        meta: `${applicationStageLabel(app.status)} / ${formatReminderTiming(date)}`,
        view: "pipeline",
        priority: daysFromToday(date) <= 0 ? 0 : 2
      });
    } else if (!date && ["assessment", "written"].includes(app.status) && currentProcessRecord(app)?.status !== "completed") {
      reminders.push({
        id: `missing-${app.id}`,
        applicationId: app.id,
        stage: app.status,
        date: null,
        title: `${job.company}：补充${applicationStageLabel(app.status)}时间`,
        meta: "未设置提醒日期",
        view: "pipeline",
        priority: 1
      });
    }
  });
  state.interviewRecords
    .filter(record => !record.superseded && record.status === "scheduled")
    .forEach(record => {
      const date = parseCalendarDate(record.date);
      if (!date || daysFromToday(date) > 14) return;
      reminders.push({
        id: `interview-${record.id}`,
        interviewRecordId: record.id,
        date,
        title: `${record.company}：准备${record.round || "面试"}`,
        meta: `${record.role} / ${formatReminderTiming(date)}`,
        view: "interview",
        priority: daysFromToday(date) <= 1 ? 0 : 2
      });
    });
  state.jobs
    .filter(job => !state.applications.some(app => app.jobId === job.id))
    .forEach(job => {
      const date = parseCalendarDate(job.deadline);
      if (!date || daysFromToday(date) < 0 || daysFromToday(date) > 14) return;
      reminders.push({
        id: `deadline-${job.id}`,
        radarJobId: job.radarJobId || job.id,
        date,
        title: `${job.company}：${job.role}即将截止`,
        meta: `投递截止 / ${formatReminderTiming(date)}`,
        view: "jobs",
        priority: daysFromToday(date) <= 2 ? 0 : 3
      });
    });
  return reminders
    .map(reminder => ({ ...reminder, key: JSON.stringify([reminder.id, reminder.date?.toISOString() || "", reminder.stage || "", reminder.title]) }))
    .filter(reminder => !state.reminderCompletions[reminder.key])
    .sort((a, b) => a.priority - b.priority || (a.date?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.date?.getTime() ?? Number.MAX_SAFE_INTEGER));
}

function setReminderCompleted(key, completed) {
  if (!hasPrivateAccess()) return;
  if (completed) {
    const reminder = workspaceReminders().find(item => item.key === key);
    if (!reminder) return;
    state.reminderCompletions[key] = { ...reminder, date: reminder.date?.toISOString() || "", completedAt: new Date().toISOString() };
  } else {
    delete state.reminderCompletions[key];
  }
  saveState(completed ? "待办已完成，可在“已完成”中撤销" : "已撤销完成；仍有效的待办会重新显示");
}

function renderHomeAgenda(reminders) {
  const completed = Object.values(state.reminderCompletions).sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  const showingCompleted = homeAgendaView === "completed";
  const visible = showingCompleted ? completed : reminders;
  const overdue = reminders.filter(item => item.date && daysFromToday(item.date) < 0).length;
  return `
    <div class="home-section-head"><div><h2>接下来 14 天</h2><p>${reminders.length} 件待办${overdue ? ` · ${overdue} 件逾期` : ""}</p></div><button class="text-action" data-view="pipeline">管理日期</button></div>
    <div class="home-agenda-tabs" aria-label="待办筛选">
      <button data-agenda-view="pending" aria-pressed="${!showingCompleted}">待办 ${reminders.length}</button>
      <button data-agenda-view="completed" aria-pressed="${showingCompleted}">已完成 ${completed.length}</button>
    </div>
    <p class="home-agenda-help">完成待办不改变笔面结果。</p>
    <div class="home-agenda-list">
      ${visible.map(reminder => `<div class="home-agenda-row ${showingCompleted ? "is-completed" : ""}">
        <label class="agenda-check"><input type="checkbox" data-reminder-key="${escapeHtml(reminder.key)}" ${showingCompleted ? "checked" : ""} aria-label="${showingCompleted ? "撤销完成" : "完成待办"}：${escapeHtml(reminder.title)}"></label>
        <span class="agenda-time ${!showingCompleted && reminder.priority <= 1 ? "urgent" : ""}">${showingCompleted ? "已完成" : formatReminderTiming(reminder.date)}</span>
        <button class="agenda-detail" ${workspaceActionAttribute(reminder)}><span><strong>${escapeHtml(reminder.title)}</strong><small>${showingCompleted ? `${escapeHtml(new Date(reminder.completedAt).toLocaleDateString("zh-CN"))} 完成 · ` : ""}${escapeHtml(reminder.meta.split(" / ")[0])}</small></span><span class="agenda-arrow">查看</span></button>
      </div>`).join("") || `<div class="home-inline-empty"><strong>${showingCompleted ? "还没有已完成的待办" : "当前待办已清空"}</strong><span>${showingCompleted ? "勾选后的事项会保留在这里，也可以取消勾选撤销完成。" : "新的提醒会根据投递和笔面安排自动出现。"}</span></div>`}
    </div>`;
}

function primaryWorkspaceAction(reminders) {
  if (reminders.length) return { ...reminders[0], cta: reminders[0].view === "pipeline" ? "查看进度" : reminders[0].view === "interview" ? "准备面试" : "查看岗位" };
  const activeApplications = state.applications.filter(app => !app.archivedAt && !isClosedApplicationStatus(app.status));
  if (!activeApplications.length) return { title: "记录第一条真实投递", meta: "从岗位库选择，或手动登记已经投递的岗位。", modal: "quick-add", cta: "记录投递" };
  if (state.jdContext.keywords.length) return { title: "把目标岗位关键词写进简历证据", meta: `当前已提取 ${state.jdContext.keywords.length} 个关键词。`, view: "resume", cta: "优化简历" };
  return { title: "检查正在推进的岗位", meta: `目前有 ${activeApplications.length} 条进行中的投递。`, view: "pipeline", cta: "查看进度" };
}

function workspaceActionAttribute(action) {
  if (action.applicationId) return `data-open-application="${action.applicationId}"`;
  if (action.interviewRecordId) return `data-open-interview="${action.interviewRecordId}"`;
  if (action.radarJobId && radarJobs.some(job => job.id === action.radarJobId)) return `data-open-radar-job="${action.radarJobId}"`;
  return action.modal ? `data-modal="${action.modal}"` : `data-view="${action.view}"`;
}

function isUsablePracticeQuestion(question) {
  const prompt = String(question?.prompt || "").trim();
  const options = Array.isArray(question?.options) ? question.options.map((option) => String(option).trim()) : [];
  if (!prompt || /<|>|data-v=/i.test(prompt) || options.length < 2 || options.some((option) => !option)) return false;
  if (!Number.isInteger(question.answer) || question.answer < 0 || question.answer >= options.length) return false;
  if (new Set(options.map((option) => option.replace(/\s+/g, ""))).size !== options.length) return false;
  const hasVisual = Boolean(question.image) || question.images?.some(Boolean) || question.optionImages?.some(Boolean);
  const compactPrompt = prompt.replace(/\s+/g, "");
  const needsVisual = /(?:\u8bf7)?\u6839\u636e(?:\u4e0b\u5217)?(?:\u56fe\u7247|\u56fe\u8868|\u4e0b\u56fe|\u4e0b\u8868)|\u4e0b\u56fe[\uff0c\u3002:：\u662f\u4e3a\u5c55\u53cd\u6240]|\u4e0b\u8868[\uff0c\u3002:：\u662f\u4e3a\u5c55\u53cd\u6240]|\u56fe\u8868[\uff0c\u3002:：\u6240\u663e]/.test(compactPrompt);
  if (needsVisual && !hasVisual) return false;
  return true;
}

function questionBank() {
  const questions = hasPrivateAccess()
    ? [...communityQuestions, ...SEED_QUESTIONS, ...(state.importedQuestions || [])]
    : [...communityQuestions, ...SEED_QUESTIONS];
  return questions.filter(isUsablePracticeQuestion);
}

function questionById(id) {
  return questionBank().find((question) => question.id === id);
}

function hasWrittenExplanation(question) {
  const explanation = String(question?.explanation || "").trim();
  return Boolean(explanation) && ![
    "暂无解析",
    "原社区题库未提供文字解析，请结合正确答案复盘。"
  ].includes(explanation);
}

function explanationText(question) {
  return hasWrittenExplanation(question)
    ? question.explanation.trim()
    : "这道题的原题源只提供了正确答案，暂时没有文字解析。";
}

function renderReviewedChoice(label, question, optionIndex, tone = "") {
  if (!Number.isInteger(Number(optionIndex))) {
    return `<div class="review-choice unanswered"><span class="review-choice-label">${label}</span><strong>未作答</strong></div>`;
  }
  const index = Number(optionIndex);
  const image = question.optionImages?.[index];
  return `<div class="review-choice ${tone}">
    <span class="review-choice-label">${label}</span>
    <div class="review-choice-value"><span class="option-letter">${String.fromCharCode(65 + index)}</span><strong>${escapeHtml(question.options[index] || `选项 ${String.fromCharCode(65 + index)}`)}</strong></div>
    ${image ? `<img class="review-choice-image" src="${escapeHtml(image)}" alt="${escapeHtml(label)} ${String.fromCharCode(65 + index)}">` : ""}
  </div>`;
}

function sampleQuestionIds(questions, count) {
  const shuffled = [...questions];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled.slice(0, count).map((question) => question.id);
}

function formatDuration(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safe / 60).toString().padStart(2, "0");
  const rest = Math.floor(safe % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}

function practiceStats() {
  if (!hasPrivateAccess()) return { sessions: 0, answered: 0, correct: 0, accuracy: 0, averageSeconds: 0 };
  const history = state.practiceHistory || [];
  const attempts = history.flatMap((item) => item.results || []);
  const correct = attempts.filter((item) => item.correct).length;
  const totalSeconds = history.reduce((sum, item) => sum + (item.elapsedSeconds || 0), 0);
  return {
    sessions: history.length,
    answered: attempts.length,
    correct,
    accuracy: attempts.length ? Math.round((correct / attempts.length) * 100) : 0,
    averageSeconds: attempts.length ? Math.round(totalSeconds / attempts.length) : 0
  };
}

async function refreshRadarJobs(notify = false) {
  radarLoading = true;
  if (state.activeView === "jobs") render();
  const result = await loadRadarJobs();
  radarJobs = result.jobs;
  radarSourceStatus = result.status;
  radarOffline = result.offline;
  const activityResult = radarOffline ? { added: 0, initialized: false } : reconcileRadarActivity(radarJobs);
  radarLoading = false;
  if (!radarJobs.some(job => job.id === state.selectedRadarJob)) state.selectedRadarJob = radarJobs[0]?.id || "";
  saveState();
  render();
  if (notify) {
    if (radarOffline) showToast("数据源暂不可用，已显示离线示例");
    else if (activityResult.initialized) showToast("已建立岗位基线，以后只提示真正新增的记录");
    else if (activityResult.added) showToast(`发现 ${activityResult.added} 条新增岗位记录`);
    else showToast("已检查，没有发现新增岗位");
  }
}

function reconcileRadarActivity(jobs) {
  const activity = state.radarActivity;
  const currentIds = jobs.map(job => job.id);
  if (!activity.baselineInitialized) {
    activity.baselineInitialized = true;
    activity.knownJobIds = currentIds;
    activity.newJobIds = [];
    activity.lastSyncAt = new Date().toISOString();
    return { added: 0, initialized: true };
  }
  const known = new Set(activity.knownJobIds);
  const discovered = currentIds.filter(id => !known.has(id));
  activity.knownJobIds = [...new Set([...activity.knownJobIds, ...currentIds])];
  activity.newJobIds = [...new Set([...activity.newJobIds, ...discovered])];
  activity.lastSyncAt = new Date().toISOString();
  return { added: discovered.length, initialized: false };
}

function localDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function loadCachedEncouragement() {
  try {
    const cached = JSON.parse(localStorage.getItem(DAILY_ENCOURAGEMENT_STORAGE_KEY));
    return cached?.text && isSuitableEncouragement(cached.text, cached.author) ? cached : { date: "", text: "", source: "", author: "", url: "" };
  } catch {
    return { date: "", text: "", source: "", author: "", url: "" };
  }
}

function isSuitableEncouragement(text, author) {
  const sentence = text?.trim() || "";
  return sentence.length >= 8 && sentence.length <= 42 && Boolean(author?.trim()) && !ENCOURAGEMENT_EXCLUDE.test(sentence);
}

function waitForEncouragementRetry() {
  return new Promise(resolve => setTimeout(resolve, 600));
}

function fallbackEncouragement() {
  const dayNumber = Number(localDateKey().replaceAll("-", "")) || 0;
  return DAILY_ENCOURAGEMENT_FALLBACKS[dayNumber % DAILY_ENCOURAGEMENT_FALLBACKS.length];
}

async function fetchSuitableEncouragement() {
  const maxAttempts = 3;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 2000);
    let response;
    try {
      response = await fetch(DAILY_ENCOURAGEMENT_ENDPOINT, { headers: { Accept: "application/json" }, cache: "no-store", signal: controller.signal });
    } finally {
      window.clearTimeout(timeoutId);
    }
    if (!response.ok) throw new Error("encouragement unavailable");
    const result = await response.json();
    const quote = result?.data;
    if (result?.success && isSuitableEncouragement(quote?.sentence, quote?.author)) {
      return {
        text: quote.sentence.trim(),
        author: quote.author.trim(),
        source: quote.name?.trim() || "古诗文名句",
        url: String(quote.src_url || "").startsWith("https://") ? quote.src_url : ""
      };
    }
    if (attempt < maxAttempts - 1) await waitForEncouragementRetry();
  }
  throw new Error("no suitable encouragement");
}

async function refreshDailyEncouragement({ force = false } = {}) {
  const today = localDateKey();
  if (dailyEncouragementLoading || (!force && dailyEncouragementState.date === today && dailyEncouragementState.text)) return;
  dailyEncouragementLoading = true;
  if (state.activeView === "home") render();
  try {
    const result = await fetchSuitableEncouragement();
    dailyEncouragementState = {
      date: today,
      ...result
    };
    localStorage.setItem(DAILY_ENCOURAGEMENT_STORAGE_KEY, JSON.stringify(dailyEncouragementState));
  } catch {
    if (!dailyEncouragementState.text) dailyEncouragementState = { date: today, ...fallbackEncouragement(), url: "" };
  } finally {
    dailyEncouragementLoading = false;
    if (state.activeView === "home") render();
  }
}

function markRadarViewed(jobId) {
  if (!jobId) return;
  const now = new Date();
  const timestamp = now.toISOString();
  const today = localDateKey(now);
  state.radarActivity.viewedAt[jobId] = timestamp;
  state.radarActivity.dailyViewed[today] ||= {};
  state.radarActivity.dailyViewed[today][jobId] ||= timestamp;
  state.radarActivity.lastViewedJobId = jobId;
  state.radarActivity.lastViewedAt = timestamp;
  const retainedDays = Object.keys(state.radarActivity.dailyViewed).sort().slice(-14);
  state.radarActivity.dailyViewed = Object.fromEntries(retainedDays.map(key => [key, state.radarActivity.dailyViewed[key]]));
}

function saveRadarJob(job) {
  const listScrollTop = document.querySelector(".radar-list-panel .job-list")?.scrollTop || 0;
  markRadarViewed(job.id);
  if (!state.jobs.some(item => item.id === job.id)) {
    state.jobs.unshift({
      id: job.id,
      company: job.company,
      role: job.positions.length === 1 ? job.positions[0] : `${job.program || job.cohort + job.batch}（待选具体岗位）`,
      location: job.location,
      mode: job.batch,
      salary: "校招岗位",
      tags: [job.industry, job.cohort, job.batch],
      jd: `${job.program}。开放方向：${job.role}。投递前请以企业官网为准。`,
      match: null,
      sourceName: job.sourceNames.join(" + "),
      applyUrl: job.applyUrl,
      deadline: job.deadline
    });
  }
  if (!state.applications.some(item => item.jobId === job.id)) {
    state.applications.push({
      id: crypto.randomUUID(),
      jobId: job.id,
      status: "applied",
      next: "查看招聘系统进展或等待筛选结果",
      date: new Date().toLocaleDateString("zh-CN"),
      appliedAt: new Date().toISOString().slice(0, 10),
      progressUrl: job.applyUrl || "",
      notes: "",
      interviewRecordId: "",
      followUpAt: "",
      archivedAt: "",
      feishuRecordId: "",
      syncStatus: "local_only",
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });
  }
  state.selectedJob = job.id;
  saveState("已添加投递记录");
  render();
  requestAnimationFrame(() => {
    const panel = document.querySelector(".radar-list-panel .job-list");
    if (panel) panel.scrollTop = listScrollTop;
  });
}

function render() {
  loginCaptcha.clear();
  const [title, subtitle] = viewMeta[state.activeView];
  const activeViewLocked = isProtectedView(state.activeView) && !hasPrivateAccess();
  document.querySelector("#app").innerHTML = `
    <div class="app-shell">
      <aside class="sidebar ${state.mobileOpen ? "open" : ""}" aria-label="主导航">
        <div class="brand">
          <div class="brand-mark">OF</div>
          <div><div class="brand-name">OfferFlow</div><div class="brand-sub">你的求职助手</div></div>
        </div>
        <nav class="nav-group">
          <div class="nav-label">工作区</div>
          ${navItems.map(([id, glyph, label]) => `
            <button class="nav-item ${state.activeView === id ? "active" : ""}" data-view="${id}">
              <span class="nav-glyph">${glyph}</span>
              <span class="nav-text">${label}</span>
              ${isProtectedView(id) && !hasPrivateAccess() ? `<span class="nav-count">锁</span>` : id === "pipeline" ? `<span class="nav-count">${state.applications.filter(app => !app.archivedAt).length}</span>` : ""}
            </button>
          `).join("")}
        </nav>
      </aside>
      <main class="main">
        <header class="topbar">
          <div class="crumb">
            <button class="btn ghost mobile-menu" data-action="toggle-menu" aria-label="打开菜单">菜单</button>
            <strong>${title}</strong><span>${subtitle}</span>
          </div>
          <div class="top-actions">
            <button class="btn ghost mailbox-button" data-modal="mailbox">邮箱</button>
            <span class="cloud-status ${cloudSyncStatus === "error" ? "error" : ""}">${cloudStatusLabel()}</span>
            ${cloudUser ? `<button class="btn account-button" data-modal="account">${escapeHtml(state.profile.name || cloudUser.email || "账号与数据")}</button>` : `<button class="btn" data-modal="account">登录同步</button>`}
            ${activeViewLocked ? `<span class="privacy-status">登录后可用</span>` : ""}
          </div>
        </header>
        <div class="content">
          ${renderHome()}
          ${renderPractice()}
          ${renderJobs()}
          ${renderResume()}
          ${renderInterview()}
          ${renderPipeline()}
        </div>
      </main>
    </div>
    ${renderModal()}
  `;
  hydrateInterviewRecordings();
  updateLoginRequest();
  if (state.activeView === "jobs" && state.jobView === "radar" && state.selectedRadarJob) {
    requestAnimationFrame(() => scrollSelectedRadarIntoView());
  }
}

function updateLoginRequest() {
  clearTimeout(loginRequestTimer);
  const form = document.querySelector("#cloud-login-form");
  if (!form) return;
  const button = form.querySelector("button[type='submit']");
  const feedback = form.querySelector(".privacy-error");
  const seconds = loginRequest.remaining();
  button.disabled = loginRequest.state.busy || seconds > 0 || !loginCaptcha.ready();
  button.textContent = loginRequest.state.busy ? "正在发送" : seconds ? `${seconds} 秒后可重发` : "发送登录邮件";
  feedback.textContent = loginRequest.state.message;
  feedback.classList.toggle("success", loginRequest.state.success);
  const captchaStatus = form.querySelector(".captcha-status");
  if (captchaStatus) captchaStatus.textContent = loginCaptcha.state.message || "同意《数据与隐私说明》后加载安全验证。";
  if (seconds) loginRequestTimer = setTimeout(updateLoginRequest, 1000);
}

function viewWrap(id, content) {
  return `<section class="view ${state.activeView === id ? "active" : ""}" data-view-panel="${id}">${content}</section>`;
}

function renderPrivatePreview(view) {
  const metricCount = { home: 5, resume: 3, interview: 4, pipeline: 5 }[view] || 4;
  const metrics = Array.from({ length: metricCount }, () => `<div><span></span><strong></strong></div>`).join("");
  const previewRows = count => Array.from({ length: count }, () => `<div class="privacy-preview-row"><i></i><span></span><em></em></div>`).join("");
  const listRows = previewRows(5);
  const tableRows = Array.from({ length: 6 }, () => `<div class="privacy-preview-table-row"><i></i><span></span><span></span><span></span><em></em></div>`).join("");
  const body = view === "pipeline"
    ? `<div class="privacy-preview-toolbar"><span></span><i></i></div><div class="privacy-preview-table"><div class="privacy-preview-table-head"></div>${tableRows}</div>`
    : view === "home"
      ? `<div class="privacy-preview-home"><div class="privacy-preview-panel privacy-preview-focus"><span></span><strong></strong><p></p><i></i></div><div class="privacy-preview-panel privacy-preview-list">${listRows}</div></div><div class="privacy-preview-panel privacy-preview-wide">${previewRows(3)}</div>`
      : `<div class="privacy-preview-tabs"><i></i><i></i><i></i></div><div class="privacy-preview-split"><div class="privacy-preview-panel privacy-preview-list">${listRows}</div><div class="privacy-preview-panel privacy-preview-detail"><span></span><strong></strong><p></p><p></p><div></div></div></div>`;
  return `
    <div class="privacy-preview privacy-preview-${view}" aria-hidden="true">
      <div class="privacy-preview-heading"><div><strong></strong><span></span></div><i></i></div>
      <div class="privacy-preview-metrics">${metrics}</div>
      ${body}
    </div>
  `;
}

function renderPrivacyGate(view, label) {
  return viewWrap(view, `
    ${view === "home" ? renderDailyEncouragement() : ""}
    <div class="privacy-gate">
      ${renderPrivatePreview(view)}
      <div class="privacy-gate-overlay">
        <div class="privacy-access-card">
          <div class="privacy-mark" aria-hidden="true">锁</div>
          <div class="privacy-copy">
            <span>个人空间</span>
            <h1>登录后查看${label.replace("OfferFlow ", "")}</h1>
            <p>使用邮箱登录后，可查看并同步个人求职记录。</p>
          </div>
          <button class="btn primary privacy-login" data-modal="account">${cloudConfigured ? "使用邮箱登录" : "查看服务状态"}</button>
          <button class="text-action privacy-policy-link" data-modal="privacy">数据与隐私说明</button>
        </div>
      </div>
    </div>
  `);
}

function renderDailyEncouragement() {
  const quote = dailyEncouragementState.text
    ? dailyEncouragementState
    : { date: localDateKey(), ...fallbackEncouragement(), url: "" };
  const attribution = [quote.author, quote.source].filter(Boolean).join(" · ");
  const meta = quote.url
    ? `<a href="${escapeHtml(quote.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(attribution)}</a>`
    : `<span>${escapeHtml(attribution)}</span>`;
  return `
    <section class="daily-encouragement" aria-label="今日摘句">
      <span class="daily-encouragement-label">今日摘句</span>
      <div class="daily-encouragement-copy"><p>${escapeHtml(quote.text)}</p><div class="daily-encouragement-meta">${meta}</div></div>
      <button class="text-action" data-action="refresh-encouragement" ${dailyEncouragementLoading ? "disabled" : ""}>${dailyEncouragementLoading ? "正在换…" : "换一句"}</button>
    </section>
  `;
}

function renderWoodenFish() {
  const count = Math.max(0, Number(state.woodenFishCount) || 0);
  return `
    <button class="home-wooden-fish" data-action="strike-wooden-fish" aria-label="敲一下电子木鱼，已敲 ${count} 次">
      <span class="wooden-fish-instrument" aria-hidden="true"><img src="${assetUrl("assets/wooden-fish-v3.png")}" alt=""><i></i></span>
      <span><strong>电子木鱼</strong><small aria-live="polite">累计 ${count} 次</small></span>
      <b class="wooden-fish-plus" aria-hidden="true">功德 +1</b>
    </button>
  `;
}

function playWoodenFishSound() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const now = context.currentTime;
  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(720, now);
  oscillator.frequency.exponentialRampToValueAtTime(260, now + .08);
  gain.gain.setValueAtTime(.18, now);
  gain.gain.exponentialRampToValueAtTime(.0001, now + .1);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + .1);
  oscillator.addEventListener("ended", () => context.close());
}

function renderHome() {
  if (!hasPrivateAccess()) return renderPrivacyGate("home", "求职概览");
  if (!state.profile.name && !state.applications.length && !state.projects.length) {
    return viewWrap("home", `
      <div class="home-morale-row">${renderDailyEncouragement()}${renderWoodenFish()}</div>
      <div class="workspace-empty">
        <span class="workspace-empty-mark" aria-hidden="true">OF</span>
        <div><h1>先完善你的基础资料</h1></div>
        <div class="workspace-empty-actions"><button class="btn primary" data-modal="profile">填写基础资料</button><button class="btn" data-view="jobs">浏览岗位</button></div>
      </div>
    `);
  }
  const reminders = workspaceReminders();
  const focus = primaryWorkspaceAction(reminders);
  const unarchivedApplications = state.applications.filter(app => !app.archivedAt);
  const practice = practiceStats();
  const radarJobIds = new Set(radarJobs.map(job => job.id));
  const savedJobs = (state.radarActivity?.savedJobIds || []).filter(id => radarJobIds.has(id)).length;
  const newJobs = (state.radarActivity?.newJobIds || []).filter(id => radarJobIds.has(id)).length;
  const resume = resumeCompleteness();
  const pendingDrafts = (state.applicationDrafts || []).filter(draft => !draft.reviewed).length;
  const currentProcessRecords = (state.interviewRecords || []).filter(record => !record.superseded);
  const scheduledProcesses = currentProcessRecords.filter(record => record.status === "scheduled").length;
  const reviewNeeded = currentProcessRecords.filter(record => record.status === "completed" && !record.improvements && !record.assistantReview).length;
  const todayLabel = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(new Date());
  return viewWrap("home", `
    <header class="home-intro">
      <div><span>${todayLabel}</span><h1>求职概览</h1></div>
      <div class="home-intro-actions">
        <button class="btn" data-modal="quick-add">记录投递</button>
      </div>
    </header>
    <div class="home-morale-row">${renderDailyEncouragement()}${renderWoodenFish()}</div>
    <section class="home-next-action" aria-labelledby="home-next-action-title">
      <span class="home-next-action-label">下一步</span>
      <div><strong id="home-next-action-title">${escapeHtml(focus.title)}</strong><small>${escapeHtml(focus.meta)}</small></div>
      <button class="btn primary" ${workspaceActionAttribute(focus)}>${focus.cta}</button>
    </section>
    <section class="home-progress-overview panel" aria-labelledby="home-progress-title">
      <div class="home-section-head"><div><h2 id="home-progress-title">阶段分布</h2></div><button class="text-action" data-view="pipeline">查看全部</button></div>
      <div class="home-metrics">
        <button data-home-stage="all"><strong>${unarchivedApplications.length}</strong><span>全部</span></button>
        <button data-home-stage="applied"><strong>${appCount("applied")}</strong><span>简历筛选</span></button>
        <button data-home-stage="assessment"><strong>${appCount("assessment")}</strong><span>测评笔试</span></button>
        <button data-home-stage="interview"><strong>${appCount("interview")}</strong><span>面试阶段</span></button>
        <button data-home-stage="salary"><strong>${appCount("salary")}</strong><span>谈薪</span></button>
        <button data-home-stage="offer"><strong>${appCount("offer")}</strong><span>Offer</span></button>
      </div>
    </section>
    <div class="home-main-grid">
      <section class="home-agenda panel">
        ${renderHomeAgenda(reminders)}
      </section>
      <section class="home-module-overview panel" aria-labelledby="home-module-title">
        <div class="home-section-head"><div><h2 id="home-module-title">模块进展</h2></div></div>
        <div class="home-module-list">
          <button data-home-route="jobs"><span><strong>岗位雷达</strong><small>${newJobs ? `${newJobs} 个新增待查看` : "暂无新增岗位"}</small></span><em>${savedJobs} 个收藏</em></button>
          <button data-home-route="practice"><span><strong>北森职测</strong><small>${state.wrongQuestionIds.length ? `${state.wrongQuestionIds.length} 道错题待复习` : `${practice.sessions} 次训练已完成`}</small></span><em>${practice.accuracy}% 正确率</em></button>
          <button data-home-route="resume"><span><strong>简历智填</strong><small>${pendingDrafts ? `${pendingDrafts} 份草稿待核对` : `${state.resumeDocuments.length} 份简历文件`}</small></span><em>${resume.complete}/${resume.total} 项资料</em></button>
          <button data-home-route="interview"><span><strong>笔面手记</strong><small>${reviewNeeded ? `${reviewNeeded} 场待复盘` : "复盘记录已整理"}</small></span><em>${scheduledProcesses} 场待进行</em></button>
        </div>
      </section>
    </div>
  `);
}

function renderPractice() {
  const sessionAvailable = state.practiceSession?.questionIds?.some((id) => questionById(id));
  if (state.practiceSession && sessionAvailable) return viewWrap("practice", renderPracticeSession());

  const stats = practiceStats();
  const requestedTab = state.practiceView || "overview";
  const activeTab = !hasPrivateAccess() && ["wrongbook", "stats"].includes(requestedTab) ? "overview" : requestedTab;
  return viewWrap("practice", `
    <div class="page-heading practice-heading">
      <div><h1>北森职测训练</h1><p>共 ${questionBank().length} 道可练题${communityBankStatus === "loading" ? "，社区题库正在载入" : ""}${hasPrivateAccess() ? "" : "；登录可保存错题与成绩"}。</p></div>
      <div class="practice-import-actions">
        <label class="btn" for="question-import">添加我的题库</label>
        <small>支持 JSON · <a href="${assetUrl("example-question-bank.json")}" download>下载模板</a> · 仅自己可见</small>
      </div>
      <input id="question-import" type="file" accept="application/json,.json" hidden>
    </div>
    <div class="practice-tabs" role="tablist" aria-label="刷题模块">
      ${[["overview", "训练首页"], ["papers", "模拟套卷"], ...(hasPrivateAccess() ? [["wrongbook", `错题本 ${state.wrongQuestionIds.length}`], ["stats", "训练统计"]] : [])].map(([id, label]) => `<button class="practice-tab ${activeTab === id ? "active" : ""}" data-practice-tab="${id}" role="tab">${label}</button>`).join("")}
    </div>
    ${activeTab === "wrongbook" ? renderWrongBook() : activeTab === "stats" ? renderPracticeStats() : activeTab === "papers" ? renderPaperLibrary() : renderPracticeOverview(stats)}
  `);
}

function renderPracticeOverview(stats) {
  const weakest = getWeakestCategory();
  return `
    <div class="practice-summary">
      <div class="practice-summary-main">
        <span class="practice-kicker">今日建议</span>
        <h2>${weakest ? `优先练习${weakest.name}` : "先测一测当前水平"}</h2>
        
        <button class="btn primary" data-start-category="${weakest?.id || "mixed"}">${weakest ? "开始专项" : "开始测试"}</button>
      </div>
      <div class="practice-summary-stats">
        <div><strong>${stats.accuracy}%</strong><span>历史正确率</span></div>
        <div><strong>${stats.averageSeconds || 0}s</strong><span>平均每题</span></div>
        <div><strong>${state.wrongQuestionIds.length}</strong><span>待复习错题</span></div>
      </div>
    </div>
    <section class="practice-section">
      <div class="practice-section-head"><div><h2>专项训练</h2></div></div>
      <div class="category-grid">
        ${PRACTICE_CATEGORIES.map(category => {
          const categoryStats = statsForCategory(category.id);
          const categoryCount = questionBank().filter(question => question.category === category.id).length;
          return `<article class="category-card">
            <div class="category-top"><span class="category-glyph">${category.short}</span><span class="difficulty-dots">${categoryStats.answered ? `${categoryStats.accuracy}%` : "未测"}</span></div>
            <h3>${category.name}</h3><p>${category.description}</p>
            <div class="category-meta"><span>${categoryCount} 道可练</span><span>建议 ${category.targetSeconds}s/题</span></div>
            <button class="btn small" data-start-category="${category.id}" ${categoryCount ? "" : "disabled"}>${categoryCount ? "开始专项" : communityBankStatus === "loading" ? "题库载入中" : "暂无可练题"}</button>
          </article>`;
        }).join("")}
      </div>
    </section>
    <section class="practice-section">
      <div class="practice-section-head"><div><h2>最近套卷</h2></div><button class="btn small ghost" data-practice-tab="papers">查看全部</button></div>
      <div class="paper-list">${availablePracticePapers().slice(0, 1).map(renderPaperCard).join("")}</div>
    </section>
  `;
}

function renderPaperLibrary() {
  return `
    <section class="practice-section no-top-gap">
      <div class="practice-section-head"><div><h2>北森题库与我的资料</h2></div></div>
      ${communityBankStatus === "loading" ? `<div class="bank-loading"><span></span><div><strong>正在载入并检查社区北森题库</strong></div></div>` : ""}
      ${communityBankStatus === "error" ? `<div class="bank-loading error"><div><strong>社区题库暂时载入失败</strong><p>你的本地题库仍可使用，刷新页面可重新尝试。</p></div></div>` : ""}
      <div class="paper-list">${availablePracticePapers().map(renderPaperCard).join("")}</div>
      <div class="source-note"><strong>题源说明</strong><p>社区整理，非北森官方。<a href="${COMMUNITY_BANK_SOURCE.repositoryUrl}" target="_blank" rel="noopener noreferrer">社区题源</a> · <a href="https://www.beisen.com/res/399.html" target="_blank" rel="noopener noreferrer">官方样题</a></p></div>
    </section>
  `;
}

function renderPaperCard(paper) {
  const availableQuestions = paper.questionIds.map(questionById).filter(Boolean);
  const available = availableQuestions.length;
  const explained = availableQuestions.filter(hasWrittenExplanation).length;
  const countLabel = paper.questionLimit ? `题库 ${available} 道 · 每次随机 ${Math.min(paper.questionLimit, available)} 道` : `${available} 道已录入`;
  const explanationLabel = explained === available ? `${available} 道均有解析` : `${explained}/${available} 道有解析`;
  return `<article class="paper-card">
    <div class="paper-mark">卷</div>
    <div class="paper-copy"><div class="row-title"><h3>${escapeHtml(paper.title)}</h3><span class="tag ${paper.provider.includes("用户") ? "accent" : ""}">${escapeHtml(paper.provider)}</span></div><p>${escapeHtml(paper.description)}</p><div class="row-meta"><span>${countLabel}</span><span>${paper.durationMinutes} 分钟</span><span>${explanationLabel}</span><span>交卷后显示</span></div></div>
    <div class="paper-actions">${paper.sourceUrl ? `<a class="btn" href="${escapeHtml(paper.sourceUrl)}" target="_blank" rel="noopener noreferrer">查看题源</a>` : ""}<button class="btn primary" data-start-paper="${paper.id}" aria-label="开始${escapeHtml(paper.title)}">${paper.questionLimit ? "随机组卷" : "开始整卷"}</button></div>
  </article>`;
}

function renderQuestionSource(question) {
  const url = safeExternalUrl(question.sourceUrl);
  return url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(question.source)}</a>` : escapeHtml(question.source);
}

function renderQuestionImages(question) {
  const images = question.images?.length ? question.images : question.image ? [question.image] : [];
  if (!images.length) return "";
  return `<div class="question-images">${images.map((image, index) => `<img class="question-image" src="${escapeHtml(image.startsWith("/") ? assetUrl(image) : image)}" alt="${escapeHtml(question.subtype)}题目图${images.length > 1 ? index + 1 : ""}" loading="eager">`).join("")}</div>`;
}

function renderAnswerOption(question, option, optionIndex, selected) {
  const rawImage = question.optionImages?.[optionIndex];
  const image = rawImage?.startsWith("/") ? assetUrl(rawImage) : rawImage;
  return `<label class="option ${Number(selected) === optionIndex ? "selected" : ""}"><input type="radio" name="exam-answer" value="${optionIndex}" data-question-answer="${question.id}" ${Number(selected) === optionIndex ? "checked" : ""}><span class="option-letter">${String.fromCharCode(65 + optionIndex)}</span><span class="option-content">${image ? `<img class="option-image" src="${escapeHtml(image)}" alt="选项 ${String.fromCharCode(65 + optionIndex)}">` : ""}<span>${escapeHtml(option)}</span></span></label>`;
}

function renderWrongBook() {
  const questions = state.wrongQuestionIds.map(questionById).filter(Boolean);
  return `
    <section class="practice-section no-top-gap">
      <div class="practice-section-head"><div><h2>错题本</h2><p>错题会自动收录。重练答对后仍保留历史记录。</p></div>${questions.length ? `<button class="btn primary" data-start-wrongbook>重练全部</button>` : ""}</div>
      ${questions.length ? `<div class="wrong-list">${questions.map(question => `<article class="wrong-card"><div><span class="tag warning">${categoryById(question.category)?.name || "未分类"}</span><h3>${escapeHtml(question.prompt.slice(0, 42))}${question.prompt.length > 42 ? "…" : ""}</h3><p>${escapeHtml(question.source)}</p></div><div class="wrong-card-actions"><button class="btn small ghost" data-master-wrong="${question.id}">已掌握，移除</button><button class="btn small" data-start-single="${question.id}">再做一次</button></div></article>`).join("")}</div>` : `<div class="large-empty"><strong>还没有错题</strong><p>完成一组训练后，答错的题会自动出现在这里。</p><button class="btn primary" data-start-category="mixed">开始测试</button></div>`}
    </section>
  `;
}

function renderPracticeStats() {
  const overall = practiceStats();
  return `
    <section class="practice-section no-top-gap">
      <div class="practice-section-head"><div><h2>训练统计</h2></div></div>
      <div class="training-metrics">
        <div><span>完成训练</span><strong>${overall.sessions}</strong><small>组</small></div>
        <div><span>累计答题</span><strong>${overall.answered}</strong><small>道</small></div>
        <div><span>整体正确率</span><strong>${overall.accuracy}</strong><small>%</small></div>
        <div><span>平均耗时</span><strong>${overall.averageSeconds}</strong><small>秒/题</small></div>
      </div>
      <div class="panel pad category-report">
        ${PRACTICE_CATEGORIES.map(category => {
          const item = statsForCategory(category.id);
          return `<div class="report-row"><span class="category-glyph">${category.short}</span><div><strong>${category.name}</strong><small>${item.answered} 道作答</small></div><div class="report-number">${item.answered ? `${item.accuracy}%` : "未测试"}</div><div class="report-advice">${item.answered ? (item.accuracy >= 80 ? "保持手感" : item.accuracy >= 60 ? "继续巩固" : "优先训练") : "完成首次专项"}</div></div>`;
        }).join("")}
      </div>
    </section>
  `;
}

function renderPracticeSession() {
  const session = state.practiceSession;
  const questions = session.questionIds.map(questionById).filter(Boolean);
  if (!questions.length) return `<div class="large-empty"><strong>这组训练暂时没有可用题目</strong><button class="btn" data-action="exit-practice">返回训练首页</button></div>`;
  if (session.status === "submitted") return renderPracticeResult(session, questions);
  const index = Math.min(session.index || 0, questions.length - 1);
  const question = questions[index];
  const selected = session.answers?.[question.id];
  const answeredCount = Object.keys(session.answers || {}).length;
  return `
    <div class="exam-shell">
      <header class="exam-header">
        <button class="btn ghost" data-action="exit-practice">退出练习</button>
        <div class="exam-title"><strong>${escapeHtml(session.title)}</strong><span>${answeredCount}/${questions.length} 已作答</span></div>
        <div class="exam-header-actions"><span class="exam-timer" data-started-at="${session.startedAt}">${formatDuration((Date.now() - session.startedAt) / 1000)}</span><button class="btn primary" data-action="submit-practice">交卷</button></div>
      </header>
      <div class="exam-progress"><span style="width:${((index + 1) / questions.length) * 100}%"></span></div>
      <div class="exam-layout">
        <main class="question-canvas">
          <div class="question-meta"><span>${categoryById(question.category)?.name || "未分类"}</span><span>${escapeHtml(question.subtype)}</span><span>难度 ${question.difficulty}/5</span><span>建议 ${question.expectedSeconds}s</span></div>
          <div class="question-number">第 ${index + 1} 题</div>
          ${renderQuestionImages(question)}
          <p class="question-prompt">${escapeHtml(question.prompt)}</p>
          <div class="answer-options exam-options">
            ${question.options.map((option, optionIndex) => renderAnswerOption(question, option, optionIndex, selected)).join("")}
          </div>
          <div class="exam-nav"><button class="btn" data-action="previous-question" ${index === 0 ? "disabled" : ""}>上一题</button><button class="btn primary" data-action="next-question">${index === questions.length - 1 ? "检查答题卡" : "下一题"}</button></div>
        </main>
        <aside class="answer-sheet">
          <div class="answer-sheet-head"><strong>答题卡</strong><span>${answeredCount}/${questions.length}</span></div>
          <div class="answer-sheet-grid">${questions.map((item, itemIndex) => `<button class="answer-cell ${session.answers?.[item.id] !== undefined ? "answered" : ""} ${itemIndex === index ? "current" : ""}" data-question-index="${itemIndex}">${itemIndex + 1}</button>`).join("")}</div>
          <div class="answer-legend"><span><i class="legend-box answered"></i>已答</span><span><i class="legend-box"></i>未答</span></div>
          <div class="source-note compact"><strong>当前题源</strong><p>${renderQuestionSource(question)}</p></div>
        </aside>
      </div>
    </div>
  `;
}

function renderPracticeResult(session, questions) {
  const results = questions.map(question => ({ question, selected: session.answers?.[question.id], correct: Number(session.answers?.[question.id]) === question.answer }));
  const correct = results.filter(item => item.correct).length;
  const accuracy = Math.round((correct / questions.length) * 100);
  const explanationCount = questions.filter(hasWrittenExplanation).length;
  return `
    <div class="result-hero">
      <button class="btn ghost result-back" data-action="exit-practice">返回训练首页</button>
      <span class="practice-kicker">本次结果</span><h1>${accuracy >= 80 ? "节奏不错，继续保持" : accuracy >= 60 ? "基础已建立，继续巩固" : "先看清错因，再练一轮"}</h1>
      <div class="result-score"><strong>${accuracy}</strong><span>分</span></div>
      <div class="result-summary"><span>${correct}/${questions.length} 正确</span><span>用时 ${formatDuration(session.elapsedSeconds)}</span><span>${questions.length - correct} 道待复盘</span><span>${explanationCount}/${questions.length} 道有文字解析</span></div>
      <div class="result-actions"><button class="btn primary" data-action="review-answers">查看答案与解析</button>${questions.length - correct ? `<button class="btn" data-action="retry-session-wrong">重练本组错题</button>` : ""}<button class="btn" data-practice-tab="stats">查看训练统计</button></div>
    </div>
    <div class="review-list" id="answer-review">
      ${results.map((item, index) => `<article class="review-card ${item.correct ? "correct" : "wrong"}">
        <div class="review-head"><span>第 ${index + 1} 题 · ${categoryById(item.question.category)?.name}</span><strong>${item.correct ? "回答正确" : item.selected === undefined ? "未作答" : "回答错误"}</strong></div>
        ${renderQuestionImages(item.question)}
        <p class="review-prompt">${escapeHtml(item.question.prompt)}</p>
        <div class="review-answer">${renderReviewedChoice("你的答案", item.question, item.selected, item.correct ? "correct-choice" : "wrong-choice")}${renderReviewedChoice("正确答案", item.question, item.question.answer, "correct-choice")}</div>
        <div class="review-explanation ${hasWrittenExplanation(item.question) ? "" : "missing"}"><div class="review-explanation-head"><strong>答案解析</strong><span>${hasWrittenExplanation(item.question) ? "题源有解析" : "解析待补"}</span></div><p>${escapeHtml(explanationText(item.question))}</p><small>题目来源：${renderQuestionSource(item.question)}</small></div>
      </article>`).join("")}
    </div>
  `;
}

function statsForCategory(categoryId) {
  const questionIds = new Set(questionBank().filter(question => question.category === categoryId).map(question => question.id));
  const attempts = (state.practiceHistory || []).flatMap(item => item.results || []).filter(item => questionIds.has(item.questionId));
  const correct = attempts.filter(item => item.correct).length;
  return { answered: attempts.length, accuracy: attempts.length ? Math.round((correct / attempts.length) * 100) : 0 };
}

function getWeakestCategory() {
  const tested = PRACTICE_CATEGORIES.map(category => ({ ...category, ...statsForCategory(category.id) })).filter(item => item.answered);
  return tested.sort((a, b) => a.accuracy - b.accuracy)[0] || null;
}

function startPractice(title, questionIds, mode = "practice") {
  const usableIds = [...new Set(questionIds)].filter(id => questionById(id));
  if (!usableIds.length) {
    showToast("当前没有可用题目");
    return;
  }
  state.practiceSession = {
    id: crypto.randomUUID(),
    title,
    mode,
    questionIds: usableIds,
    index: 0,
    answers: {},
    startedAt: Date.now(),
    status: "active"
  };
  saveState();
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function submitPractice() {
  const session = state.practiceSession;
  if (!session || session.status === "submitted") return;
  const questions = session.questionIds.map(questionById).filter(Boolean);
  const results = questions.map(question => ({
    questionId: question.id,
    selected: session.answers?.[question.id],
    correct: Number(session.answers?.[question.id]) === question.answer,
    category: question.category
  }));
  const wrongIds = results.filter(result => !result.correct).map(result => result.questionId);
  session.status = "submitted";
  session.elapsedSeconds = Math.max(1, Math.round((Date.now() - session.startedAt) / 1000));
  state.wrongQuestionIds = [...new Set([...(state.wrongQuestionIds || []), ...wrongIds])];
  state.practiceHistory.push({ id: session.id, title: session.title, endedAt: Date.now(), elapsedSeconds: session.elapsedSeconds, results });
  state.tasks.practice = true;
  saveState("已交卷，错题已自动收录");
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderJobs() {
  const activeTab = state.jobView || "radar";
  const isRulesView = activeTab === "rules";
  return viewWrap("jobs", `
    <div class="page-heading jobs-heading">
      <div><h1>${isRulesView ? "大厂投递规则" : "岗位雷达"}</h1></div>
      ${isRulesView ? "" : `<div class="heading-actions"><button class="btn" data-modal="job-refresh-info">管理员抓取</button><button class="btn" data-action="refresh-radar" ${radarLoading ? "disabled" : ""}>${radarLoading ? "正在检查…" : "检查新增"}</button><button class="btn primary" data-modal="quick-add">手动添加</button></div>`}
    </div>
    <div class="practice-tabs job-tabs jobs-section-tabs" role="tablist" aria-label="岗位模块">
      ${[["radar", "岗位雷达"], ["rules", "投递规则"], ["companies", "岗位诊断"], ["sources", "数据来源"]].map(([id, label]) => `<button class="practice-tab ${activeTab === id ? "active" : ""}" data-job-tab="${id}" role="tab">${label}${id === "companies" && state.companyReviewQueue.length ? ` ${state.companyReviewQueue.length}` : ""}</button>`).join("")}
    </div>
    ${activeTab === "rules" ? renderApplicationRules() : activeTab === "companies" ? renderCompanyMatches() : activeTab === "sources" ? renderJobSources() : renderJobRadar()}
  `);
}

function applicationRuleMatches(rule, filters) {
  const query = filters.query.trim().toLowerCase();
  const haystack = [rule.company, ...(rule.aliases || []), rule.cohort, rule.signal, rule.quota].join(" ").toLowerCase();
  return !query || haystack.includes(query);
}

function renderApplicationRules() {
  const officialCount = APPLICATION_RULES.filter(rule => rule.evidence === "official").length;
  const filters = state.ruleFilters || initialState.ruleFilters;
  const visibleCount = APPLICATION_RULES.filter(rule => applicationRuleMatches(rule, filters)).length;
  return `
    <section class="application-rule-controls panel">
      <div class="application-rule-search-row">
        <label for="application-rule-search"><span>搜索公司</span><input class="search" id="application-rule-search" type="search" value="${escapeHtml(filters.query)}" placeholder="例如：腾讯、小米或 ByteDance" autocomplete="off"></label>
        <div class="application-rule-library-meta"><strong>规则库 ${APPLICATION_RULES.length} 家</strong><span>${officialCount} 家官网已明确</span></div>
      </div>
      <div class="application-rule-result-meta"><span id="application-rule-result-count" aria-live="polite">找到 ${visibleCount} 家公司</span><span>更新 ${APPLICATION_RULES_UPDATED_AT} · 各公司核验日期见卡片</span></div>
    </section>
    <div class="application-rule-grid">
      ${APPLICATION_RULES.map(rule => `<article class="application-rule-card panel" data-rule-card data-rule-search="${escapeHtml([rule.company, ...(rule.aliases || []), rule.cohort, rule.signal, rule.quota].join(" ").toLowerCase())}" ${applicationRuleMatches(rule, filters) ? "" : "hidden"}>
        <header>
          <div><span>${escapeHtml(rule.cohort)}${rule.checkedAt ? ` · 核对 ${escapeHtml(rule.checkedAt)}` : ""}</span><h3>${escapeHtml(rule.company)}</h3></div>
          <strong class="rule-signal">${escapeHtml(rule.signal)}</strong>
        </header>
        <div class="rule-quota"><span>核心限制</span><strong>${escapeHtml(rule.quota)}</strong></div>
        <dl>
          <div><dt>能否并行</dt><dd>${escapeHtml(rule.parallel)}</dd></div>
          <div><dt>未通过后</dt><dd>${escapeHtml(rule.retry)}</dd></div>
          <div><dt>修改岗位</dt><dd>${escapeHtml(rule.change)}</dd></div>
        </dl>
        <details class="rule-advice copy-help"><summary>投递建议</summary><p>${escapeHtml(rule.advice)}</p></details>
        <footer><span class="rule-evidence ${rule.evidence}">${escapeHtml(rule.evidenceLabel)}</span><div>${rule.sources.map(source => `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.label)}</a>`).join("")}</div></footer>
      </article>`).join("")}
    </div>
    <div class="large-empty application-rule-empty" id="application-rule-empty" ${visibleCount ? "hidden" : ""}><strong>暂时没有找到这家公司</strong><p>可以换一个公司名称，或清空搜索框查看全部规则。</p></div>
    <p class="application-rule-note">投递前以招聘官网为准；“未明确”不代表没有限制。</p>
  `;
}

function updateApplicationRuleResults() {
  const filters = state.ruleFilters || initialState.ruleFilters;
  const query = filters.query.trim().toLowerCase();
  let visibleCount = 0;
  document.querySelectorAll("[data-rule-card]").forEach(card => {
    const matchesQuery = !query || card.dataset.ruleSearch.includes(query);
    card.hidden = !matchesQuery;
    if (!card.hidden) visibleCount += 1;
  });
  const count = document.querySelector("#application-rule-result-count");
  if (count) count.textContent = `找到 ${visibleCount} 家公司`;
  const empty = document.querySelector("#application-rule-empty");
  if (empty) empty.hidden = visibleCount > 0;
}

function radarStats(jobs = radarJobs) {
  const companies = new Set(jobs.map(job => job.company)).size;
  const actionable = jobs.filter(job => safeExternalUrl(job.applyUrl)).length;
  const verified = jobs.filter(job => ["verified", "corrected"].includes(job.linkStatus)).length;
  const blocked = jobs.filter(job => ["invalid", "mismatch", "conflict", "unverified"].includes(job.linkStatus)).length;
  return { companies, actionable, verified, blocked, missing: jobs.length - actionable };
}

function radarInboxStats(baseJobs) {
  const activity = state.radarActivity;
  const baseIds = new Set(baseJobs.map(job => job.id));
  const newCount = activity.newJobIds.filter(id => baseIds.has(id)).length;
  const unread = baseJobs.filter(job => !activity.viewedAt[job.id]).length;
  const todayEntries = Object.entries(activity.dailyViewed[localDateKey()] || {});
  const morning = todayEntries.filter(([, timestamp]) => new Date(timestamp).getHours() < 12).length;
  const afternoon = todayEntries.length - morning;
  const appliedToday = state.applications.filter(item => item.createdAt && localDateKey(item.createdAt) === localDateKey()).length;
  const saved = baseJobs.filter(job => state.radarActivity.savedJobIds.includes(job.id)).length;
  return { newCount, unread, viewed: baseJobs.length - unread, saved, today: todayEntries.length, morning, afternoon, appliedToday };
}

function displayJobText(value = "") {
  return escapeHtml(String(value).replace(/[—–]/g, "-").replace(/\s+/g, " ").trim());
}

function normalizeCompanyKey(value = "") {
  const normalized = String(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[（(][^）)]*[）)]/g, "")
    .replace(/[\s·•._\-/]/g, "")
    .replace(/(?:股份有限公司|有限责任公司|有限公司|集团|公司)$/g, "");
  if (["dji", "大疆创新"].includes(normalized)) return "大疆";
  return normalized;
}

function companyKeysMatch(left, right) {
  const a = normalizeCompanyKey(left);
  const b = normalizeCompanyKey(right);
  if (!a || !b) return false;
  if (a === b) return true;
  return Math.min(a.length, b.length) >= 4 && (a.startsWith(b) || b.startsWith(a));
}

function exactRadarApplication(jobId) {
  return state.applications.find(item => item.jobId === jobId || item.radarJobId === jobId);
}

function companyApplications(company) {
  return state.applications.filter(application => {
    const savedJob = state.jobs.find(item => item.id === application.jobId);
    return savedJob && companyKeysMatch(savedJob.company, company);
  });
}

function radarRoleTerms() {
  const target = String(state.profile.targetRole || "").trim();
  const core = target.replace(/高级|资深|经理|工程师|专员|岗位|方向/g, "").trim();
  return [...new Set([target, core, target.includes("产品") ? "产品" : ""].filter(term => term.length >= 2))];
}

function radarTargetCities() {
  return String(state.profile.targetCity || "")
    .split(/[、，,|/\s]+/)
    .map(city => city.trim())
    .filter(city => city.length >= 2 && !["全国", "多地"].includes(city));
}

function radarFit(job) {
  const roles = job.positions?.length ? job.positions : [job.role];
  const roleText = `${job.role || ""} ${roles.join(" ")} ${job.program || ""}`;
  const roleTerms = radarRoleTerms();
  const cities = radarTargetCities();
  const roleMatch = roleTerms.some(term => roleText.includes(term));
  const matchedCities = cities.filter(city => String(job.location || "").includes(city));
  const direct = Boolean(safeExternalUrl(job.applyUrl));
  const linkLabel = ["verified", "corrected"].includes(job.linkStatus) ? "入口已核验" : direct ? "聚合源链接" : "链接待核验";
  const crossChecked = Number(job.confirmedBy) > 1;
  const signals = [
    { label: roleMatch ? `有${roleTerms.at(-1) || "目标"}方向` : "未发现目标方向", met: roleMatch },
    { label: matchedCities.length ? `包含${matchedCities.slice(0, 2).join("、")}` : "城市需核对", met: Boolean(matchedCities.length) },
    { label: linkLabel, met: direct },
    { label: crossChecked ? `${job.confirmedBy} 个来源核对` : "单一来源", met: crossChecked },
  ];
  return { score: Number(roleMatch) * 5 + Number(matchedCities.length > 0) * 3 + Number(direct) + Number(crossChecked), signals };
}

function preferredRoles(job) {
  const roles = job.positions?.length ? job.positions : [job.role];
  const terms = radarRoleTerms();
  return [...roles].sort((a, b) => Number(terms.some(term => b.includes(term))) - Number(terms.some(term => a.includes(term))));
}

function radarJobStatus(job) {
  const application = exactRadarApplication(job.id);
  if (application?.status === "offer") return { label: "已获 Offer", className: "applied" };
  if (application && isClosedApplicationStatus(application.status)) return { label: "已结束", className: "viewed" };
  if (application) return { label: "跟进中", className: "applied" };
  if (companyApplications(job.company).length) return { label: "该公司已投", className: "applied" };
  if (state.radarActivity.newJobIds.includes(job.id) && state.radarActivity.viewedAt[job.id]) return { label: "新增已看", className: "new-viewed" };
  if (state.radarActivity.newJobIds.includes(job.id)) return { label: "新增", className: "new" };
  if (state.radarActivity.viewedAt[job.id]) return { label: "已看", className: "viewed" };
  return { label: "未看", className: "unread" };
}

function formatActivityMoment(value) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const time = new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit" }).format(date);
  const today = localDateKey();
  const yesterday = localDateKey(new Date(Date.now() - 86400000));
  if (localDateKey(date) === today) return `今天 ${time}`;
  if (localDateKey(date) === yesterday) return `昨天 ${time}`;
  return `${date.getMonth() + 1}月${date.getDate()}日 ${time}`;
}

function renderRadarContinuation() {
  const activity = state.radarActivity;
  const lastJob = radarJobs.find(job => job.id === activity.lastViewedJobId);
  return `<div class="radar-continuation">
    <div><span>继续浏览</span>${lastJob ? `<strong>上次看到 ${escapeHtml(lastJob.company)} · ${escapeHtml(lastJob.program || lastJob.role)}</strong><small>${escapeHtml(formatActivityMoment(activity.lastViewedAt))}</small>` : `<strong>还没有浏览记录</strong>`}</div>
    ${lastJob ? `<button class="btn" data-action="continue-radar">继续上次</button>` : ""}
  </div>`;
}

function scrollSelectedRadarIntoView() {
  const selected = document.querySelector(`[data-radar-shell="${state.selectedRadarJob}"]`);
  const panel = selected?.closest(".job-list");
  if (!selected || !panel) return;
  const itemTop = selected.getBoundingClientRect().top - panel.getBoundingClientRect().top + panel.scrollTop;
  const itemBottom = itemTop + selected.offsetHeight;
  if (itemTop < panel.scrollTop || itemBottom > panel.scrollTop + panel.clientHeight) {
    panel.scrollTop = Math.max(0, itemTop - panel.clientHeight / 2 + selected.offsetHeight / 2);
  }
}

function updateRadarActivityUi(job) {
  const baseJobs = visibleRadarJobs({ applyInbox: false });
  const stats = radarInboxStats(baseJobs);
  const values = {
    "#radar-new-count": stats.newCount,
    "#radar-unread-count": stats.unread,
    "#radar-today-count": stats.today,
    "#radar-applied-count": stats.appliedToday,
    "#radar-dayparts": `上午 ${stats.morning}，下午 ${stats.afternoon}`
  };
  Object.entries(values).forEach(([selector, value]) => {
    const element = document.querySelector(selector);
    if (element) element.textContent = String(value);
  });
  const continuation = document.querySelector("#radar-continuation-slot");
  if (continuation) continuation.innerHTML = renderRadarContinuation();
  if (job) {
    const status = radarJobStatus(job);
    const statusElement = document.querySelector(`[data-radar-status="${job.id}"]`);
    if (statusElement) {
      statusElement.className = `radar-status ${status.className}`;
      statusElement.textContent = status.label;
    }
    if (["viewed", "new-viewed", "applied"].includes(status.className)) document.querySelector(`[data-radar-shell="${job.id}"]`)?.classList.add("is-viewed");
  }
}

function selectRadarJob(jobId) {
  const job = radarJobs.find(item => item.id === jobId);
  if (!job) return;
  state.selectedRadarJob = jobId;
  markRadarViewed(jobId);
  document.querySelectorAll("[data-radar-shell]").forEach(element => element.classList.toggle("active", element.dataset.radarShell === jobId));
  const detail = document.querySelector("#job-detail");
  if (detail) detail.innerHTML = renderRadarDetail(job, visibleRadarJobs());
  const detailTitle = document.querySelector(".radar-detail-panel .radar-pane-title span");
  if (detailTitle) detailTitle.textContent = job.company;
  updateRadarActivityUi(job);
  saveState();
}

function visibleRadarJobs({ applyInbox = true } = {}) {
  const filters = state.jobFilters || initialState.jobFilters;
  const query = filters.query.trim().toLowerCase();
  return radarJobs
    .filter(job => {
      const haystack = `${job.company} ${job.role} ${job.program} ${job.location} ${job.industry}`.toLowerCase();
      const hidden = state.radarActivity.hiddenJobIds.includes(job.id);
      const matchesBase = (!query || haystack.includes(query))
        && (filters.roleCategory === "全部方向" || jobRoleCategories(job).includes(filters.roleCategory))
        && (filters.industry === "全部行业" || job.industry === filters.industry)
        && (filters.batch === "全部批次" || job.batch === filters.batch)
        && (filters.linkMode !== "可直接投递" || Boolean(safeExternalUrl(job.applyUrl)))
        && (filters.linkMode !== "仅官网已核验" || ["verified", "corrected"].includes(job.linkStatus));
      if (!matchesBase) return false;
      if (filters.inbox === "已隐藏") return hidden;
      if (hidden) return false;
      if (!applyInbox) return true;
      if (filters.inbox === "新增") return state.radarActivity.newJobIds.includes(job.id);
      if (filters.inbox === "未看") return !state.radarActivity.viewedAt[job.id] || job.id === state.selectedRadarJob;
      if (filters.inbox === "已看") return Boolean(state.radarActivity.viewedAt[job.id]);
      if (filters.inbox === "已收藏") return state.radarActivity.savedJobIds.includes(job.id);
      if (filters.inbox === "有投递记录" || filters.inbox === "已投递") return companyApplications(job.company).length > 0;
      return true;
    })
    .sort((a, b) => {
      if (filters.sort === "公司名称") return a.company.localeCompare(b.company, "zh-CN");
      if (filters.sort === "最新收录") return (b.lastSeen || b.firstSeen || "").localeCompare(a.lastSeen || a.firstSeen || "");
      return radarFit(b).score - radarFit(a).score
        || (b.lastSeen || b.firstSeen || "").localeCompare(a.lastSeen || a.firstSeen || "")
        || b.confirmedBy - a.confirmedBy;
    });
}

function groupRadarJobsByCompany(jobs) {
  const groups = new Map();
  jobs.forEach(job => {
    const key = normalizeCompanyKey(job.company) || job.company;
    if (!groups.has(key)) groups.set(key, { company: job.company, jobs: [] });
    groups.get(key).jobs.push(job);
  });
  return [...groups.values()];
}

function companyRadarStatus(jobs) {
  if (jobs.some(job => companyApplications(job.company).length)) return { label: "该公司已投", className: "applied" };
  const newCount = jobs.filter(job => state.radarActivity.newJobIds.includes(job.id) && !state.radarActivity.viewedAt[job.id]).length;
  if (newCount) return { label: `${newCount} 个新增`, className: "new" };
  const unread = jobs.filter(job => !state.radarActivity.viewedAt[job.id]).length;
  if (unread) return { label: `${unread} 个未看`, className: "unread" };
  return { label: "已看", className: "viewed" };
}

function renderJobRadar() {
  const stats = radarStats();
  const baseJobs = visibleRadarJobs({ applyInbox: false });
  const inboxStats = radarInboxStats(baseJobs);
  const jobs = visibleRadarJobs();
  const companyGroups = groupRadarJobsByCompany(jobs);
  const selected = jobs.find(job => job.id === state.selectedRadarJob) || jobs[0];
  const industries = INDUSTRY_GROUPS.filter(industry => radarJobs.some(job => job.industry === industry));
  const batches = [...new Set(radarJobs.map(job => job.batch).filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-CN"));
  return `
    <section class="panel radar-control-panel">
      <div class="radar-control-top">
        <div class="radar-preference-bar">
          <div><span>当前偏好</span><strong>${displayJobText(state.profile.targetRole || "目标岗位")} · ${displayJobText(state.profile.targetCity || "目标城市待补")}</strong></div>
          <button class="text-action" data-modal="profile">修改</button>
        </div>
        <div class="radar-search-row">
          <input class="search" id="radar-search" type="search" value="${escapeHtml(state.jobFilters.query)}" placeholder="搜索岗位、公司或城市" aria-label="搜索校招岗位">
          <button class="btn" data-action="clear-radar-filters">清除</button>
        </div>
      </div>
      <div class="radar-quick-filters" aria-label="岗位状态快速筛选">
        ${[
          ["全部岗位", "全部岗位", baseJobs.length],
          ["未看", "当前未看", inboxStats.unread],
          ["已收藏", "我的收藏", inboxStats.saved]
        ].map(([value, label, count]) => `<button class="${state.jobFilters.inbox === value ? "active" : ""}" data-inbox-filter="${value}"><span>${label}</span><strong>${count}</strong></button>`).join("")}
        <button data-open-pipeline-from-radar><span>投递记录</span><strong>${state.applications.length}</strong></button>
      </div>
      <div class="radar-toolbar">
        <label><span>岗位方向</span><select id="radar-role-category">${JOB_ROLE_CATEGORIES.map(value => `<option ${state.jobFilters.roleCategory === value ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}</select></label>
        <label><span>行业</span><select id="radar-industry"><option>全部行业</option>${industries.map(value => `<option ${state.jobFilters.industry === value ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}</select></label>
        <label><span>招聘批次</span><select id="radar-batch"><option>全部批次</option>${batches.map(value => `<option ${state.jobFilters.batch === value ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}</select></label>
        <label><span>投递入口</span><select id="radar-link"><option value="可直接投递" ${state.jobFilters.linkMode === "可直接投递" ? "selected" : ""}>有可用链接</option><option ${state.jobFilters.linkMode === "仅官网已核验" ? "selected" : ""}>仅官网已核验</option><option ${state.jobFilters.linkMode === "全部线索" ? "selected" : ""}>全部线索</option></select></label>
        <label><span>浏览状态</span><select id="radar-inbox">${["全部岗位", "新增", "未看", "已看", "已收藏", "有投递记录", "已隐藏"].map(value => `<option ${state.jobFilters.inbox === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>
        <label><span>排序方式</span><select id="radar-sort">${["偏好优先", "最新收录", "公司名称"].map(value => `<option ${state.jobFilters.sort === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>
      </div>
      <div class="radar-result-meta"><span id="radar-result-count">共 ${companyGroups.length} 家公司 · ${jobs.length} 个岗位</span><span>岗位池 ${radarJobs.length.toLocaleString("zh-CN")} 条，${stats.companies.toLocaleString("zh-CN")} 家公司 · ${stats.verified.toLocaleString("zh-CN")} 条官方域名已核验 · ${stats.blocked.toLocaleString("zh-CN")} 条异常链接已暂停${state.jobFilters.inbox === "新增" && inboxStats.newCount ? ` <button class="text-action" data-action="clear-new-batch">标记已处理</button>` : ""}</span></div>
    </section>
    <div class="job-radar-layout">
      <section class="panel radar-list-panel"><div class="radar-pane-title"><strong>公司列表</strong><span>${state.jobFilters.sort}</span></div><div class="job-list" id="job-list">${renderCompanyRows(companyGroups.slice(0, 200))}</div></section>
      <section class="panel radar-detail-panel"><div class="radar-pane-title"><strong>公司岗位</strong><span>${selected ? displayJobText(selected.company) : "未选择"}</span></div><div class="detail-stage" id="job-detail">${selected ? renderRadarDetail(selected, jobs) : `<div class="large-empty"><strong>没有符合条件的岗位</strong><p>减少筛选条件后再试。</p></div>`}</div></section>
    </div>
  `;
}

function renderCompanyRows(groups) {
  return groups.map(group => {
    const selected = group.jobs.find(job => job.id === state.selectedRadarJob) || group.jobs[0];
    const active = group.jobs.some(job => job.id === state.selectedRadarJob);
    const status = companyRadarStatus(group.jobs);
    const roles = [...new Set(group.jobs.map(job => job.role).filter(Boolean))];
    const locations = [...new Set(group.jobs.flatMap(job => job.locations?.length ? job.locations : [job.location]).filter(Boolean))];
    return `<article class="radar-row-shell ${active ? "active" : ""} ${status.className === "viewed" ? "is-viewed" : ""}" data-radar-shell="${selected.id}">
      <button class="radar-row" data-radar-job="${selected.id}">
        <span class="radar-row-top"><strong>${displayJobText(group.company)}</strong><span class="radar-status ${status.className}">${status.label}</span></span>
        <span class="radar-row-title">符合当前筛选 ${group.jobs.length} 个具体岗位</span>
        <span class="radar-role-line">${roles.slice(0, 2).map(displayJobText).join(" / ")}${roles.length > 2 ? ` 等 ${roles.length} 个岗位` : ""}</span>
        <span class="row-meta"><span>${locations.slice(0, 3).map(displayJobText).join(" / ") || "地点待确认"}</span><span>按公司聚合</span></span>
      </button>
    </article>`;
  }).join("") || `<div class="empty-state">当前筛选下没有公司。可以切换岗位方向或清除筛选后重新查看。</div>`;
}

function renderRadarDetail(job, filteredJobs = visibleRadarJobs()) {
  const application = exactRadarApplication(job.id);
  const relatedApplications = companyApplications(job.company);
  const bookmarked = state.radarActivity.savedJobIds.includes(job.id);
  const hidden = state.radarActivity.hiddenJobIds.includes(job.id);
  const link = safeExternalUrl(job.applyUrl);
  const linkMeta = applyLinkMeta(link);
  const linkState = radarLinkState(job);
  const queued = state.companyReviewQueue.includes(job.company);
  const diagnosis = state.companyDiagnoses[job.company];
  const fit = radarFit(job);
  const analyzedJob = state.jobs.find(item => item.id === job.id && item.jdSource === "pasted");
  const keywords = analyzedJob ? extractKeywords(analyzedJob.jd, analyzedJob.tags) : [];
  const gaps = analyzedJob ? getGaps(analyzedJob) : [];
  const companyJobs = filteredJobs.filter(item => companyKeysMatch(item.company, job.company));
  return `
    <div class="detail-company-row">
      <div><div class="detail-eyebrow"><span>${displayJobText(job.cohort)}</span><span>${displayJobText(job.batch)}</span><span>${displayJobText(job.industry)}</span></div><h2>${displayJobText(job.company)}</h2><p class="detail-program">${displayJobText(job.program || "校园招聘")}</p></div>
      <div class="detail-primary-actions"><button class="btn" data-toggle-radar-save="${job.id}">${bookmarked ? "取消收藏" : "收藏"}</button>${link ? `<a class="btn primary" data-radar-open="${job.id}" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(linkState.action || linkMeta.action)}</a>` : `<button class="btn" disabled>${escapeHtml(linkState.action)}</button>`}</div>
    </div>
    <div class="detail-facts"><div><span>工作地点</span><strong>${displayJobText(job.location)}</strong></div><div><span>截止时间</span><strong>${displayJobText(job.deadline)}</strong></div><div><span>信息来源</span><strong>${job.confirmedBy > 1 ? `${job.confirmedBy} 个来源` : "1 个来源"}</strong></div></div>
    <section class="preference-match">
      <div class="section-heading-line"><h3>与你的偏好</h3></div>
      <div class="preference-signals">${fit.signals.slice(0, 3).map(item => `<div class="${item.met ? "met" : "unknown"}"><strong>${item.met ? "符合" : "待核对"}</strong><span>${displayJobText(item.label)}</span></div>`).join("")}</div>
    </section>
    <section class="job-detail-section"><div class="section-heading-line"><h3>符合筛选的具体岗位</h3><span>${companyJobs.length} 个</span></div><div class="opening-list">${companyJobs.slice(0, 80).map(item => {
      const itemLink = safeExternalUrl(item.applyUrl);
      const itemStatus = radarJobStatus(item);
      return `<div><span><strong>${displayJobText(item.role)}</strong><small>${displayJobText(item.location)} · ${escapeHtml(itemStatus.label)}</small></span>${itemLink ? `<a data-radar-open="${item.id}" href="${escapeHtml(itemLink)}" target="_blank" rel="noopener noreferrer">官网投递</a>` : `<em>入口待补</em>`}</div>`;
    }).join("")}</div>${companyJobs.length > 80 ? `<p class="application-rule-note">当前显示前 80 个岗位，可用上方岗位方向、城市或关键词继续缩小范围。</p>` : ""}</section>
    <section class="jd-analysis-box ${analyzedJob ? "ready" : ""}">
      <div><span>JD 分析</span><h3>${analyzedJob ? "JD 关键词" : "补充具体岗位 JD"}</h3><p>${analyzedJob ? `提取 ${keywords.length} 个关键词 · ${gaps.length} 项简历补充提示` : "粘贴具体岗位描述，提取关键词并查看简历待补项。"}</p></div>
      ${analyzedJob ? `<div class="jd-analysis-tags">${keywords.map(item => `<span>${escapeHtml(item)}</span>`).join("")}</div><button class="btn primary" data-action="sync-jd" data-job-id="${job.id}">同步到简历优化</button>` : `<button class="btn primary" data-analyze-radar="${job.id}">粘贴具体 JD</button>`}
    </section>
    <div class="source-strip"><span>来源：${job.sourceNames.map(displayJobText).join(" + ")}</span><span>最近收录：${displayJobText(job.lastSeen || "来源更新日")}</span><span>链接校验：${escapeHtml(linkState.note)}</span>${application ? `<span class="linked-progress">投递进度：<strong>${escapeHtml(applicationStageLabel(application.status))}</strong></span>` : relatedApplications.length ? `<span class="linked-progress">关联状态：<strong>${escapeHtml(job.company)}已有 ${relatedApplications.length} 条投递记录</strong></span>` : ""}</div>
    <div class="detail-actions"><button class="btn ghost" data-hide-radar-job="${job.id}">${hidden ? "恢复显示" : "不感兴趣"}</button>${diagnosis ? `<button class="btn" data-diagnose-company="${displayJobText(job.company)}">编辑诊断记录</button>` : `<button class="btn" data-review-company="${displayJobText(job.company)}" aria-pressed="${queued}">${queued ? "移出待诊断" : "加入待诊断"}</button>`}${application ? `<button class="btn primary" data-open-application="${application.id}">查看投递记录</button>` : relatedApplications.length ? `<button class="btn" data-open-company-applications="${displayJobText(job.company)}">查看公司投递</button><button class="btn primary" data-action="save-radar-job" data-job-id="${job.id}">记录这个岗位</button>` : `<button class="btn primary" data-action="save-radar-job" data-job-id="${job.id}">记录为已投递</button>`}</div>
  `;
}

function renderCompanyMatches() {
  if (!hasPrivateAccess()) return `<div class="large-empty"><strong>登录后查看岗位诊断</strong><button class="btn primary" data-modal="account">使用邮箱登录</button></div>`;
  const groups = new Map();
  radarJobs.forEach(job => {
    if (!groups.has(job.company)) groups.set(job.company, []);
    groups.get(job.company).push(job);
  });
  const companies = state.companyReviewQueue
    .map(company => ({ company, jobs: groups.get(company) || [] }))
    .filter(item => item.jobs.length)
    .map(item => ({ ...item, roles: companyDirections(item.jobs) }));
  const completedCount = companies.filter(item => state.companyDiagnoses[item.company]).length;
  return `
    <div class="company-match-intro"><div><span class="practice-kicker">岗位诊断</span><h2>${companies.length ? `待记录 ${companies.length - completedCount} 家 · 已完成 ${completedCount} 家` : "选择需要分析的公司"}</h2><p>在助手对话中分析，将结论保存到这里。</p></div><button class="btn" data-job-tab="radar">继续浏览岗位</button></div>
    ${companies.length ? `<div class="company-grid">
      ${companies.map(item => `<article class="company-card">
        <div class="company-card-top"><div><span>${escapeHtml(item.jobs[0].industry)}</span><h3>${escapeHtml(item.company)}</h3></div><strong class="review-state ${state.companyDiagnoses[item.company] ? "done" : ""}">${state.companyDiagnoses[item.company] ? "已记录" : "待诊断"}</strong></div>
        <div class="company-openings">当前收录 ${item.jobs.length} 个批次/岗位记录</div>
        <ol>${item.roles.map(role => `<li><span><strong>${escapeHtml(role.role)}</strong></span>${safeExternalUrl(role.job.applyUrl) ? `<a href="${escapeHtml(role.job.applyUrl)}" target="_blank" rel="noopener noreferrer">打开入口 ↗</a>` : `<em>入口待补</em>`}</li>`).join("")}</ol>
        ${state.companyDiagnoses[item.company] ? `<div class="diagnosis-summary"><strong>诊断结论</strong><p>${escapeHtml(state.companyDiagnoses[item.company].conclusion || "已保存诊断结果")}</p><small>更新于 ${escapeHtml(formatDiagnosisDate(state.companyDiagnoses[item.company].updatedAt))}</small></div>` : ``}
        <div class="company-card-actions"><button class="btn small" data-company-pick="${item.jobs[0].id}">查看岗位</button><button class="btn small primary" data-diagnose-company="${escapeHtml(item.company)}">${state.companyDiagnoses[item.company] ? "编辑诊断" : "填写诊断结果"}</button>${state.companyDiagnoses[item.company] ? "" : `<button class="btn small ghost" data-review-company="${escapeHtml(item.company)}">移出清单</button>`}</div>
      </article>`).join("")}
    </div>` : `<div class="large-empty"><strong>还没有待诊断公司</strong><p>回到岗位雷达，打开公司岗位后点击“加入待诊断”。</p><button class="btn primary" data-job-tab="radar">选择公司</button></div>`}
  `;
}

function companyDirections(jobs) {
  const unique = new Map();
  jobs.forEach(job => (job.positions.length ? job.positions : [job.role]).forEach(role => {
    if (!unique.has(role)) unique.set(role, { role, job });
  }));
  return [...unique.values()].slice(0, 3);
}

function formatDiagnosisDate(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "最近";
}

function hasRealProfile() {
  return state.profile.source === "user";
}

function renderJobSources() {
  return `
    <div class="source-layout">
      <section class="panel pad"><div class="panel-title">岗位数据来源</div><div class="source-list">
        ${radarSourceStatus.map(source => `<article class="source-card"><span class="source-dot ${source.state}"></span><div><strong>${escapeHtml(source.name)}</strong><p>${escapeHtml(source.cadence)} · ${escapeHtml(source.license)}</p></div><div class="source-count">${source.state === "loading" ? "连接中" : source.state === "ok" ? `${source.count.toLocaleString("zh-CN")} 条` : "暂不可用"}</div><a href="${escapeHtml(source.homepage)}" target="_blank" rel="noopener noreferrer">查看来源</a></article>`).join("")}
      </div><div class="source-note"><strong>投递前核对</strong><p>请在招聘官网确认届别、岗位要求和截止时间。</p></div></section>
      <section class="panel pad feishu-sync-card"><div class="sync-head"><div><div class="panel-title">公开与私人数据</div></div><span class="tag success">已拆分</span></div>
        <div class="sync-flow"><div><strong>公开</strong><span>岗位与投递规则</span></div><span>≠</span><div><strong>私人</strong><span>简历与求职进度</span></div></div>
        <div class="sync-fields"><strong>保存方式</strong><p>登录后，个人记录按账号云端保存；简历文件和录音仅存当前浏览器。</p></div>
        <button class="btn" data-modal="privacy">查看数据与隐私说明</button>
      </section>
    </div>
  `;
}

function safeExternalUrl(value) {
  const url = String(value || "").trim();
  return /^https?:\/\//i.test(url) ? url : "";
}

function radarLinkState(job) {
  if (job.linkStatus === "verified") return { label: "官网已核验", action: "打开官方招聘", note: job.linkNote || "公司名与官方招聘域名匹配" };
  if (job.linkStatus === "corrected") return { label: "已纠正官网", action: "打开已核验官网", note: job.linkNote || "错配链接已替换为官方入口" };
  if (job.linkStatus === "source" && safeExternalUrl(job.applyUrl)) return { label: "聚合源链接", action: "打开来源链接", note: job.linkNote || "链接来自聚合源，未标记为官网已核验" };
  if (["invalid", "mismatch", "conflict", "unverified"].includes(job.linkStatus)) {
    return { label: "链接已暂停", action: "链接校验未通过", note: job.linkNote || "链接校验未通过，已禁止打开" };
  }
  return { label: "入口待补", action: "投递入口待补", note: job.linkNote || "原数据未提供投递链接" };
}

function applyLinkMeta(value) {
  if (!value) return { type: "待补入口", action: "投递入口待补" };
  try {
    const host = new URL(value).hostname.toLowerCase();
    if (host === "mp.weixin.qq.com") return { type: "招聘公告", action: "查看招聘公告" };
    if (/jobs\.feishu\.cn|mokahr\.com|hotjob\.cn|zhiye\.com|51job\.com|nowcoder\.com|career|campus/.test(host)) {
      return { type: "招聘 / 投递页", action: "查看岗位并投递" };
    }
    return { type: "招聘来源页", action: "查看招聘入口" };
  } catch {
    return { type: "招聘来源页", action: "查看招聘入口" };
  }
}

function extractKeywords(jd, fallback = []) {
  const vocabulary = ["增长策略", "数据分析", "用户研究", "SQL", "A/B 测试", "用户生命周期", "商业化", "策略产品", "跨团队协作", "会员", "订阅产品", "AI 产品", "大模型", "英文沟通", "产品规划"];
  const found = vocabulary.filter(word => jd.includes(word));
  return [...new Set([...found, ...fallback])].slice(0, 6);
}

function getGaps(job) {
  const terms = extractKeywords(job.jd, job.tags);
  const gaps = terms.filter(term => !state.profile.skills.includes(term));
  return gaps.slice(0, 3).length ? gaps.slice(0, 3) : ["补充量化结果", "强化岗位相关案例"];
}

const resumeSkillCards = [
  {
    id: "profile-fields",
    glyph: "填",
    title: "填写当前页",
    description: "根据已确认的资料填写网申字段。",
    needs: "当前招聘网页 + 已保存的个人资料",
    prompt: "请使用 $job-application-agent 操作我当前打开的招聘网页。读取已保存的个人资料和简历，填写当前页中能够明确确定的姓名、联系方式、教育经历、实习和项目字段。未明确的信息不要猜，集中列出等我补充。填完后停下，不要提交。"
  },
  {
    id: "resume-upload",
    glyph: "传",
    title: "上传并核对简历",
    description: "上传简历，核对网站自动填入的信息。",
    needs: "当前招聘网页 + 已导入的简历文件",
    prompt: "请使用 $job-application-agent 的 Browser uploads 流程操作当前招聘网页。上传我已经导入的标准简历，等待网站解析完成，核对显示的文件名以及被自动回填的字段，并修复解析时覆盖或清空的事实字段。完成后停下，不要提交。"
  },
  {
    id: "narrative-answers",
    glyph: "答",
    title: "填写开放题",
    description: "根据简历和项目经历回答网页问题。",
    needs: "当前招聘网页 + 简历与项目事实",
    prompt: "请使用 $job-application-agent 操作当前招聘网页。读取页面上的开放题，严格按照 Skill 自带的 APPLICATION_GUIDANCE，使用我简历和项目库中的真实证据生成答案并直接填入对应输入框。不得编造经历、数字、技能或公司信息。完成后列出已填内容和待确认项，不要提交。"
  },
  {
    id: "review-submit",
    glyph: "核",
    title: "核对后提交",
    description: "检查必填项和附件，只有你明确确认后才提交并记录结果。",
    needs: "已填写的招聘网页 + 你的最终确认",
    prompt: "请使用 $job-application-agent 检查当前申请页的全部必填字段、附件、事实一致性和页面声明。人口统计问题不要代答；遇到登录、验证码、法律声明、敏感信息或无法确定的问题时暂停问我。先展示最终检查结果，只有我明确确认后才能提交；看到成功页面后，把公司、岗位、日期和结果记入投递记录。"
  }
];

function resumeCompleteness() {
  const p = state.profile;
  const values = [p.name, p.phone, p.email, p.school, p.major, p.degree, p.graduation, p.summary, p.experience, state.projects?.length];
  return { complete: values.filter(Boolean).length, total: values.length };
}

function createAutofillFields(job) {
  const p = state.profile;
  const project = state.projects?.[0];
  const resumeDocument = state.resumeDocuments?.[0];
  const keywords = extractKeywords(job.jd, job.tags);
  const matchingSkills = p.skills.filter(skill => keywords.includes(skill) || job.jd.includes(skill));
  const projectText = project ? `${project.title}（${project.role}）：${project.action} ${project.result}` : "";
  const tailoredSummary = `${p.summary}${matchingSkills.length ? ` 与该岗位相关的能力包括${matchingSkills.join("、")}。` : ""}`;
  const whyApply = `我希望申请${job.company}的${job.role}岗位。我的${p.targetRole}经历与${keywords.slice(0, 2).join("、") || "岗位要求"}相关，希望用已有的${p.skills.slice(0, 2).join("、")}能力解决实际业务问题。`;
  const rawFields = [
    ["name", "姓名", p.name, "基本信息", "high"],
    ["phone", "手机号码", p.phone, "基本信息", "high"],
    ["email", "常用邮箱", p.email, "基本信息", "high"],
    ["school", "毕业院校", p.school, "教育经历", "high"],
    ["major", "专业", p.major, "教育经历", "high"],
    ["degree", "学历", p.degree, "教育经历", "high"],
    ["graduation", "毕业时间", p.graduation, "教育经历", "high"],
    ["cities", "意向城市", p.targetCity, "求职偏好", "high"],
    ["availability", "可到岗时间", p.availability, "求职偏好", "high"],
    ["skills", "技能特长", p.skills.join("、"), "能力标签", "high"],
    ["summary", "个人优势", tailoredSummary, "个人简介 + JD", "medium"],
    ["project", "项目经历", projectText, "项目库", project ? "medium" : "missing"],
    ["motivation", "为什么申请这个岗位", whyApply, "资料库 + JD", "medium"],
    ["resume", "上传简历", resumeDocument?.name || "", "简历文件", resumeDocument ? "high" : "missing"]
  ];
  return rawFields.map(([id, label, value, source, confidence]) => ({
    id,
    label,
    value: value || "",
    source,
    confidence: value ? confidence : "missing",
    selected: Boolean(value) && confidence === "high"
  }));
}

function renderResumeVault() {
  const p = state.profile;
  const completeness = resumeCompleteness();
  return `
    <section class="resume-brief">
      <div>
        <h2>资料完整度</h2>
      </div>
      <div class="resume-brief-stats">
        <div><strong>${completeness.complete}/${completeness.total}</strong><span>核心资料</span></div>
        <div><strong>${state.projects?.length || 0}</strong><span>项目素材</span></div>
        <div><strong>${state.answerBank?.length || 0}</strong><span>常用回答</span></div>
        <div><strong>${state.resumeDocuments?.length || 0}</strong><span>简历文件</span></div>
      </div>
    </section>
    <div class="vault-layout">
      <div class="stack">
        <section class="panel pad vault-section">
          <div class="vault-head"><div><h2>基本信息与求职偏好</h2></div><button class="btn small" data-modal="resume-profile">编辑</button></div>
          <dl class="fact-grid">
            <div><dt>姓名</dt><dd>${escapeHtml(p.name) || "待补充"}</dd></div>
            <div><dt>联系方式</dt><dd>${escapeHtml(p.phone) || "待补充"}<br>${escapeHtml(p.email) || ""}</dd></div>
            <div><dt>目标岗位</dt><dd>${escapeHtml(p.targetRole) || "待补充"}</dd></div>
            <div><dt>意向城市</dt><dd>${escapeHtml(p.targetCity) || "待补充"}</dd></div>
            <div><dt>到岗时间</dt><dd>${escapeHtml(p.availability) || "待补充"}</dd></div>
            <div><dt>能力标签</dt><dd>${p.skills.map(escapeHtml).join("、") || "待补充"}</dd></div>
          </dl>
        </section>
        <section class="panel pad vault-section">
          <div class="vault-head"><div><h2>教育与经历</h2></div><button class="btn small" data-modal="resume-profile">编辑</button></div>
          <div class="source-block">
            <strong>${escapeHtml(p.school) || "教育信息待补充"}</strong>
            <span>${[p.major, p.degree, p.graduation].filter(Boolean).map(escapeHtml).join(" / ")}</span>
          </div>
          <div class="source-block">
            <strong>${escapeHtml(p.internshipRole) || "核心经历"}</strong>
            <span>${escapeHtml(p.experience) || "经历描述待补充"}</span>
          </div>
        </section>
        <section class="panel pad vault-section">
          <div class="vault-head"><div><h2>项目素材库</h2></div><button class="btn small" data-modal="project">添加项目</button></div>
          <div class="vault-projects">
            ${(state.projects || []).slice(0, 3).map(project => `<article><strong>${escapeHtml(project.title)}</strong><span>${escapeHtml(project.role)}</span><p>${escapeHtml(project.result)}</p></article>`).join("") || `<div class="inline-empty">添加一个真实项目后，Skill 才会引用项目证据。</div>`}
          </div>
        </section>
      </div>
      <div class="stack">
        <section class="panel pad vault-section">
          <div class="vault-head"><div><h2>简历文件</h2><p>文件仅存当前浏览器</p></div><label class="btn small file-button">添加文件<input id="resume-document" type="file" accept=".pdf,.doc,.docx,.txt" hidden></label></div>
          <div class="document-list">
            ${(state.resumeDocuments || []).map(document => `<article class="document-row"><div class="document-mark">${escapeHtml(document.extension || "CV")}</div><div><strong>${escapeHtml(document.name)}</strong><span>${escapeHtml(document.sizeLabel)} / ${escapeHtml(document.addedAt)}</span></div><div class="document-actions"><button class="btn small ghost" data-download-document="${document.id}">下载</button><label class="btn small ghost file-button">补回文件<input type="file" accept=".pdf,.doc,.docx,.txt" data-restore-document="${document.id}" hidden></label><button class="btn small ghost danger" data-remove-document="${document.id}">删除</button></div></article>`).join("") || `<div class="inline-empty">支持 PDF、Word、文本文件。</div>`}
          </div>
          <p class="field-help">换设备或网址后，点击“补回文件”选择同名原件。</p>
        </section>
        <section class="panel pad vault-section">
          <div class="vault-head"><div><h2>常见问题答案库</h2></div><button class="btn small" data-modal="answer">添加回答</button></div>
          <div class="answer-library">
            ${(state.answerBank || []).map(answer => `<article><strong>${escapeHtml(answer.question)}</strong><p>${escapeHtml(answer.answer)}</p><button class="text-action" data-delete-answer="${answer.id}">删除</button></article>`).join("") || `<div class="inline-empty">可先添加申请动机、职业规划、优势和到岗时间。</div>`}
          </div>
        </section>
      </div>
    </div>
  `;
}

function renderResumeSkills() {
  return `
    <section class="skill-intro panel pad">
      <div><h2>网申填写助手</h2><p>复制指令到助手对话中使用。</p></div>
    </section>
    <details class="source-note copy-help"><summary>首次使用与功能说明</summary><p>请在使用的助手中安装 job-application-agent，并确认标准简历和个人资料。本站提供调用指令，操作在助手中执行。</p><p><a href="https://github.com/vaibhavarora14/job-application-agent" target="_blank" rel="noreferrer">查看开源项目</a></p></details>
    <div class="resume-skill-grid">
      ${resumeSkillCards.map(skill => `
        <article class="resume-skill-card">
          <div class="skill-glyph">${skill.glyph}</div>
          <div class="skill-card-copy">
            <h3>${skill.title}</h3>
            <p>${skill.description}</p>
            <span>${skill.needs}</span>
          </div>
          <div class="skill-card-actions">
            <details class="skill-prompt-details"><summary>查看指令</summary><pre>${escapeHtml(skill.prompt)}</pre></details>
            <button class="btn small primary" data-copy-resume-skill="${skill.id}">复制指令</button>
          </div>
        </article>
      `).join("")}
    </div>
    <p class="skill-usage-note">先打开并登录招聘网页，再使用指令。验证码、敏感信息和最终提交由你确认。</p>
  `;
}

function renderResumeDrafts() {
  const drafts = state.applicationDrafts || [];
  const active = drafts.find(item => item.id === state.activeApplicationDraft) || drafts[0];
  if (!active) {
    return `<div class="large-empty"><strong>还没有投递草稿</strong><p>选择目标岗位，根据已保存的资料生成填写草稿。</p><button class="btn primary" data-modal="autofill">新建投递草稿</button></div>`;
  }
  const job = state.jobs.find(item => item.id === active.jobId);
  const selectedCount = active.fields.filter(field => field.selected).length;
  const missingCount = active.fields.filter(field => field.confidence === "missing").length;
  return `
    <div class="draft-layout">
      <aside class="panel pad draft-sidebar">
        <div class="vault-head"><div><h2>投递草稿</h2><p>${drafts.length} 份</p></div><button class="btn small" data-modal="autofill">新增</button></div>
        <div class="draft-list">${drafts.map(draft => {
          const draftJob = state.jobs.find(item => item.id === draft.jobId);
          return `<button class="draft-list-item ${draft.id === active.id ? "active" : ""}" data-draft-id="${draft.id}"><strong>${escapeHtml(draftJob?.company || "未知公司")}</strong><span>${escapeHtml(draftJob?.role || "未知岗位")}</span><small>${escapeHtml(draft.platform)}</small></button>`;
        }).join("")}</div>
      </aside>
      <section class="panel pad draft-editor">
        <div class="draft-title"><div><span>${escapeHtml(active.platform)}</span><h2>${escapeHtml(job?.company || "未知公司")} / ${escapeHtml(job?.role || "未知岗位")}</h2><p>已选 ${selectedCount} 项，${missingCount} 项待补充。勾选后才会进入填写包。</p></div><span class="review-state ${active.reviewed ? "done" : ""}">${active.reviewed ? "已核对" : "待核对"}</span></div>
        <div class="mapping-list">
          ${active.fields.map(field => `<article class="mapping-row ${field.confidence}">
            <input class="mapping-check" type="checkbox" data-draft-select="${field.id}" ${field.selected ? "checked" : ""} aria-label="选择${escapeHtml(field.label)}">
            <div class="mapping-copy"><div class="mapping-meta"><label for="draft-${field.id}">${escapeHtml(field.label)}</label><span>${field.confidence === "high" ? "直接引用" : field.confidence === "medium" ? "需要核对" : "缺少资料"}</span></div>
            ${field.value.length > 80 ? `<textarea id="draft-${field.id}" data-draft-field="${field.id}" rows="3">${escapeHtml(field.value)}</textarea>` : `<input id="draft-${field.id}" data-draft-field="${field.id}" value="${escapeHtml(field.value)}" placeholder="请补充后再勾选">`}
            <small>来源：${escapeHtml(field.source)}</small></div>
          </article>`).join("")}
        </div>
        <div class="draft-actions"><div><button class="btn" data-action="copy-fill-package">复制填写包</button><button class="btn primary" data-action="review-draft">${active.reviewed ? "重新确认" : "完成核对"}</button></div></div>
      </section>
    </div>
  `;
}

function renderResume() {
  if (!hasPrivateAccess()) return renderPrivacyGate("resume", "OfferFlow 简历智填");
  const currentTab = state.resumeView || "vault";
  return viewWrap("resume", `
    <div class="page-heading">
      <div><h1>简历资料与网申填写</h1></div>
      <button class="btn primary" data-modal="autofill">新建投递草稿</button>
    </div>
    <nav class="resume-tabs" aria-label="简历与投递模块">
      ${[["vault", "我的资料"], ["skills", "投递 Skills"], ["drafts", `投递草稿 ${state.applicationDrafts?.length || 0}`]].map(([id, label]) => `<button class="resume-tab ${currentTab === id ? "active" : ""}" data-resume-tab="${id}">${label}</button>`).join("")}
    </nav>
    ${currentTab === "skills" ? renderResumeSkills() : currentTab === "drafts" ? renderResumeDrafts() : renderResumeVault()}
  `);
}

function synchronizeProcessRecordsFromApplications() {
  state.applications.forEach(app => synchronizeApplicationProcessState(app));
}

function interviewRecordsForFilters(filters = state.interviewFilters || initialState.interviewFilters) {
  return (state.interviewRecords || [])
    .filter(record => !record.superseded)
    .filter(record => filters.stage === "all" || stageForProcessRecord(record.round) === filters.stage)
    .filter(record => {
      if (filters.status === "scheduled") return record.status === "scheduled";
      if (filters.status === "completed") return record.status === "completed";
      if (filters.status === "recording") return Boolean(record.recording);
      return true;
    })
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

function applicationForInterviewRecord(record) {
  if (!record) return null;
  return state.applications.find(app => app.id === record.applicationId || app.interviewRecordId === record.id) || null;
}

function renderInterview() {
  if (!hasPrivateAccess()) return renderPrivacyGate("interview", "OfferFlow 笔面手记");
  const activeTab = state.interviewView || "records";
  const filters = state.interviewFilters || initialState.interviewFilters;
  const allRecords = (state.interviewRecords || []).filter(record => !record.superseded);
  const stageRecords = filters.stage === "all" ? allRecords : allRecords.filter(record => stageForProcessRecord(record.round) === filters.stage);
  const visibleRecords = interviewRecordsForFilters(filters);
  const completed = stageRecords.filter(record => record.status === "completed").length;
  const scheduled = stageRecords.filter(record => record.status === "scheduled").length;
  const withRecording = stageRecords.filter(record => record.recording).length;
  return viewWrap("interview", `
    <div class="page-heading interview-heading">
      <div><h1>笔面准备与复盘</h1></div>
      <div class="heading-actions"><button class="btn" data-action="export-interviews">导出笔面记录</button><button class="btn primary" data-modal="interview-record">添加笔面试</button></div>
    </div>
    <div class="interview-metrics" aria-label="按状态筛选笔面记录">
      <button class="${filters.status === "all" ? "active" : ""}" data-interview-status-filter="all"><span>${filters.stage === "all" ? "全部环节" : "当前环节"}</span><strong>${stageRecords.length}</strong></button>
      <button class="${filters.status === "scheduled" ? "active" : ""}" data-interview-status-filter="scheduled"><span>待进行</span><strong>${scheduled}</strong></button>
      <button class="${filters.status === "completed" ? "active" : ""}" data-interview-status-filter="completed"><span>已完成</span><strong>${completed}</strong><small>包括待结果和已出结果</small></button>
      <button class="${filters.status === "recording" ? "active" : ""}" data-interview-status-filter="recording"><span>已存录音</span><strong>${withRecording}</strong></button>
    </div>
    <div class="practice-tabs interview-tabs" role="tablist" aria-label="笔面试模块">
      ${[["records", `环节记录 ${visibleRecords.length}`], ["review", "复盘记录"], ["prep", "备战清单"]].map(([id, label]) => `<button class="practice-tab ${activeTab === id ? "active" : ""}" data-interview-tab="${id}" role="tab">${label}</button>`).join("")}
    </div>
    ${activeTab === "prep" ? "" : `<div class="interview-stage-filters" aria-label="按环节筛选笔面记录">
      ${INTERVIEW_STAGE_FILTERS.map(([value, label]) => {
        const count = value === "all" ? allRecords.length : allRecords.filter(record => stageForProcessRecord(record.round) === value).length;
        return `<button class="${filters.stage === value ? "active" : ""}" data-interview-stage-filter="${value}"><span>${label}</span><strong>${count}</strong></button>`;
      }).join("")}
    </div>`}
    ${activeTab === "review" ? renderInterviewReview() : activeTab === "prep" ? renderInterviewPrep() : renderInterviewRecords()}
  `);
}

function selectedInterviewRecord() {
  const records = interviewRecordsForFilters();
  return records.find(record => record.id === state.selectedInterviewRecord) || records[0];
}

function formatInterviewDate(value) {
  if (!value) return "时间待补充";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

function interviewStatusLabel(record) {
  if (record.status === "scheduled") return "待进行";
  if (record.result === "passed") return "已通过";
  if (record.result === "rejected") return "未通过";
  if (record.result === "offer") return "Offer";
  return "已完成，待结果";
}

function renderInterviewRecords() {
  const record = selectedInterviewRecord();
  const records = interviewRecordsForFilters();
  const filters = state.interviewFilters || initialState.interviewFilters;
  if (!record) return `<div class="large-empty"><strong>这个筛选下没有记录</strong><div class="workspace-empty-actions"><button class="btn" data-action="clear-interview-filters">查看全部记录</button><button class="btn primary" data-modal="interview-record">添加笔面试</button></div></div>`;
  const application = applicationForInterviewRecord(record);
  return `
    <div class="interview-record-layout">
      <section class="panel interview-record-list">
        <div class="interview-record-list-head"><div><strong>筛选结果</strong><span>${records.length} 条记录</span></div>${filters.stage !== "all" || filters.status !== "all" ? `<button data-action="clear-interview-filters">清除筛选</button>` : ""}</div>
        ${records.map(item => `
          <button class="interview-record-row ${record.id === item.id ? "active" : ""}" data-interview-record="${item.id}">
            <span class="record-date">${escapeHtml(formatInterviewDate(item.date))}</span>
            <span class="record-title"><strong>${escapeHtml(item.company)}</strong><em>${escapeHtml(interviewStatusLabel(item))}</em></span>
            <span class="record-meta">${escapeHtml(item.role)} · ${escapeHtml(item.round)}</span>
            <span class="record-flags">${INTERVIEW_STAGES.includes(stageForProcessRecord(item.round)) ? `${item.recording ? "有录音" : "无录音"} · ${item.questions.length} 道问题` : `${item.questions.length} 条复盘记录`}</span>
          </button>
        `).join("")}
      </section>
      <section class="panel pad interview-record-detail">
        <div class="record-detail-head"><div><span>${escapeHtml(record.round)}</span><h2>${escapeHtml(record.company)} · ${escapeHtml(record.role)}</h2><p>${escapeHtml(formatInterviewDate(record.date))}${record.duration ? ` · ${escapeHtml(record.duration)}` : ""}</p></div><span class="tag ${record.status === "scheduled" ? "warning" : "success"}">${escapeHtml(interviewStatusLabel(record))}</span></div>
        <div class="record-status-editor">
          <div><strong>环节状态</strong><span>关联投递进度同步更新。</span></div>
          <select data-record-result="${record.id}" aria-label="${escapeHtml(record.company)}${escapeHtml(record.round)}状态">
            ${PROCESS_RESULT_OPTIONS.map(([value, label]) => `<option value="${value}" ${record.result === value ? "selected" : ""}>${label}</option>`).join("")}
          </select>
        </div>
        ${renderInterviewRecording(record)}
        <div class="record-summary-grid">
          <div><span>本次问题</span><strong>${record.questions.length}</strong><p>${record.questions[0] ? escapeHtml(record.questions[0]) : "结束后把遇到的问题整理在复盘记录里"}</p></div>
          <div><span>下一步</span><p>${escapeHtml(record.nextActions || "补充下一步行动")}</p></div>
        </div>
        <div class="review-preview"><span>最近复盘</span><p>${escapeHtml(record.improvements || record.assistantReview || "暂无复盘记录。")}</p></div>
        <div class="detail-actions">${application ? `<button class="btn" data-open-application="${application.id}">查看对应投递</button>` : ""}<button class="btn" data-interview-tab="prep">查看准备材料</button><button class="btn primary" data-action="review-record" data-record-id="${record.id}">${record.status === "scheduled" ? "预先记录问题" : "进入复盘"}</button></div>
      </section>
    </div>
  `;
}

function renderInterviewRecording(record) {
  if (!INTERVIEW_STAGES.includes(stageForProcessRecord(record.round)) && !record.recording) return "";
  if (!record.recording) {
    return `<div class="recording-box empty"><div><strong>添加面试录音</strong><p>录音仅存当前浏览器，请保留原文件。</p></div><label class="btn" for="audio-${record.id}">选择录音</label><input id="audio-${record.id}" type="file" accept="audio/*,.m4a,.mp3,.wav,.aac,.mp4" data-audio-upload="${record.id}" hidden></div>`;
  }
  return `<div class="recording-box"><div class="recording-meta"><span class="recording-icon">音</span><div><strong>${escapeHtml(record.recording.name)}</strong><p>${Math.max(1, Math.round((record.recording.size || 0) / 1024 / 1024 * 10) / 10)} MB · 本机保存</p></div></div><audio controls preload="metadata" data-recording-audio="${record.id}"></audio><div class="recording-actions"><button class="btn small" data-action="download-recording" data-record-id="${record.id}">下载备份</button><label class="btn small" for="audio-${record.id}">替换</label><input id="audio-${record.id}" type="file" accept="audio/*,.m4a,.mp3,.wav,.aac,.mp4" data-audio-upload="${record.id}" hidden><button class="btn small ghost danger" data-action="delete-recording" data-record-id="${record.id}">删除</button></div></div>`;
}

function renderInterviewReview() {
  const record = selectedInterviewRecord();
  const records = interviewRecordsForFilters();
  if (!record) return `<div class="large-empty"><strong>这个筛选下没有可复盘记录</strong><p>清除筛选后可以查看全部笔面档案。</p><button class="btn primary" data-action="clear-interview-filters">查看全部记录</button></div>`;
  return `
    <div class="review-workbench">
      <aside class="panel pad review-sidebar">
        <div class="panel-title">选择面试</div>
        <div class="review-record-picker">${records.map(item => `<button class="${record.id === item.id ? "active" : ""}" data-interview-record="${item.id}" data-open-review="true"><strong>${escapeHtml(item.company)}</strong><span>${escapeHtml(item.role)} · ${escapeHtml(item.round)} · ${escapeHtml(interviewStatusLabel(item))}</span></button>`).join("")}</div>
        <div class="review-privacy"><strong>录音说明</strong><p>需要助手复盘时，将录音和问题发到对话中。</p></div>
      </aside>
      <form class="panel pad review-form" id="interview-review-form">
        <input type="hidden" name="id" value="${record.id}">
        <div class="review-form-head"><div><span>${escapeHtml(record.company)} · ${escapeHtml(record.round)}</span><h2>${escapeHtml(record.role)}</h2></div><button class="btn" type="button" data-action="copy-review-package" data-record-id="${record.id}">复制给助手复盘</button></div>
        ${renderInterviewRecording(record)}
        <div class="field full"><label for="review-questions">面试问题</label><textarea id="review-questions" name="questions" rows="6" placeholder="每行记录一个你抽象出来的问题">${escapeHtml(record.questions.join("\n"))}</textarea></div>
        <div class="field full"><label for="review-answers">回答与现场记录</label><textarea id="review-answers" name="answerNotes" rows="5" placeholder="记录自己的回答思路、面试官追问和现场反应">${escapeHtml(record.answerNotes)}</textarea></div>
        <div class="review-two-cols">
          <div class="field"><label for="review-strengths">做得好的</label><textarea id="review-strengths" name="strengths" placeholder="哪些表达和案例值得保留">${escapeHtml(record.strengths)}</textarea></div>
          <div class="field"><label for="review-improvements">需要改进</label><textarea id="review-improvements" name="improvements" placeholder="下一次应该具体改变什么">${escapeHtml(record.improvements)}</textarea></div>
        </div>
        <div class="field full assistant-review-field"><label for="assistant-review">助手复盘结论</label><textarea id="assistant-review" name="assistantReview" rows="5" placeholder="粘贴助手提供的复盘结论、回答建议和共性问题">${escapeHtml(record.assistantReview)}</textarea></div>
        <div class="field full"><label for="review-actions">下一步行动</label><textarea id="review-actions" name="nextActions" rows="3" placeholder="例如：重录自我介绍、补充量化结果、准备一道追问">${escapeHtml(record.nextActions)}</textarea></div>
        <div class="review-result-row"><label for="review-result">环节结果</label><select id="review-result" name="result">${PROCESS_RESULT_OPTIONS.map(([value, label]) => `<option value="${value}" ${record.result === value ? "selected" : ""}>${label}</option>`).join("")}</select><button class="btn primary" type="submit">保存复盘</button></div>
      </form>
    </div>
  `;
}

function renderInterviewPrep() {
  const prep = state.interviewPrep || initialState.interviewPrep;
  return `
    <div class="prep-workbench">
      <form class="panel pad intro-editor" id="interview-prep-form">
        <div class="prep-editor-head"><div><div class="panel-title">自我介绍</div></div><button class="btn primary" type="submit">保存介绍</button></div>
        <div class="field full"><label for="intro-60">一分钟版本</label><textarea id="intro-60" name="intro60" rows="7" placeholder="定位 + 最相关经历 + 核心能力 + 求职动机">${escapeHtml(prep.intro60)}</textarea></div>
        <div class="field full"><label for="intro-180">三分钟版本</label><textarea id="intro-180" name="intro180" rows="9" placeholder="在一分钟版本基础上展开两段重点经历">${escapeHtml(prep.intro180)}</textarea></div>
        <div class="field full"><label for="intro-reminders">表达提醒</label><textarea id="intro-reminders" name="reminders" rows="3" placeholder="只记录你最容易忘记的三件事">${escapeHtml(prep.reminders)}</textarea></div>
      </form>
      <section class="panel pad project-intro-library">
        <div class="prep-editor-head"><div><div class="panel-title">项目介绍</div></div><button class="btn" data-modal="project">添加项目介绍</button></div>
        <div class="project-intro-list">${state.projects.map(project => `
          <article class="project-intro-card">
            <div class="project-intro-head"><div><span>${escapeHtml(project.role)}</span><h3>${escapeHtml(project.title)}</h3></div><span class="tag">STAR</span></div>
            <p>${escapeHtml(project.intro || `${project.situation} ${project.action} ${project.result}`)}</p>
            <div class="project-proof"><span><strong>你的行动</strong>${escapeHtml(project.action)}</span><span><strong>结果证据</strong>${escapeHtml(project.result)}</span></div>
          </article>
        `).join("") || `<div class="empty-state">还没有项目介绍。先添加最常被问到的一段经历。</div>`}</div>
      </section>
    </div>
  `;
}

function renderPipeline() {
  if (!hasPrivateAccess()) return renderPrivacyGate("pipeline", "OfferFlow 投递记录");
  const filters = state.pipelineFilters || initialState.pipelineFilters;
  const query = filters.query.trim().toLowerCase();
  const rows = state.applications
    .filter(app => {
      const job = state.jobs.find(item => item.id === app.jobId);
      if (!job) return false;
      const processRecord = currentProcessRecord(app);
      const haystack = `${job.company} ${job.role} ${job.location} ${applicationStageLabel(app.status)} ${processRecord ? processResultLabel(processRecord) : ""} ${app.next} ${app.notes}`.toLowerCase();
      const scopeMatches = filters.scope === "archived" ? Boolean(app.archivedAt) : filters.scope === "all" ? true : !app.archivedAt;
      const companyMatches = filters.company === "全部公司" || job.company === filters.company;
      const processMatches = filters.processResult === "全部环节状态"
        || (filters.processResult === "none" ? !processRecord : processRecord?.result === filters.processResult);
      return scopeMatches && companyMatches && processMatches && (!query || haystack.includes(query)) && applicationMatchesPipelineStatus(app.status, filters.status);
    })
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  const companyOptions = [...new Set(state.applications.map(app => state.jobs.find(job => job.id === app.jobId)?.company).filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-CN"));
  const activeFilterCount = [filters.company !== "全部公司", filters.status !== "全部进度", filters.processResult !== "全部环节状态"].filter(Boolean).length;
  const unarchivedCount = state.applications.filter(app => !app.archivedAt).length;
  const archivedCount = state.applications.filter(app => app.archivedAt).length;
  return viewWrap("pipeline", `
    <div class="page-heading pipeline-heading">
      <div><h1>投递记录</h1><p>点击公司或岗位名称编辑详情，阶段与日期可直接修改。</p></div>
      <div class="heading-actions"><button class="btn" data-action="export-applications">导出投递表</button><button class="btn primary" data-modal="quick-add">记录投递</button></div>
    </div>
    <div class="pipeline-controls">
    <div class="pipeline-scope-tabs" aria-label="投递记录范围">
      <button class="${filters.scope === "active" ? "active" : ""}" data-pipeline-scope="active">未归档 ${unarchivedCount}</button>
      <button class="${filters.scope === "archived" ? "active" : ""}" data-pipeline-scope="archived">已归档 ${archivedCount}</button>
      <button class="${filters.scope === "all" ? "active" : ""}" data-pipeline-scope="all">全部 ${state.applications.length}</button>
    </div>
    <div class="pipeline-toolbar">
      <input id="pipeline-search" type="search" value="${escapeHtml(filters.query)}" placeholder="搜索公司、岗位、城市或下一步" aria-label="搜索求职进度">
      <details class="pipeline-filter-menu">
        <summary>筛选${activeFilterCount ? `<em>${activeFilterCount}</em>` : ""}</summary>
        <div class="pipeline-filter-popover">
          <label><span>公司</span><select id="pipeline-company-filter" aria-label="按公司筛选"><option value="全部公司">全部公司</option>${companyOptions.map(company => `<option value="${escapeHtml(company)}" ${filters.company === company ? "selected" : ""}>${escapeHtml(company)}</option>`).join("")}</select></label>
          <label><span>当前阶段</span><select id="pipeline-status-filter" aria-label="筛选求职进度"><option value="全部进度">全部进度</option><option value="assessment_group" ${filters.status === "assessment_group" ? "selected" : ""}>测评 / 笔试</option><option value="interview_group" ${filters.status === "interview_group" ? "selected" : ""}>面试阶段</option>${APPLICATION_STAGES.map(([value, label]) => `<option value="${value}" ${filters.status === value ? "selected" : ""}>${label}</option>`).join("")}</select></label>
          <label><span>环节状态</span><select id="pipeline-process-filter" aria-label="按环节状态筛选"><option value="全部环节状态">全部环节状态</option>${PROCESS_RESULT_OPTIONS.map(([value, label]) => `<option value="${value}" ${filters.processResult === value ? "selected" : ""}>${label}</option>`).join("")}<option value="none" ${filters.processResult === "none" ? "selected" : ""}>尚未关联笔面记录</option></select></label>
          ${activeFilterCount ? `<button data-action="clear-pipeline-filters">清除筛选</button>` : ""}
        </div>
      </details>
    </div>
    </div>
    <div class="pipeline-list-meta"><span id="pipeline-result-count">显示 ${rows.length} 条 · 修改后自动保存</span></div>
    <div class="panel pipeline-table-wrap">
      <table class="pipeline-table">
        <thead><tr><th>公司</th><th>岗位</th><th>当前阶段</th><th>环节状态</th><th>投递日期</th><th>查看状态</th><th>提醒日期</th><th>下一步</th><th>笔面记录</th><th>更新时间</th><th></th></tr></thead>
        <tbody>${rows.map(app => {
          const job = state.jobs.find(item => item.id === app.jobId);
          const interview = currentProcessRecord(app);
          const progressUrl = safeExternalUrl(app.progressUrl);
          const radarLinked = radarJobs.some(item => item.id === job.id);
          const radarCompanyMatch = radarJobs.find(item => companyKeysMatch(item.company, job.company));
          return `<tr data-application-row="${app.id}">
            <td><div class="table-company"><button class="record-edit-target record-company" data-edit-application="${app.id}" aria-label="编辑${escapeHtml(job.company)}的投递信息" title="点击编辑投递信息">${escapeHtml(job.company)}</button></div></td>
            <td><button class="record-edit-target record-position" data-edit-application="${app.id}" aria-label="编辑${escapeHtml(job.company)}的岗位与地点" title="${escapeHtml(job.role)} · 点击编辑"><strong class="table-role">${escapeHtml(job.role)}</strong><span class="table-sub table-job-location">${escapeHtml(job.location || "地点待确认")}</span></button></td>
            <td><select class="table-select stage-${app.status}" data-app-status="${app.id}" aria-label="${escapeHtml(job.company)}当前进度">${APPLICATION_STAGES.map(([value, label]) => `<option value="${value}" ${app.status === value ? "selected" : ""}>${label}</option>`).join("")}</select></td>
            <td>${renderProcessStateCell(app, interview, job)}</td>
            <td><input class="table-input date" type="date" value="${escapeHtml(app.appliedAt || "")}" data-app-field="appliedAt" data-app-id="${app.id}" aria-label="${escapeHtml(job.company)}投递日期"></td>
            <td><div class="progress-link-cell"><input class="table-input url" type="url" value="${escapeHtml(app.progressUrl || "")}" data-app-field="progressUrl" data-app-id="${app.id}" aria-label="${escapeHtml(job.company)}查看状态网址" placeholder="https://">${progressUrl ? `<a href="${escapeHtml(progressUrl)}" target="_blank" rel="noopener noreferrer">查看状态</a>` : `<span>未填写</span>`}</div></td>
            <td><input class="table-input date" type="date" value="${escapeHtml(app.followUpAt || "")}" data-app-field="followUpAt" data-app-id="${app.id}" aria-label="${escapeHtml(job.company)}提醒日期"></td>
            <td><input class="table-input next" value="${escapeHtml(app.next || "")}" data-app-field="next" data-app-id="${app.id}" aria-label="${escapeHtml(job.company)}下一步" placeholder="填写明确行动"></td>
            <td>${interview ? `<button class="table-link-button" data-open-interview="${interview.id}">${escapeHtml(interview.round)} · ${escapeHtml(processResultLabel(interview))} →</button>` : `<span class="table-muted">尚未关联</span>`}</td>
            <td><span class="table-updated">${escapeHtml(formatApplicationUpdate(app))}</span></td>
            <td><div class="table-row-actions">${radarLinked ? `<button data-open-radar-job="${job.id}">查看岗位</button>` : radarCompanyMatch ? `<button data-open-radar-company="${escapeHtml(job.company)}">查找岗位</button>` : ""}${app.archivedAt ? `<button data-restore-app="${app.id}">恢复</button><button class="danger" data-remove-app="${app.id}">删除</button>` : `<button data-archive-app="${app.id}">归档</button>`}</div></td>
          </tr>`;
        }).join("") || `<tr><td colspan="11"><div class="empty-state">${filters.scope === "archived" ? "还没有归档记录。结束或暂时不跟进的岗位可以归档到这里。" : "还没有投递记录。可以从岗位详情一键记录，也可以在这里登记其他网站上的投递。"}</div></td></tr>`}</tbody>
      </table>
    </div>
  `);
}

function updateApplicationDetails(applicationId, data) {
  if (!hasPrivateAccess()) throw new Error("请先登录后再修改投递记录。");
  const application = state.applications.find(item => item.id === applicationId);
  const job = application && state.jobs.find(item => item.id === application.jobId);
  if (!job) throw new Error("这条投递记录已不存在，请关闭后重新查看。");
  const fields = Object.fromEntries(["company", "role", "location", "applyUrl", "deadline", "notes"].map(key => [key, String(data[key] || "").trim()]));
  if (!fields.company || !fields.role) throw new Error("公司和具体岗位名称不能为空。");
  if (fields.applyUrl && !safeExternalUrl(fields.applyUrl)) throw new Error("岗位链接请填写完整的 http:// 或 https:// 网址。");
  Object.assign(job, { company: fields.company, role: fields.role, location: fields.location, applyUrl: fields.applyUrl, deadline: fields.deadline });
  application.notes = fields.notes;
  application.updatedAt = new Date().toISOString();
  application.syncStatus = application.feishuRecordId ? "pending_push" : "local_only";
  state.interviewRecords
    .filter(record => record.applicationId === application.id || record.id === application.interviewRecordId)
    .forEach(record => { record.company = job.company; record.role = job.role; });
}

function renderProcessStateCell(app, record, job) {
  if (!record && !PROCESS_STAGES.includes(app.status)) {
    const label = app.status === "applied" ? "等待筛选" : isClosedApplicationStatus(app.status) ? "流程已结束" : "推进中";
    return `<span class="process-state-static">${escapeHtml(label)}</span>`;
  }
  const result = record?.result || "pending";
  return `<select class="table-select process-result-${result}" data-process-result="${app.id}" aria-label="${escapeHtml(job.company)}环节状态">
    ${PROCESS_RESULT_OPTIONS.map(([value, label]) => `<option value="${value}" ${result === value ? "selected" : ""}>${label}</option>`).join("")}
  </select>`;
}

function formatApplicationUpdate(app) {
  if (!app.updatedAt) return app.date || "未更新";
  const date = new Date(app.updatedAt);
  if (!Number.isFinite(date.getTime())) return app.date || "未更新";
  return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function filterPipelineRowsInPlace() {
  const query = (state.pipelineFilters?.query || "").trim().toLowerCase();
  let visible = 0;
  document.querySelectorAll("[data-application-row]").forEach(row => {
    const match = !query || row.textContent.toLowerCase().includes(query);
    row.hidden = !match;
    if (match) visible += 1;
  });
  const count = document.querySelector("#pipeline-result-count");
  if (count) count.textContent = `显示 ${visible} 条 · 修改后自动保存`;
  saveState();
}

function processRoundForStage(status) {
  return {
    assessment: "测评",
    written: "笔试",
    interview_1: "一面",
    interview_2: "二面",
    interview_3: "三面",
    interview_more: "加面 / 终面"
  }[status] || "";
}

function stageForProcessRecord(round) {
  const value = String(round || "");
  if (/测评|在线测试|性格测试/.test(value)) return "assessment";
  if (/笔试/.test(value)) return "written";
  if (/四|五|六|七|八|九|十|加面|终面/.test(value)) return "interview_more";
  if (/三面/.test(value)) return "interview_3";
  if (/二面/.test(value)) return "interview_2";
  return "interview_1";
}

function applicationNextAction(status) {
  return {
    applied: "查看招聘系统进展或等待筛选结果",
    assessment: "确认测评截止时间并完成在线测评",
    written: "确认笔试时间、题型和提交方式",
    interview_1: "确认一面时间，准备自我介绍和项目介绍",
    interview_2: "复盘一面，准备二面业务追问",
    interview_3: "复盘二面，准备三面核心判断题",
    interview_more: "确认加面或终面安排，准备关键决策问题",
    salary: "整理期望薪资、可接受范围和到岗时间",
    offer: "核对 Offer 条款并确认回复时间",
    rejected_resume: "记录简历未通过，检查岗位匹配与表达",
    rejected_assessment: "复盘测评或笔试失分点",
    rejected_interview: "完成面试复盘，记录可改进项",
    rejected_final: "复盘完整流程，沉淀最终轮反馈",
    withdrawn: "记录放弃原因"
  }[status] || "";
}

function currentProcessRecord(app) {
  return (state.interviewRecords || []).find(record => !record.superseded && record.id === app.interviewRecordId)
    || (state.interviewRecords || [])
      .filter(record => !record.superseded && record.applicationId === app.id)
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0]
    || null;
}

function ensureProcessRecord(app) {
  const job = state.jobs.find(item => item.id === app.jobId);
  const desiredRound = processRoundForStage(app.status);
  if (!job || !desiredRound) return null;
  let record = (state.interviewRecords || []).find(item => item.applicationId === app.id && stageForProcessRecord(item.round) === app.status);
  if (!record) {
    record = (state.interviewRecords || []).find(item => !item.applicationId && item.company === job.company && item.role === job.role && stageForProcessRecord(item.round) === app.status);
  }
  if (!record) {
    record = {
      id: crypto.randomUUID(),
      applicationId: app.id,
      company: job.company,
      role: job.role,
      round: desiredRound,
      date: "",
      status: "scheduled",
      result: "pending",
      duration: "",
      recording: null,
      questions: [],
      answerNotes: "",
      strengths: "",
      improvements: "",
      assistantReview: "",
      nextActions: app.next || applicationNextAction(app.status)
    };
    state.interviewRecords.unshift(record);
  }
  record.applicationId = app.id;
  record.superseded = false;
  record.supersededAt = "";
  record.supersededBy = "";
  app.interviewRecordId = record.id;
  return record;
}

function synchronizeApplicationProcessState(app) {
  const linkedRecords = (state.interviewRecords || []).filter(record => record.applicationId === app.id || record.id === app.interviewRecordId);
  if (!PROCESS_STAGES.includes(app.status)) {
    linkedRecords
      .filter(record => record.status === "scheduled" && record.result === "pending")
      .forEach(record => {
        record.superseded = true;
        record.supersededAt = new Date().toISOString();
        record.supersededBy = "";
      });
    app.interviewRecordId = "";
    return null;
  }

  const record = ensureProcessRecord(app);
  linkedRecords
    .filter(item => item.id !== record.id && item.status === "scheduled" && item.result === "pending" && stageForProcessRecord(item.round) !== app.status)
    .forEach(item => {
      item.superseded = true;
      item.supersededAt = new Date().toISOString();
      item.supersededBy = record.id;
    });
  return record;
}

function rejectionStatusForRecord(record) {
  const stage = stageForProcessRecord(record.round);
  if (["assessment", "written"].includes(stage)) return "rejected_assessment";
  if (stage === "interview_more") return "rejected_final";
  return "rejected_interview";
}

function processResultLabel(record) {
  return PROCESS_RESULT_OPTIONS.find(([value]) => value === record?.result)?.[1] || "待进行";
}

function processNextAction(record) {
  if (record.result === "pending") return `确认${record.round || "环节"}时间并按时参加`;
  if (record.result === "waiting") return `${record.round || "本轮"}已完成，等待结果`;
  if (record.result === "passed") return `${record.round || "本轮"}已通过，等待下一轮安排`;
  if (record.result === "rejected") return `复盘${record.round || "本轮"}未通过原因`;
  if (record.result === "offer") return "核对 Offer 条款并确认回复时间";
  return "";
}

function updateProcessResult(record, result) {
  record.result = result;
  record.status = result === "pending" ? "scheduled" : "completed";
  record.nextActions = processNextAction(record);
  syncApplicationFromRecord(record);
}

function syncApplicationFromRecord(record) {
  const app = state.applications.find(item => item.id === record.applicationId);
  if (!app) return;
  const recordStage = stageForProcessRecord(record.round);
  if (record.result === "offer") app.status = "offer";
  else if (record.result === "rejected") app.status = rejectionStatusForRecord(record);
  else {
    const currentIndex = FUNNEL_STAGES.findIndex(([status]) => status === app.status);
    const recordIndex = FUNNEL_STAGES.findIndex(([status]) => status === recordStage);
    if (isClosedApplicationStatus(app.status) || (currentIndex >= 0 && currentIndex <= recordIndex)) app.status = recordStage;
  }
  app.interviewRecordId = record.id;
  app.next = record.nextActions || applicationNextAction(app.status);
  app.updatedAt = new Date().toISOString();
  app.syncStatus = app.feishuRecordId ? "pending_push" : "local_only";
  synchronizeApplicationProcessState(app);
}

function renderModal() {
  if (!state.modal) return "";
  if (!hasPrivateAccess() && !["account", "privacy", "mailbox", "job-refresh-info"].includes(state.modal)) state.modal = "account";
  if (state.modal === "job-refresh-info") {
    return modalShell("管理员抓取", `
      <div class="account-setup">
        <span class="account-mark" aria-hidden="true">管</span>
        <h3>仅仓库管理员可以运行</h3>
        <p>没有 OfferFlow 仓库写入权限的用户无法触发抓取，也不会修改岗位数据。</p>
        <div class="account-callout"><strong>普通用户无需操作</strong><span>岗位每天会自动更新两次，回到岗位页点击“检查新增”即可查看。</span></div>
        <div class="form-actions"><button class="btn" data-action="close-modal">返回工作台</button><a class="btn primary" href="${JOB_REFRESH_WORKFLOW_URL}" target="_blank" rel="noopener noreferrer">我是管理员，继续 ↗</a></div>
      </div>
    `);
  }
  if (state.modal === "mailbox") {
    const emailDomain = String(cloudUser?.email || state.profile.email || "").split("@")[1]?.toLowerCase() || "";
    const providers = [...MAILBOX_PROVIDERS].sort((a, b) => Number(b.domains.includes(emailDomain)) - Number(a.domains.includes(emailDomain)));
    return modalShell("打开邮箱", `
      <div class="mailbox-picker">
        <p class="mailbox-intro">选择邮箱服务，将在新标签页打开收件箱。</p>
        <div class="mailbox-grid">
          ${providers.map(provider => {
            const preferred = provider.domains.includes(emailDomain);
            return `<a class="mailbox-option ${preferred ? "preferred" : ""}" href="${provider.url}" target="_blank" rel="noreferrer"><span><strong>${provider.name}</strong><small>${preferred ? "当前账号邮箱" : provider.description}</small></span><em>打开</em></a>`;
          }).join("")}
        </div>
      </div>
    `);
  }
  if (state.modal === "account") {
    if (!cloudConfigured) {
      return modalShell("登录与云同步", `
        <div class="account-setup">
          <span class="account-mark" aria-hidden="true">云</span>
          <h3>登录服务暂不可用</h3>
          <p>本站尚未配置登录与云同步服务，暂时无法保存个人记录。</p>
          <div class="account-callout"><strong>仍可使用</strong><span>公开岗位浏览与题目练习。</span></div>
          <button class="btn primary" data-action="close-modal">关闭</button>
        </div>
      `);
    }
    if (cloudUser) {
      return modalShell("账号与数据", `
        <div class="account-overview">
          ${import.meta.env.DEV && hasPrivateAccess() ? `<div class="account-callout"><strong>旧版资料迁移（仅本机开发版）</strong><span>${escapeHtml(legacyMigrationNote || "先检查旧记录，再迁移原附件。不会覆盖云端，不删除旧文件。仅限原资料所有者操作。")}</span><button class="btn" data-action="check-legacy">检查旧版记录</button><button class="btn" data-action="export-legacy">下载旧版数据备份</button><button class="btn" data-action="migrate-legacy-files">迁移原附件</button></div>` : ""}
          <div class="account-callout"><strong>${cloudStatusLabel()}</strong>${["conflict", "error", "cache-full"].includes(cloudSyncStatus) ? "<span>请先备份未同步的修改，再重试保存或载入云端版本。</span>" : ""}<button class="btn" data-action="reload-cloud">重新载入云端</button>${hasPrivateAccess() ? `<button class="btn" data-action="retry-cloud">重试保存</button>` : ""}</div>
          ${workspaceSync.recovery ? `<div class="account-callout"><strong>发现未同步记录</strong><span>请下载恢复副本并核对，确认后可导入。</span><button class="btn" data-action="export-recovery">下载恢复副本</button></div>` : ""}
          <div class="account-identity"><span class="account-mark success" aria-hidden="true">已</span><div><h3>${escapeHtml(cloudUser.email || "当前账号")}</h3><p>个人记录按账号同步；简历文件与录音仅存当前浏览器。</p></div></div>
          <section class="data-management" aria-labelledby="data-management-title">
            <div><h3 id="data-management-title">数据管理</h3><p>可导出个人记录备份；简历文件与录音需单独下载。</p></div>
            <div class="data-actions"><button class="btn" data-action="export-workspace">下载数据备份</button><label class="btn" for="workspace-import">导入备份</label><input id="workspace-import" type="file" accept="application/json,.json" hidden><button class="btn danger" data-modal="confirm-clear-data">清空我的数据</button></div>
          </section>
          <button class="text-action account-privacy-link" data-modal="privacy">查看数据与隐私说明</button>
          <button class="text-action account-signout" data-action="cloud-signout">退出登录</button>
        </div>
      `);
    }
    return modalShell("注册与登录", `
      <form id="cloud-login-form" class="account-login-form">
        <div class="account-setup compact">
          <span class="account-mark" aria-hidden="true">云</span>
          <h3>邮箱验证登录</h3>
          <p>通过邮件链接登录，无需密码。首次使用将自动创建账号。</p>
          <p>访客可浏览岗位和练习题目；登录可保存求职与练习记录。</p>
        </div>
        <div class="field"><label for="cloud-email">邮箱地址</label><input id="cloud-email" name="email" type="email" autocomplete="email" required placeholder="name@example.com"></div>
        <div class="login-data-summary">
          <strong>数据保存与访问</strong>
          <p>个人记录按账号保存至云端，普通用户之间数据隔离；网站维护者具备云端管理权限。</p><p>简历文件与录音仅保存在当前浏览器，不随账号跨设备同步。</p>
          <button class="text-action" type="button" data-modal="privacy">查看完整说明</button>
        </div>
        <label class="consent-check" for="privacy-consent"><input id="privacy-consent" name="privacyConsent" type="checkbox" value="accepted" required><span>我已阅读并同意《数据与隐私说明》</span></label>
        ${captchaSiteKey ? `<div id="login-captcha"></div><p class="captcha-status" role="status">同意《数据与隐私说明》后加载安全验证。</p><button class="text-action" type="button" data-action="retry-captcha">重试验证</button>` : ""}
        <p class="privacy-error" role="alert" aria-live="polite"></p>
        <div class="form-actions"><button class="btn" type="button" data-action="close-modal">取消</button><button class="btn primary" type="submit">发送登录邮件</button></div>
      </form>
    `);
  }
  if (state.modal === "privacy") {
    return modalShell("数据与隐私说明", `
      <div class="privacy-policy">
        <div class="privacy-policy-intro">
          <strong>服务与数据处理</strong>
          <p>OfferFlow 为个人维护的公开测试服务。本说明介绍账号数据的收集、用途、访问权限及管理方式。</p>
        </div>
        <section>
          <h3>收集与保存的内容</h3>
          <p>登录邮箱，以及主动填写或生成的简历资料、岗位收藏、投递进度、待办状态、练习记录、项目素材和笔面文字记录。</p>
        </section>
        <section>
          <h3>数据用途与存储</h3>
          <p>个人记录保存在维护者管理的 Supabase 云端（澳大利亚悉尼区域），用于账号登录、记录同步及工作区恢复。简历原文件和录音仅保存在当前浏览器，不上传云端。</p>
          <p>邮箱验证邮件由 Resend 发送。启用人机验证时，勾选本说明后将加载 Cloudflare Turnstile，由其处理 IP 地址及浏览器验证信号以拦截恶意请求；邮箱与验证结果发送给 Supabase 完成登录。</p>
        </section>
        <section>
          <h3>数据访问权限</h3>
          <p>不同账号的个人记录相互隔离，普通用户无法访问其他账号的数据。维护者因管理云端服务，具备后台数据管理权限；个人记录不会作为公开岗位库或共享题库展示。</p>
        </section>
        <section>
          <h3>数据保留与管理</h3>
          <p>无需登录即可浏览公开岗位和练习题目。登录后可在“账号与数据”中导出记录或清空个人数据；清空数据不会注销登录账号。</p>
          <p>个人记录无固定自动删除期限，将保留至主动清空或维护者处理删除申请。本地附件保留至在应用中删除或清除本站浏览器存储。删除前请保存所需备份；记录备份不包含简历文件与录音。</p>
          <p>反馈、数据删除或账号注销申请，请联系 <a href="mailto:lic0202@163.com">lic0202@163.com</a>。注销申请请从注册邮箱发送，维护者核实后处理；不要在邮件中发送密码、验证码、登录链接或完整简历。</p>
        </section>
        <section>
          <h3>信息填写范围</h3>
          <p>仅填写求职管理所需信息，请勿提供身份证号、银行卡号、账号密码或健康信息等无关敏感资料。</p>
        </section>
        <p class="privacy-policy-note">当前为公开测试版本。云服务的系统日志与备份可能有独立保留周期；清空应用数据不等于立即清除服务商的所有备份。</p>
        <div class="form-actions"><button class="btn primary" type="button" data-modal="account">${cloudUser ? "返回账号设置" : "返回登录"}</button></div>
      </div>
    `);
  }
  if (state.modal === "confirm-clear-data") {
    return modalShell("清空我的数据", `
      <form id="clear-data-form" class="clear-data-form">
        <div class="danger-summary">
          <strong>此操作无法撤销</strong>
          <p>将删除简历资料、项目库、岗位收藏、投递进度、面试记录、刷题记录，以及当前浏览器保存的简历文件和面试录音。</p>
        </div>
        <div class="clear-counts"><span><strong>${state.applications.length}</strong> 条投递</span><span><strong>${state.interviewRecords.length}</strong> 场面试</span><span><strong>${state.resumeDocuments.length}</strong> 份简历文件</span></div>
        <div class="field"><label for="clear-confirmation">请输入“清空我的数据”进行确认</label><input id="clear-confirmation" name="confirmation" autocomplete="off" required></div>
        <p class="field-help">此操作不会删除登录账号。</p>
        <p class="privacy-error" role="alert" aria-live="polite"></p>
        <div class="form-actions"><button class="btn" type="button" data-action="close-modal">取消</button><button class="btn danger solid" type="submit">确认永久清空</button></div>
      </form>
    `);
  }
  if (state.modal === "confirm-import-data") {
    if (!pendingWorkspaceImport) return modalShell("导入数据备份", `<div class="home-inline-empty"><strong>没有可导入的备份</strong><span>请返回账号设置重新选择文件。</span></div><div class="form-actions"><button class="btn primary" type="button" data-modal="account">返回</button></div>`);
    const importedDate = parseCalendarDate(pendingWorkspaceImport.exportedAt);
    return modalShell("导入数据备份", `
      <form id="import-data-form" class="clear-data-form">
        <div class="danger-summary neutral">
          <strong>将用备份覆盖当前结构化资料</strong>
          <p>导入后，当前的档案、投递、面试、刷题和项目数据会被备份内容替换。简历原文件与面试录音不会从备份中恢复。</p>
        </div>
        <div class="clear-counts"><span><strong>${pendingWorkspaceImport.applications}</strong> 条投递</span><span><strong>${pendingWorkspaceImport.interviews}</strong> 场面试</span><span><strong>${pendingWorkspaceImport.projects}</strong> 个项目</span></div>
        <p class="field-help">备份时间：${importedDate ? importedDate.toLocaleString("zh-CN") : "未记录"}</p>
        <p class="privacy-error" role="alert" aria-live="polite"></p>
        <div class="form-actions"><button class="btn" type="button" data-modal="account">取消</button><button class="btn danger solid" type="submit">确认覆盖并恢复</button></div>
      </form>
    `);
  }
  if (state.modal === "profile") {
    return modalShell("编辑基础资料", `
      <form id="profile-form">
        <div class="form-grid">
          <div class="field"><label for="profile-name">称呼</label><input id="profile-name" name="name" value="${escapeHtml(state.profile.name)}" required></div>
          <div class="field"><label for="profile-role">目标岗位</label><input id="profile-role" name="targetRole" value="${escapeHtml(state.profile.targetRole)}" required></div>
          <div class="field"><label for="profile-city">目标城市</label><input id="profile-city" name="targetCity" value="${escapeHtml(state.profile.targetCity)}"></div>
          <div class="field"><label for="profile-years">经验</label><input id="profile-years" name="years" value="${escapeHtml(state.profile.years)}"></div>
          <div class="field full"><label for="profile-skills">核心能力</label><input id="profile-skills" name="skills" value="${state.profile.skills.map(escapeHtml).join("、")}"><span class="field-help">用顿号或逗号分隔，用于岗位偏好匹配。</span></div>
        </div>
        <div class="form-actions"><button class="btn" type="button" data-action="close-modal">取消</button><button class="btn primary" type="submit">保存资料</button></div>
      </form>
    `);
  }
  if (state.modal === "company-diagnosis") {
    const company = state.selectedDiagnosisCompany;
    const record = state.companyDiagnoses[company] || {};
    if (!company) return "";
    return modalShell("填写诊断结果", `
      <form id="company-diagnosis-form">
        <input type="hidden" name="company" value="${escapeHtml(company)}">
        <div class="diagnosis-form-intro"><strong>${escapeHtml(company)}</strong><span>把你从 Codex 或其他地方得到的完整诊断结论直接粘贴在下面。</span></div>
        <div class="form-grid">
          <div class="field full"><label for="diagnosis-conclusion">诊断结论</label><textarea id="diagnosis-conclusion" name="conclusion" rows="14" required placeholder="直接粘贴完整诊断结果……">${escapeHtml(record.conclusion || "")}</textarea></div>
        </div>
        <div class="form-actions"><button class="btn" type="button" data-action="close-modal">取消</button><button class="btn primary" type="submit">保存诊断结果</button></div>
      </form>
    `);
  }
  if (state.modal === "radar-jd") {
    const job = radarJobs.find(item => item.id === state.selectedRadarJob);
    if (!job) return "";
    const existing = state.jobs.find(item => item.id === job.id && item.jdSource === "pasted");
    return modalShell("补充具体 JD", `
      <form id="radar-jd-form">
        <input type="hidden" name="jobId" value="${escapeHtml(job.id)}">
        <div class="form-grid">
          <div class="field"><label for="radar-jd-company">公司</label><input id="radar-jd-company" value="${displayJobText(job.company)}" disabled></div>
          <div class="field"><label for="radar-jd-role">具体岗位</label><input id="radar-jd-role" name="role" value="${displayJobText(existing?.role || preferredRoles(job)[0] || job.role)}" required></div>
          <div class="field full"><label for="radar-jd-content">完整职位描述</label><textarea id="radar-jd-content" name="jd" rows="12" required placeholder="从企业招聘页面复制岗位职责、任职要求和加分项">${escapeHtml(existing?.jd || "")}</textarea><span class="field-help">只有具体岗位的职位描述会用于分析；招聘批次和岗位方向不会被当成完整 JD。</span></div>
        </div>
        <div class="form-actions"><button class="btn" type="button" data-action="close-modal">取消</button><button class="btn primary" type="submit">保存并分析</button></div>
      </form>
    `);
  }
  if (state.modal === "edit-application") {
    const application = state.applications.find(item => item.id === state.editingApplicationId);
    const job = application && state.jobs.find(item => item.id === application.jobId);
    if (!job) return modalShell("编辑投递信息", `<p>这条投递记录已不存在，请关闭后重新查看。</p>`);
    return modalShell("编辑投递信息", `
      <form id="application-edit-form">
        <input type="hidden" name="applicationId" value="${escapeHtml(application.id)}">
        <p class="field-help">仅修改个人投递信息，保留进度与复盘。</p>
        <div class="form-grid">
          <div class="field"><label for="edit-company">公司</label><input id="edit-company" name="company" value="${escapeHtml(job.company)}" required></div>
          <div class="field"><label for="edit-role">具体岗位名称</label><input id="edit-role" name="role" value="${escapeHtml(job.role)}" required placeholder="例如：AI 产品经理（校招）"></div>
          <div class="field"><label for="edit-location">工作地点</label><input id="edit-location" name="location" value="${escapeHtml(job.location || "")}" placeholder="例如：北京 / 上海"></div>
          <div class="field"><label for="edit-deadline">岗位截止时间</label><input id="edit-deadline" name="deadline" value="${escapeHtml(job.deadline || "")}" placeholder="例如：2026-10-31，或招满即止"></div>
          <div class="field full"><label for="edit-job-url">岗位详情链接</label><input id="edit-job-url" name="applyUrl" type="url" value="${escapeHtml(job.applyUrl || "")}" placeholder="https://"><span class="field-help">投递状态查询网址仍可在列表的「查看状态」栏单独修改。</span></div>
          <div class="field full"><label for="edit-application-notes">投递备注</label><textarea id="edit-application-notes" name="notes" rows="4" placeholder="例如：部门、岗位编号、内推情况等">${escapeHtml(application.notes || "")}</textarea></div>
        </div>
        <p class="privacy-error" role="alert"></p>
        <div class="form-actions"><button class="btn" type="button" data-action="close-modal">取消</button><button class="btn primary" type="submit">保存修改</button></div>
      </form>
    `);
  }
  if (state.modal === "quick-add") {
    return modalShell("记录一次投递", `
      <form id="job-form">
        <div class="form-grid">
          <div class="field"><label for="new-company">公司</label><input id="new-company" name="company" required placeholder="填写公司名称"></div>
          <div class="field"><label for="new-role">岗位方向</label><input id="new-role" name="role" required placeholder="例如：产品类、运营类"></div>
          <div class="field"><label for="new-location">城市</label><input id="new-location" name="location" value="上海"></div>
          <div class="field"><label for="new-industry">行业</label><input id="new-industry" name="industry" placeholder="例如：互联网科技"></div>
          <div class="field"><label for="new-cohort">届别</label><input id="new-cohort" name="cohort" value="2027届"></div>
          <div class="field"><label for="new-batch">批次</label><select id="new-batch" name="batch"><option>正式批</option><option>提前批</option><option>实习</option><option>补录</option><option>春招</option></select></div>
          <div class="field"><label for="new-deadline">截止时间</label><input id="new-deadline" name="deadline" type="date"></div>
          <div class="field"><label for="new-status">当前进度</label><select id="new-status" name="status">${APPLICATION_STAGES.map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}</select></div>
          <div class="field"><label for="new-reminder">提醒日期</label><input id="new-reminder" name="reminderAt" type="date"><span class="field-help">提前 14 天显示在「求职概览」。</span></div>
          <div class="field full"><label for="new-url">招聘系统或进展网址</label><input id="new-url" name="applyUrl" type="url" placeholder="https://"><span class="field-help">填写可以查看投递状态的招聘系统页面。</span></div>
        </div>
        <div class="form-actions"><button class="btn" type="button" data-action="close-modal">取消</button><button class="btn primary" type="submit">保存投递记录</button></div>
      </form>
    `);
  }
  if (state.modal === "interview-record") {
    return modalShell("添加笔面试记录", `
      <form id="interview-record-form">
        <div class="form-grid">
          <div class="field full"><label for="interview-application">关联求职进度</label><select id="interview-application" name="applicationId"><option value="">暂不关联</option>${state.applications.map(app => { const job = state.jobs.find(item => item.id === app.jobId); return job ? `<option value="${app.id}">${escapeHtml(job.company)} · ${escapeHtml(job.role)}</option>` : ""; }).join("")}</select><span class="field-help">从求职进度进入测评、笔试或面试阶段时，会自动建立对应档案。</span></div>
          <div class="field"><label for="interview-company">公司</label><input id="interview-company" name="company" required placeholder="填写公司名称"></div>
          <div class="field"><label for="interview-role">岗位</label><input id="interview-role" name="role" required placeholder="例如：产品经理"></div>
          <div class="field"><label for="interview-round">环节</label><input id="interview-round" name="round" required placeholder="例如：测评、笔试、业务一面"></div>
          <div class="field"><label for="interview-date">时间</label><input id="interview-date" name="date" type="datetime-local" required></div>
          <div class="field"><label for="interview-result">环节状态</label><select id="interview-result" name="result">${PROCESS_RESULT_OPTIONS.map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}</select></div>
          <div class="field"><label for="interview-duration">时长</label><input id="interview-duration" name="duration" placeholder="例如：45 分钟"></div>
          <div class="field full"><label for="interview-next">下一步</label><textarea id="interview-next" name="nextActions" rows="3" placeholder="面试前准备事项，或面试后的改进行动"></textarea></div>
        </div>
        <div class="form-actions"><button class="btn" type="button" data-action="close-modal">取消</button><button class="btn primary" type="submit">保存笔面试</button></div>
      </form>
    `);
  }
  if (state.modal === "resume-profile") {
    const p = state.profile;
    return modalShell("编辑简历资料", `
      <form id="resume-profile-form">
        <div class="form-grid">
          <div class="field"><label for="resume-profile-name">姓名</label><input id="resume-profile-name" name="name" value="${escapeHtml(p.name)}" required></div>
          <div class="field"><label for="resume-profile-phone">手机号码</label><input id="resume-profile-phone" name="phone" value="${escapeHtml(p.phone)}"></div>
          <div class="field"><label for="resume-profile-email">常用邮箱</label><input id="resume-profile-email" name="email" type="email" value="${escapeHtml(p.email)}"></div>
          <div class="field"><label for="resume-profile-role">目标岗位</label><input id="resume-profile-role" name="targetRole" value="${escapeHtml(p.targetRole)}"></div>
          <div class="field"><label for="resume-profile-city">意向城市</label><input id="resume-profile-city" name="targetCity" value="${escapeHtml(p.targetCity)}"></div>
          <div class="field"><label for="resume-profile-availability">可到岗时间</label><input id="resume-profile-availability" name="availability" value="${escapeHtml(p.availability)}"></div>
          <div class="field"><label for="resume-profile-school">毕业院校</label><input id="resume-profile-school" name="school" value="${escapeHtml(p.school)}"></div>
          <div class="field"><label for="resume-profile-major">专业</label><input id="resume-profile-major" name="major" value="${escapeHtml(p.major)}"></div>
          <div class="field"><label for="resume-profile-degree">学历</label><input id="resume-profile-degree" name="degree" value="${escapeHtml(p.degree)}"></div>
          <div class="field"><label for="resume-profile-graduation">毕业时间</label><input id="resume-profile-graduation" name="graduation" type="month" value="${escapeHtml(p.graduation)}"></div>
          <div class="field full"><label for="resume-profile-skills">能力标签</label><input id="resume-profile-skills" name="skills" value="${p.skills.map(escapeHtml).join("、")}"><span class="field-help">用顿号或逗号分隔，用于 JD 关键词比对。</span></div>
          <div class="field full"><label for="resume-profile-summary">个人简介</label><textarea id="resume-profile-summary" name="summary" rows="4">${escapeHtml(p.summary)}</textarea></div>
          <div class="field full"><label for="resume-profile-experience">实习或核心经历</label><textarea id="resume-profile-experience" name="experience" rows="5">${escapeHtml(p.experience)}</textarea></div>
        </div>
        <div class="form-actions"><button class="btn" type="button" data-action="close-modal">取消</button><button class="btn primary" type="submit">保存资料</button></div>
      </form>
    `);
  }
  if (state.modal === "answer") {
    return modalShell("添加常见问题回答", `
      <form id="answer-form">
        <div class="form-grid">
          <div class="field full"><label for="answer-question">问题</label><input id="answer-question" name="question" required placeholder="例如：为什么申请这个岗位？"></div>
          <div class="field full"><label for="answer-content">事实版本</label><textarea id="answer-content" name="answer" rows="6" required placeholder="先写不针对具体公司的真实事实，投递时再按 JD 改写。"></textarea></div>
          <div class="field full"><label for="answer-tags">标签</label><input id="answer-tags" name="tags" placeholder="求职动机、产品经理"></div>
        </div>
        <div class="form-actions"><button class="btn" type="button" data-action="close-modal">取消</button><button class="btn primary" type="submit">保存回答</button></div>
      </form>
    `);
  }
  if (state.modal === "autofill") {
    if (!state.jobs.length) {
      return modalShell("新建投递草稿", `
        <div class="account-setup compact">
          <span class="account-mark" aria-hidden="true">JD</span>
          <h3>还没有可用的具体岗位</h3>
          <p>先在岗位搜索中选择一个机会并补充具体 JD，或者在求职进度中记录一次投递。</p>
          <button class="btn primary" data-action="close-modal">关闭</button>
        </div>
      `);
    }
    const selectedJobId = state.selectedJob || state.jdContext.jobId || state.jobs[0]?.id;
    return modalShell("新建投递草稿", `
      <form id="autofill-form">
        <div class="form-grid">
          <div class="field full"><label for="autofill-job">目标岗位</label><select id="autofill-job" name="jobId" required>${state.jobs.map(job => `<option value="${job.id}" ${job.id === selectedJobId ? "selected" : ""}>${escapeHtml(job.company)} / ${escapeHtml(job.role)}</option>`).join("")}</select></div>
          <div class="field full"><label for="autofill-platform">网申平台</label><select id="autofill-platform" name="platform"><option>企业招聘官网</option><option>牛客网</option><option>北森招聘系统</option><option>Workday</option><option>Greenhouse</option><option>其他平台</option></select></div>
          <div class="autofill-notice field full"><strong>生成后先核对</strong><span>高可信字段默认勾选，改写内容和缺失信息不会直接使用。</span></div>
        </div>
        <div class="form-actions"><button class="btn" type="button" data-action="close-modal">取消</button><button class="btn primary" type="submit">生成填写内容</button></div>
      </form>
    `);
  }
  if (state.modal === "project") {
    return modalShell("添加项目介绍", `
      <form id="project-form">
        <div class="form-grid">
          <div class="field"><label for="project-title">项目名称</label><input id="project-title" name="title" required></div>
          <div class="field"><label for="project-role">你的角色</label><input id="project-role" name="role" required></div>
          <div class="field full"><label for="project-intro">面试介绍版本</label><textarea id="project-intro" name="intro" required placeholder="用 60-90 秒讲清项目价值、你的职责、关键行动和结果。"></textarea></div>
          <div class="field full"><label for="project-situation">情境</label><textarea id="project-situation" name="situation" required></textarea></div>
          <div class="field full"><label for="project-task">任务</label><textarea id="project-task" name="task" required></textarea></div>
          <div class="field full"><label for="project-action">行动</label><textarea id="project-action" name="action" required></textarea></div>
          <div class="field full"><label for="project-result">结果</label><textarea id="project-result" name="result" required></textarea></div>
        </div>
        <div class="form-actions"><button class="btn" type="button" data-action="close-modal">取消</button><button class="btn primary" type="submit">保存项目</button></div>
      </form>
    `);
  }
  return "";
}

function modalShell(title, body) {
  return `<div class="modal-backdrop" data-action="backdrop"><div class="modal" role="dialog" aria-modal="true" aria-label="${title}"><div class="modal-head"><h2>${title}</h2><button class="close-btn" data-action="close-modal" aria-label="关闭">×</button></div><div class="modal-body">${body}</div></div></div>`;
}

document.addEventListener("click", (event) => {
  const privateSelector = "[data-toggle-radar-save],[data-hide-radar-job],[data-analyze-radar],[data-diagnose-company],[data-review-company],[data-open-application],[data-open-company-applications],[data-download-document],[data-remove-document],[data-delete-answer],[data-copy-resume-skill]";
  const clickedAction = event.target.closest("[data-action]")?.dataset.action;
  if (clickedAction === "retry-captcha") {
    if (document.querySelector("#privacy-consent")?.checked && !loginRequest.state.busy) loginCaptcha.mount(document.querySelector("#login-captcha"));
    return;
  }
  const publicActions = new Set(["toggle-menu", "close-modal", "backdrop", "refresh-radar", "clear-radar-filters", "continue-radar", "clear-new-batch", "exit-practice", "previous-question", "next-question", "submit-practice", "review-answers", "retry-session-wrong", "cloud-signout", "reload-cloud"]);
  if (!hasPrivateAccess() && (event.target.closest(privateSelector) || (clickedAction && !publicActions.has(clickedAction)))) {
    event.preventDefault();
    requirePrivateAccess();
    return;
  }
  const agendaView = event.target.closest("[data-agenda-view]");
  if (agendaView) {
    homeAgendaView = agendaView.dataset.agendaView === "completed" ? "completed" : "pending";
    render();
    return;
  }
  const homeRoute = event.target.closest("[data-home-route]");
  if (homeRoute) {
    const route = homeRoute.dataset.homeRoute;
    if (route === "jobs") {
      const hasSavedJobs = (state.radarActivity?.savedJobIds || []).some(id => radarJobs.some(job => job.id === id));
      state.activeView = "jobs";
      state.jobView = "radar";
      state.jobFilters = { ...state.jobFilters, query: "", inbox: hasSavedJobs ? "已收藏" : "全部岗位" };
      state.selectedRadarJob = "";
    }
    if (route === "practice") {
      state.activeView = "practice";
      state.practiceSession = null;
      state.practiceView = state.wrongQuestionIds.length ? "wrongbook" : "overview";
    }
    if (route === "resume") {
      state.activeView = "resume";
      state.resumeView = (state.applicationDrafts || []).some(draft => !draft.reviewed) ? "drafts" : "vault";
    }
    if (route === "interview") {
      const records = (state.interviewRecords || []).filter(record => !record.superseded);
      const hasScheduled = records.some(record => record.status === "scheduled");
      const needsReview = records.some(record => record.status === "completed" && !record.improvements && !record.assistantReview);
      state.activeView = "interview";
      state.interviewView = hasScheduled ? "records" : needsReview ? "review" : "records";
      state.interviewFilters = { stage: "all", status: hasScheduled ? "scheduled" : needsReview ? "completed" : "all" };
      state.selectedInterviewRecord = interviewRecordsForFilters()[0]?.id || "";
    }
    state.mobileOpen = false;
    saveState();
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  const homeStage = event.target.closest("[data-home-stage]");
  if (homeStage) {
    const stage = homeStage.dataset.homeStage;
    const status = stage === "all" ? "全部进度" : stage === "assessment" ? "assessment_group" : stage === "interview" ? "interview_group" : stage;
    state.activeView = "pipeline";
    state.mobileOpen = false;
    state.pipelineFilters = { query: "", company: "全部公司", status, processResult: "全部环节状态", scope: "active" };
    saveState();
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  const viewButton = event.target.closest("[data-view]");
  if (viewButton) {
    state.activeView = viewButton.dataset.view;
    state.mobileOpen = false;
    saveState();
    render();
    requestAnimationFrame(() => window.scrollTo({ top: 0 }));
    return;
  }

  const practiceTab = event.target.closest("[data-practice-tab]");
  if (practiceTab) {
    state.practiceSession = null;
    state.practiceView = practiceTab.dataset.practiceTab;
    saveState();
    render();
    return;
  }

  const resumeTab = event.target.closest("[data-resume-tab]");
  if (resumeTab) {
    state.resumeView = resumeTab.dataset.resumeTab;
    saveState();
    render();
    return;
  }

  const resumeSkillCopy = event.target.closest("[data-copy-resume-skill]");
  if (resumeSkillCopy) {
    const skill = resumeSkillCards.find(item => item.id === resumeSkillCopy.dataset.copyResumeSkill);
    if (skill) {
      if (!navigator.clipboard?.writeText) {
        showToast("复制失败，请展开内容后手动复制");
        return;
      }
      navigator.clipboard.writeText(skill.prompt)
        .then(() => showToast("“" + skill.title + "”已复制"))
        .catch(() => showToast("复制失败，请展开内容后手动复制"));
    }
    return;
  }

  const draftButton = event.target.closest("[data-draft-id]");
  if (draftButton) {
    state.activeApplicationDraft = draftButton.dataset.draftId;
    saveState();
    render();
    return;
  }

  const answerDelete = event.target.closest("[data-delete-answer]");
  if (answerDelete) {
    if (window.confirm("确认删除这条常用回答吗？")) {
      state.answerBank = state.answerBank.filter(answer => answer.id !== answerDelete.dataset.deleteAnswer);
      saveState("常用回答已删除");
      render();
    }
    return;
  }

  const documentDownload = event.target.closest("[data-download-document]");
  if (documentDownload) {
    const epoch = authEpoch;
    const documentMeta = state.resumeDocuments.find(item => item.id === documentDownload.dataset.downloadDocument);
    if (!documentMeta) return;
    getResumeFile(documentMeta.id).then(blob => {
      assertSession(epoch);
      if (!blob) throw new Error("missing");
      const url = URL.createObjectURL(blob);
      const link = Object.assign(document.createElement("a"), { href: url, download: documentMeta.name });
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }).catch(() => showToast("文件未找到或读取失败，可用这条记录的“补回文件”恢复原件"));
    return;
  }

  const documentRemove = event.target.closest("[data-remove-document]");
  if (documentRemove) {
    const epoch = authEpoch;
    if (window.confirm("确认从当前浏览器删除这份简历文件吗？")) {
      const id = documentRemove.dataset.removeDocument;
      removeResumeFile(id).then(() => {
        assertSession(epoch);
        state.resumeDocuments = state.resumeDocuments.filter(item => item.id !== id);
        saveState("简历文件已从当前浏览器删除");
        render();
      }).catch(() => showToast("文件删除失败，请稍后重试"));
    }
    return;
  }

  const paperButton = event.target.closest("[data-start-paper]");
  if (paperButton) {
    const paper = availablePracticePapers().find(item => item.id === paperButton.dataset.startPaper);
    if (paper) {
      const questionIds = paper.questionLimit
        ? sampleQuestionIds(paper.questionIds.map(questionById).filter(Boolean), paper.questionLimit)
        : paper.questionIds;
      startPractice(paper.title, questionIds, "paper");
    }
    return;
  }

  const categoryButton = event.target.closest("[data-start-category]");
  if (categoryButton) {
    const categoryId = categoryButton.dataset.startCategory;
    if (categoryId === "mixed") {
      const mixed = PRACTICE_CATEGORIES.flatMap(category => sampleQuestionIds(questionBank().filter(question => question.category === category.id), 2));
      startPractice("五类能力基线测试", mixed, "baseline");
    } else {
      const category = categoryById(categoryId);
      const ids = sampleQuestionIds(questionBank().filter(question => question.category === categoryId), 10);
      startPractice(`${category?.name || "专项"}训练`, ids, "category");
    }
    return;
  }

  const wrongBookButton = event.target.closest("[data-start-wrongbook]");
  if (wrongBookButton) {
    startPractice("错题集中复习", state.wrongQuestionIds, "wrongbook");
    return;
  }

  const masteredWrongButton = event.target.closest("[data-master-wrong]");
  if (masteredWrongButton) {
    const questionId = masteredWrongButton.dataset.masterWrong;
    state.wrongQuestionIds = state.wrongQuestionIds.filter(id => id !== questionId);
    saveState("已从错题本移除，原练习记录仍保留");
    render();
    return;
  }

  const singleButton = event.target.closest("[data-start-single]");
  if (singleButton) {
    startPractice("错题单题复习", [singleButton.dataset.startSingle], "wrongbook");
    return;
  }

  const indexButton = event.target.closest("[data-question-index]");
  if (indexButton && state.practiceSession) {
    state.practiceSession.index = Number(indexButton.dataset.questionIndex);
    saveState();
    render();
    return;
  }

  const interviewTab = event.target.closest("[data-interview-tab]");
  if (interviewTab) {
    state.interviewView = interviewTab.dataset.interviewTab;
    saveState();
    render();
    return;
  }

  const interviewStatusFilter = event.target.closest("[data-interview-status-filter]");
  if (interviewStatusFilter) {
    state.activeView = "interview";
    state.interviewView = "records";
    state.interviewFilters.status = interviewStatusFilter.dataset.interviewStatusFilter;
    state.selectedInterviewRecord = interviewRecordsForFilters()[0]?.id || "";
    saveState();
    render();
    return;
  }

  const interviewStageFilter = event.target.closest("[data-interview-stage-filter]");
  if (interviewStageFilter) {
    state.interviewFilters.stage = interviewStageFilter.dataset.interviewStageFilter;
    state.selectedInterviewRecord = interviewRecordsForFilters()[0]?.id || "";
    saveState();
    render();
    return;
  }

  const clearInterviewFilters = event.target.closest('[data-action="clear-interview-filters"]');
  if (clearInterviewFilters) {
    state.interviewFilters = { stage: "all", status: "all" };
    state.selectedInterviewRecord = interviewRecordsForFilters()[0]?.id || "";
    saveState();
    render();
    return;
  }

  const interviewRecord = event.target.closest("[data-interview-record]");
  if (interviewRecord) {
    state.selectedInterviewRecord = interviewRecord.dataset.interviewRecord;
    if (interviewRecord.dataset.openReview) state.interviewView = "review";
    saveState();
    render();
    return;
  }

  const openInterview = event.target.closest("[data-open-interview]");
  if (openInterview) {
    const record = state.interviewRecords.find(item => item.id === openInterview.dataset.openInterview);
    state.activeView = "interview";
    state.interviewView = "records";
    state.selectedInterviewRecord = openInterview.dataset.openInterview;
    state.interviewFilters = { stage: record ? stageForProcessRecord(record.round) : "all", status: "all" };
    saveState();
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  const jobTab = event.target.closest("[data-job-tab]");
  if (jobTab) {
    state.jobView = jobTab.dataset.jobTab;
    saveState();
    render();
    return;
  }

  const openPipelineFromRadar = event.target.closest("[data-open-pipeline-from-radar]");
  if (openPipelineFromRadar) {
    state.activeView = "pipeline";
    state.mobileOpen = false;
    state.pipelineFilters = { ...state.pipelineFilters, query: "", status: "全部进度", scope: "all" };
    saveState();
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  const inboxFilter = event.target.closest("[data-inbox-filter]");
  if (inboxFilter) {
    state.jobFilters.inbox = inboxFilter.dataset.inboxFilter;
    state.selectedRadarJob = "";
    saveState();
    render();
    return;
  }

  const radarSave = event.target.closest("[data-toggle-radar-save]");
  if (radarSave) {
    const jobId = radarSave.dataset.toggleRadarSave;
    const isSaved = state.radarActivity.savedJobIds.includes(jobId);
    state.radarActivity.savedJobIds = isSaved
      ? state.radarActivity.savedJobIds.filter(id => id !== jobId)
      : [...state.radarActivity.savedJobIds, jobId];
    if (isSaved && state.jobFilters.inbox === "已收藏") state.selectedRadarJob = "";
    saveState(isSaved ? "已取消收藏" : "岗位已收藏");
    render();
    return;
  }

  const radarHide = event.target.closest("[data-hide-radar-job]");
  if (radarHide) {
    const jobId = radarHide.dataset.hideRadarJob;
    const isHidden = state.radarActivity.hiddenJobIds.includes(jobId);
    state.radarActivity.hiddenJobIds = isHidden
      ? state.radarActivity.hiddenJobIds.filter(id => id !== jobId)
      : [...state.radarActivity.hiddenJobIds, jobId];
    state.selectedRadarJob = "";
    saveState(isHidden ? "岗位已恢复显示" : "已隐藏这个岗位");
    render();
    return;
  }

  const radarAnalyze = event.target.closest("[data-analyze-radar]");
  if (radarAnalyze) {
    state.selectedRadarJob = radarAnalyze.dataset.analyzeRadar;
    state.modal = "radar-jd";
    render();
    setTimeout(() => document.querySelector("#radar-jd-role")?.focus(), 30);
    return;
  }

  const radarOpen = event.target.closest("[data-radar-open]");
  if (radarOpen) {
    const job = radarJobs.find(item => item.id === radarOpen.dataset.radarOpen);
    if (job) {
      state.selectedRadarJob = job.id;
      markRadarViewed(job.id);
      document.querySelectorAll("[data-radar-shell]").forEach(element => element.classList.toggle("active", element.dataset.radarShell === job.id));
      updateRadarActivityUi(job);
      saveState();
    }
    return;
  }

  const radarJob = event.target.closest("[data-radar-job]");
  if (radarJob) {
    selectRadarJob(radarJob.dataset.radarJob);
    return;
  }

  const openApplication = event.target.closest("[data-open-application]");
  if (openApplication) {
    const application = state.applications.find(item => item.id === openApplication.dataset.openApplication);
    if (application) {
      state.activeView = "pipeline";
      state.mobileOpen = false;
      state.pipelineFilters = { query: "", company: "全部公司", status: "全部进度", processResult: "全部环节状态", scope: application.archivedAt ? "archived" : "active" };
      saveState();
      render();
      requestAnimationFrame(() => {
        const row = document.querySelector(`[data-application-row="${application.id}"]`);
        row?.classList.add("linked-focus");
        row?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      });
    }
    return;
  }

  const openCompanyApplications = event.target.closest("[data-open-company-applications]");
  if (openCompanyApplications) {
    state.activeView = "pipeline";
    state.mobileOpen = false;
    state.pipelineFilters = { query: openCompanyApplications.dataset.openCompanyApplications, status: "全部进度", scope: "all" };
    saveState();
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  const openRadarJob = event.target.closest("[data-open-radar-job]");
  if (openRadarJob) {
    const linkedJob = radarJobs.find(item => item.id === openRadarJob.dataset.openRadarJob);
    if (linkedJob) {
      state.activeView = "jobs";
      state.mobileOpen = false;
      state.jobView = "radar";
      state.selectedRadarJob = linkedJob.id;
      state.jobFilters = { ...state.jobFilters, query: linkedJob.company, roleCategory: "全部方向", industry: linkedJob.industry, batch: "全部批次", linkMode: "全部线索", inbox: "全部岗位" };
      markRadarViewed(linkedJob.id);
      saveState();
      render();
      requestAnimationFrame(scrollSelectedRadarIntoView);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    return;
  }

  const openRadarCompany = event.target.closest("[data-open-radar-company]");
  if (openRadarCompany) {
    const company = openRadarCompany.dataset.openRadarCompany;
    const linkedJob = radarJobs.find(item => companyKeysMatch(item.company, company));
    if (linkedJob) {
      state.activeView = "jobs";
      state.mobileOpen = false;
      state.jobView = "radar";
      state.selectedRadarJob = linkedJob.id;
      state.jobFilters = { ...state.jobFilters, query: company, roleCategory: "全部方向", industry: "全部行业", batch: "全部批次", linkMode: "全部线索", inbox: "全部岗位" };
      markRadarViewed(linkedJob.id);
      saveState();
      render();
      requestAnimationFrame(scrollSelectedRadarIntoView);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    return;
  }

  const companyPick = event.target.closest("[data-company-pick]");
  if (companyPick) {
    state.selectedRadarJob = companyPick.dataset.companyPick;
    markRadarViewed(state.selectedRadarJob);
    state.jobView = "radar";
    saveState();
    render();
    return;
  }

  const diagnoseCompany = event.target.closest("[data-diagnose-company]");
  if (diagnoseCompany) {
    state.selectedDiagnosisCompany = diagnoseCompany.dataset.diagnoseCompany;
    state.modal = "company-diagnosis";
    render();
    setTimeout(() => document.querySelector("#diagnosis-conclusion")?.focus(), 30);
    return;
  }

  const companyReview = event.target.closest("[data-review-company]");
  if (companyReview) {
    const company = companyReview.dataset.reviewCompany;
    const index = state.companyReviewQueue.indexOf(company);
    if (index >= 0) {
      state.companyReviewQueue.splice(index, 1);
      saveState(`${company} 已移出岗位诊断`);
    } else {
      state.companyReviewQueue.push(company);
      saveState(`${company} 已加入岗位诊断`);
    }
    render();
    return;
  }

  const job = event.target.closest("[data-job]");
  if (job) {
    state.selectedJob = job.dataset.job;
    saveState();
    render();
    return;
  }

  const editApplication = event.target.closest("[data-edit-application]");
  if (editApplication) {
    if (!requirePrivateAccess()) return;
    state.editingApplicationId = editApplication.dataset.editApplication;
    state.modal = "edit-application";
    render();
    setTimeout(() => document.querySelector("#edit-role")?.focus(), 30);
    return;
  }

  const modalButton = event.target.closest("[data-modal]");
  if (modalButton) {
    state.modal = modalButton.dataset.modal;
    render();
    setTimeout(() => document.querySelector(".modal input")?.focus(), 30);
    return;
  }

  const pipelineScope = event.target.closest("[data-pipeline-scope]");
  if (pipelineScope) {
    state.pipelineFilters.scope = pipelineScope.dataset.pipelineScope;
    saveState();
    render();
    return;
  }

  const archiveButton = event.target.closest("[data-archive-app]");
  if (archiveButton) {
    const app = state.applications.find(item => item.id === archiveButton.dataset.archiveApp);
    if (app) {
      app.archivedAt = new Date().toISOString();
      app.updatedAt = new Date().toISOString();
      saveState("已归档，可在已归档中恢复");
      render();
    }
    return;
  }

  const restoreButton = event.target.closest("[data-restore-app]");
  if (restoreButton) {
    const app = state.applications.find(item => item.id === restoreButton.dataset.restoreApp);
    if (app) {
      app.archivedAt = "";
      app.updatedAt = new Date().toISOString();
      saveState("投递记录已恢复");
      render();
    }
    return;
  }

  const removeButton = event.target.closest("[data-remove-app]");
  if (removeButton) {
    if (!window.confirm("确认永久删除这条已归档记录吗？")) return;
    const applicationId = removeButton.dataset.removeApp;
    const linkedRecord = state.interviewRecords.find(record => record.applicationId === applicationId);
    if (linkedRecord) linkedRecord.applicationId = "";
    state.applications = state.applications.filter(app => app.id !== applicationId);
    saveState("已从求职进度中移除");
    render();
    return;
  }

  const action = event.target.closest("[data-action]")?.dataset.action;
  if (!action) return;
  if (import.meta.env.DEV && ["check-legacy", "export-legacy", "migrate-legacy-files"].includes(action)) {
    const epoch = authEpoch;
    import("./legacy-migration.js").then(async migration => {
      assertSession(epoch);
      const legacy = migration.readLegacyWorkspace();
      if (action === "export-legacy") {
        if (!legacy) throw new Error("没有可读取的旧版结构化记录");
        downloadWorkspaceState(legacy, "旧版资料备份");
        return;
      }
      if (action === "check-legacy") {
        const differences = migration.compareLegacyWorkspace(legacy, state);
        legacyMigrationNote = legacy
          ? `旧版 ${legacy.applications?.length || 0} 条投递，当前 ${state.applications.length} 条。${differences.length ? `${differences.length} 类记录有差异，请先下载旧版备份核对，不自动覆盖。` : "已检查的主要记录一致。"}`
          : "没有旧版结构化记录；仍可检查原附件。";
      } else {
        if (!window.confirm("确认这台浏览器的旧附件都是你自己的？将复制当前账号已有记录对应的附件，不覆盖现有文件，也不删除旧库。")) return;
        const result = await migration.migrateLegacyFiles({ state:structuredClone(state), assertCurrent:()=>assertSession(epoch), getResume:getResumeFile, putResume:putResumeFile, getRecording:getInterviewRecording, putRecording:putInterviewRecording });
        assertSession(epoch);
        legacyMigrationNote = `迁移完成：复制 ${result.copied} 个，已存在 ${result.existing} 个，未找到 ${result.missing} 个。旧文件仍保留。`;
      }
      render();
    }).catch(error=>showToast(error.message));
    return;
  }
  if (action === "retry-cloud") {
    workspaceSync.flush().then(() => render()).catch(error => showToast(error.message));
  }
  if (action === "reload-cloud" && cloudUser) {
    if (workspaceSync.pending && !window.confirm("本页有未同步内容，请先下载数据备份。确认已备份并载入云端版本？")) return;
    applyCloudUser(cloudUser);
  }
  if (action === "export-recovery" && workspaceSync.recovery?.state) {
    downloadWorkspaceState(workspaceSync.recovery.state, "恢复副本");
  }
  if (action === "toggle-menu") {
    state.mobileOpen = !state.mobileOpen;
    render();
  }
  if (action === "cloud-signout") {
    if (workspaceSync.recovery && !window.confirm("还有未同步的恢复副本，请先下载。确认已备份并退出？退出会清理本次会话的恢复副本。")) return;
    const epoch = authEpoch;
    const draftKey = workspaceSync.key();
    workspaceSync.flush().then(() => {
      if (epoch !== authEpoch) throw new Error("账号已变化");
      return signOutCloud();
    }).then(() => {
      sessionStorage.removeItem(draftKey);
      sessionStorage.removeItem(`${draftKey}:recovery`);
      if (epoch === authEpoch) applyCloudUser(null);
      showToast("已退出，个人内容已锁定");
    }).catch(error => showToast(`暂未退出：${error.message}。请先备份未同步内容。`));
  }
  if (action === "export-workspace") {
    exportWorkspaceBackup();
    showToast("结构化数据备份已下载");
  }
  if (action === "export-applications") {
    const count = exportApplicationsCsv();
    showToast(`已导出 ${count} 条投递记录`);
  }
  if (action === "export-interviews") {
    const count = exportInterviewRecordsCsv();
    showToast(`已导出 ${count} 条笔面记录`);
  }
  if (action === "clear-pipeline-filters") {
    state.pipelineFilters = { ...state.pipelineFilters, query: "", company: "全部公司", status: "全部进度", processResult: "全部环节状态" };
    saveState();
    render();
  }
  if (action === "strike-wooden-fish") {
    const woodenFish = event.target.closest(".home-wooden-fish");
    state.woodenFishCount = Math.max(0, Number(state.woodenFishCount) || 0) + 1;
    playWoodenFishSound();
    saveState();
    if (woodenFish) {
      woodenFish.classList.remove("is-struck");
      void woodenFish.offsetWidth;
      woodenFish.classList.add("is-struck");
      woodenFish.setAttribute("aria-label", `敲一下电子木鱼，已敲 ${state.woodenFishCount} 次`);
      const countLabel = woodenFish.querySelector("small");
      if (countLabel) countLabel.textContent = `累计 ${state.woodenFishCount} 次`;
      window.setTimeout(() => woodenFish.classList.remove("is-struck"), 560);
    }
    showToast(`功德 +1，已敲 ${state.woodenFishCount} 次`);
  }
  if (action === "refresh-encouragement") refreshDailyEncouragement({ force: true });
  if (action === "refresh-radar") refreshRadarJobs(true);
  if (action === "clear-radar-filters") {
    state.jobFilters = {
      ...state.jobFilters,
      query: "",
      roleCategory: "全部方向",
      industry: "全部行业",
      batch: "全部批次",
      linkMode: "全部线索",
      inbox: "全部岗位",
      sort: "偏好优先"
    };
    state.selectedRadarJob = "";
    saveState();
    render();
  }
  if (action === "continue-radar") {
    const job = radarJobs.find(item => item.id === state.radarActivity.lastViewedJobId);
    if (job) {
      state.jobFilters.query = "";
      state.jobFilters.roleCategory = "全部方向";
      state.jobFilters.industry = job.industry;
      state.jobFilters.batch = "全部批次";
      state.jobFilters.linkMode = safeExternalUrl(job.applyUrl) ? "可直接投递" : "全部线索";
      state.jobFilters.inbox = "全部岗位";
      state.selectedRadarJob = job.id;
      saveState();
      render();
    }
  }
  if (action === "clear-new-batch") {
    state.radarActivity.newJobIds = [];
    state.jobFilters.inbox = "未看";
    state.selectedRadarJob = "";
    saveState("本批新增已处理，接着查看其他未看岗位");
    render();
  }
  if (action === "review-record") {
    state.selectedInterviewRecord = event.target.closest("[data-record-id]").dataset.recordId;
    state.interviewView = "review";
    saveState();
    render();
  }
  if (action === "delete-recording") {
    const epoch = authEpoch;
    const recordId = event.target.closest("[data-record-id]").dataset.recordId;
    removeInterviewRecording(recordId).then(() => {
      assertSession(epoch);
      const record = state.interviewRecords.find(item => item.id === recordId);
      if (record) record.recording = null;
      saveState("面试录音已从当前浏览器删除");
      render();
    }).catch(() => showToast("录音删除失败，请稍后重试"));
  }
  if (action === "download-recording") {
    const epoch = authEpoch;
    const id = event.target.closest("[data-record-id]").dataset.recordId;
    const record = state.interviewRecords.find(item => item.id === id);
    getInterviewRecording(id).then(blob => {
      assertSession(epoch);
      if (!blob) throw new Error("录音不在当前账号的本机存储中，请从原设备迁移");
      const url = URL.createObjectURL(blob);
      Object.assign(document.createElement("a"), { href: url, download: record.recording.name }).click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }).catch(error => showToast(error.message));
  }
  if (action === "copy-review-package") {
    const recordId = event.target.closest("[data-record-id]").dataset.recordId;
    const record = state.interviewRecords.find(item => item.id === recordId);
    if (record) {
      const reviewText = [
        `请帮我复盘这场面试：${record.company} · ${record.role} · ${record.round}`,
        `面试时间：${formatInterviewDate(record.date)}`,
        `我整理的问题：\n${record.questions.map((question, index) => `${index + 1}. ${question}`).join("\n") || "暂未整理"}`,
        `回答与现场记录：\n${record.answerNotes || "暂未填写"}`,
        `我认为做得好的：\n${record.strengths || "暂未填写"}`,
        `我认为需要改进的：\n${record.improvements || "暂未填写"}`,
        "请帮我判断回答结构、内容充分度和面试官可能的顾虑，并给出下一次可执行的改进动作。"
      ].join("\n\n");
      navigator.clipboard?.writeText(reviewText).then(() => showToast("复盘材料已复制，可连同录音发给助手")).catch(() => showToast("复制失败，请手动复制表单内容"));
    }
  }
  if (action === "exit-practice") {
    state.practiceSession = null;
    state.practiceView = "overview";
    saveState();
    render();
  }
  if (action === "previous-question" && state.practiceSession) {
    state.practiceSession.index = Math.max(0, state.practiceSession.index - 1);
    saveState();
    render();
  }
  if (action === "next-question" && state.practiceSession) {
    state.practiceSession.index = Math.min(state.practiceSession.questionIds.length - 1, state.practiceSession.index + 1);
    saveState();
    render();
  }
  if (action === "submit-practice") {
    const unanswered = state.practiceSession.questionIds.length - Object.keys(state.practiceSession.answers || {}).length;
    if (!unanswered || window.confirm(`还有 ${unanswered} 道题未作答，仍然交卷吗？`)) submitPractice();
  }
  if (action === "review-answers") {
    document.querySelector("#answer-review")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  if (action === "retry-session-wrong") {
    const wrongIds = state.practiceSession.questionIds.filter(id => {
      const question = questionById(id);
      return Number(state.practiceSession.answers?.[id]) !== question?.answer;
    });
    startPractice("本组错题重练", wrongIds, "wrongbook");
  }
  if (action === "close-modal" || (action === "backdrop" && event.target.classList.contains("modal-backdrop"))) {
    state.modal = null;
    render();
  }
  if (action === "save-job") {
    const jobId = event.target.closest("[data-job-id]").dataset.jobId;
    if (!state.applications.some(app => app.jobId === jobId)) {
      state.applications.push({ id: crypto.randomUUID(), jobId, status: "applied", next: applicationNextAction("applied"), date: new Date().toLocaleDateString("zh-CN"), appliedAt: new Date().toISOString().slice(0, 10), followUpAt: "", archivedAt: "", progressUrl: "", notes: "", interviewRecordId: "", feishuRecordId: "", syncStatus: "local_only", updatedAt: new Date().toISOString(), createdAt: new Date().toISOString() });
      saveState("已记录为已投递");
      render();
    }
  }
  if (action === "save-radar-job") {
    const jobId = event.target.closest("[data-job-id]").dataset.jobId;
    const target = radarJobs.find(item => item.id === jobId);
    if (target) saveRadarJob(target);
  }
  if (action === "sync-jd") {
    const jobId = event.target.closest("[data-job-id]").dataset.jobId;
    const target = state.jobs.find(item => item.id === jobId);
    state.jdContext = { jobId, keywords: extractKeywords(target.jd, target.tags), gaps: getGaps(target) };
    state.activeView = "resume";
    saveState("JD 关键词已同步到简历 Skill");
    render();
  }
  if (action === "copy-fill-package") {
    const draft = state.applicationDrafts.find(item => item.id === state.activeApplicationDraft) || state.applicationDrafts[0];
    const job = draft && state.jobs.find(item => item.id === draft.jobId);
    if (draft) {
      const content = [
        `${job?.company || "目标公司"} / ${job?.role || "目标岗位"}`,
        `网申平台：${draft.platform}`,
        "",
        ...draft.fields.filter(field => field.selected && field.value).map(field => `${field.label}\n${field.value}`),
        "",
        "请在最终提交前逐项检查以上内容。"
      ].join("\n");
      navigator.clipboard?.writeText(content).then(() => showToast("填写包已复制")).catch(() => showToast("复制失败，请手动复制字段"));
    }
  }
  if (action === "review-draft") {
    const draft = state.applicationDrafts.find(item => item.id === state.activeApplicationDraft) || state.applicationDrafts[0];
    if (draft) {
      const hasEmptySelection = draft.fields.some(field => field.selected && !field.value.trim());
      if (hasEmptySelection) showToast("已勾选的字段中还有空内容");
      else {
        draft.reviewed = !draft.reviewed;
        draft.reviewedAt = draft.reviewed ? new Date().toISOString() : "";
        saveState(draft.reviewed ? "投递草稿已核对" : "已恢复为待核对");
        render();
      }
    }
  }
  if (action === "print-resume") window.print();
});

document.addEventListener("change", (event) => {
  if (event.target.id === "privacy-consent") {
    if (event.target.checked) loginCaptcha.mount(document.querySelector("#login-captcha"));
    else loginCaptcha.clear();
    updateLoginRequest();
    return;
  }
  const publicInput = event.target.closest("#cloud-login-form") || event.target.matches("[data-question-answer],#radar-role-category,#radar-industry,#radar-batch,#radar-link,#radar-inbox,#radar-sort");
  if (!publicInput && !hasPrivateAccess()) { requirePrivateAccess(); return; }
  const epoch = authEpoch;
  if (event.target.matches("[data-reminder-key]")) {
    setReminderCompleted(event.target.dataset.reminderKey, event.target.checked);
    render();
    return;
  }
  if (event.target.id === "workspace-import") {
    const file = event.target.files?.[0];
    if (!file) return;
    file.text().then(text => {
      assertSession(epoch);
      pendingWorkspaceImport = parseWorkspaceBackup(text);
      state.modal = "confirm-import-data";
      render();
    }).catch(error => showToast(`导入失败：${error.message}`));
    return;
  }
  if (event.target.matches("[data-restore-document]")) {
    const file = event.target.files?.[0];
    if (!file) return;
    restoreResumeDocument(event.target.dataset.restoreDocument, file)
      .then(() => showToast("原文件已补回当前浏览器，校验通过；未改动云端记录"))
      .catch(error => showToast(`未完成补回：${error.message}`))
      .finally(() => { event.target.value = ""; });
    return;
  }
  if (event.target.id === "resume-document") {
    const file = event.target.files?.[0];
    if (!file) return;
    const id = crypto.randomUUID();
    putResumeFile(id, file).then(() => {
      assertSession(epoch);
      const extension = file.name.includes(".") ? file.name.split(".").pop().toUpperCase() : "CV";
      const sizeLabel = file.size >= 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`;
      state.resumeDocuments.unshift({ id, name: file.name, extension, sizeLabel, type: file.type, addedAt: new Date().toLocaleDateString("zh-CN") });
      saveState("简历文件已保存在当前浏览器");
      render();
    }).catch(() => showToast("文件保存失败，请检查浏览器存储空间"));
    return;
  }
  if (event.target.matches("[data-draft-select]")) {
    const draft = state.applicationDrafts.find(item => item.id === state.activeApplicationDraft) || state.applicationDrafts[0];
    const field = draft?.fields.find(item => item.id === event.target.dataset.draftSelect);
    if (field) {
      field.selected = event.target.checked;
      draft.reviewed = false;
      saveState();
      render();
    }
    return;
  }
  if (event.target.id === "interview-application") {
    const app = state.applications.find(item => item.id === event.target.value);
    const job = app && state.jobs.find(item => item.id === app.jobId);
    if (job) {
      const companyInput = document.querySelector("#interview-company");
      const roleInput = document.querySelector("#interview-role");
      if (companyInput) companyInput.value = job.company;
      if (roleInput) roleInput.value = job.role;
    }
    return;
  }
  if (event.target.id === "pipeline-status-filter") {
    state.pipelineFilters.status = event.target.value;
    saveState();
    render();
    return;
  }
  if (event.target.id === "pipeline-company-filter") {
    state.pipelineFilters.company = event.target.value;
    saveState();
    render();
    return;
  }
  if (event.target.id === "pipeline-process-filter") {
    state.pipelineFilters.processResult = event.target.value;
    saveState();
    render();
    return;
  }
  if (event.target.matches("[data-audio-upload]")) {
    const file = event.target.files?.[0];
    const recordId = event.target.dataset.audioUpload;
    if (!file) return;
    putInterviewRecording(recordId, file).then(() => {
      assertSession(epoch);
      const record = state.interviewRecords.find(item => item.id === recordId);
      if (!record) return;
      record.recording = { name: file.name, size: file.size, type: file.type, savedAt: new Date().toISOString() };
      saveState("面试录音已保存在当前浏览器");
      render();
    }).catch(() => showToast("录音保存失败，请检查浏览器存储空间"));
    return;
  }
  if (event.target.id === "radar-role-category" || event.target.id === "radar-industry" || event.target.id === "radar-batch" || event.target.id === "radar-link" || event.target.id === "radar-inbox" || event.target.id === "radar-sort") {
    state.jobFilters.roleCategory = document.querySelector("#radar-role-category")?.value || "全部方向";
    state.jobFilters.industry = document.querySelector("#radar-industry")?.value || "全部行业";
    state.jobFilters.batch = document.querySelector("#radar-batch")?.value || "全部批次";
    state.jobFilters.linkMode = document.querySelector("#radar-link")?.value || "可直接投递";
    state.jobFilters.inbox = document.querySelector("#radar-inbox")?.value || "全部岗位";
    state.jobFilters.sort = document.querySelector("#radar-sort")?.value || "偏好优先";
    if (event.target.id === "radar-inbox") state.selectedRadarJob = "";
    updateRadarResults();
    return;
  }
  if (event.target.matches("[data-question-answer]") && state.practiceSession) {
    state.practiceSession.answers[event.target.dataset.questionAnswer] = Number(event.target.value);
    saveState();
    render();
    return;
  }
  if (event.target.id === "question-import") {
    const file = event.target.files?.[0];
    if (!file) return;
    file.text().then(text => {
      assertSession(epoch);
      const imported = validateImportedQuestions(JSON.parse(text));
      const existing = new Set(questionBank().map(question => question.id));
      const fresh = imported.filter(question => !existing.has(question.id));
      state.importedQuestions.push(...fresh);
      saveState(`已导入 ${fresh.length} 道题`);
      render();
    }).catch(error => showToast(`导入失败：${error.message}`));
    return;
  }
  if (event.target.matches("[data-process-result]")) {
    const app = state.applications.find(item => item.id === event.target.dataset.processResult);
    const record = app && (currentProcessRecord(app) || ensureProcessRecord(app));
    if (record) {
      updateProcessResult(record, event.target.value);
      saveState(`${record.round}已更新为“${processResultLabel(record)}”`);
      render();
    }
    return;
  }
  if (event.target.matches("[data-record-result]")) {
    const record = state.interviewRecords.find(item => item.id === event.target.dataset.recordResult);
    if (record) {
      updateProcessResult(record, event.target.value);
      saveState(`${record.round}已更新为“${processResultLabel(record)}”`);
      render();
    }
    return;
  }
  if (event.target.matches("[data-task]")) {
    state.tasks[event.target.dataset.task] = event.target.checked;
    saveState();
    render();
  }
  if (event.target.matches("[data-app-status]")) {
    const app = state.applications.find(item => item.id === event.target.dataset.appStatus);
    if (app) {
      app.status = event.target.value;
      if (!app.appliedAt) app.appliedAt = new Date().toISOString().slice(0, 10);
      app.next = applicationNextAction(app.status) || app.next;
      app.updatedAt = new Date().toISOString();
      app.syncStatus = app.feishuRecordId ? "pending_push" : "local_only";
      const record = synchronizeApplicationProcessState(app);
      saveState(record ? `已进入${processRoundForStage(app.status)}，对应笔面记录已关联` : "求职进度已更新");
      render();
    }
    return;
  }
  if (event.target.matches("[data-app-field]")) {
    const app = state.applications.find(item => item.id === event.target.dataset.appId);
    if (app) {
      app[event.target.dataset.appField] = event.target.value.trim();
      app.updatedAt = new Date().toISOString();
      app.syncStatus = app.feishuRecordId ? "pending_push" : "local_only";
      saveState("求职记录已保存");
      render();
    }
  }
});

document.addEventListener("input", (event) => {
  if (event.target.matches("[data-draft-field]") && !hasPrivateAccess()) return;
  if (event.target.matches("[data-draft-field]")) {
    const draft = state.applicationDrafts.find(item => item.id === state.activeApplicationDraft) || state.applicationDrafts[0];
    const field = draft?.fields.find(item => item.id === event.target.dataset.draftField);
    if (field) {
      field.value = event.target.value;
      field.confidence = field.value.trim() ? (field.confidence === "missing" ? "medium" : field.confidence) : "missing";
      draft.reviewed = false;
      saveState();
    }
    return;
  }
  if (event.target.id === "radar-search") {
    state.jobFilters.query = event.target.value;
    updateRadarResults();
  }
  if (event.target.id === "application-rule-search") {
    state.ruleFilters.query = event.target.value;
    updateApplicationRuleResults();
  }
  if (event.target.id === "pipeline-search") {
    state.pipelineFilters.query = event.target.value;
    filterPipelineRowsInPlace();
  }
});

document.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (event.target.id !== "cloud-login-form" && !requirePrivateAccess()) return;
  if (event.target.id === "application-edit-form") {
    const data = Object.fromEntries(new FormData(event.target));
    try {
      updateApplicationDetails(data.applicationId, data);
    } catch (error) {
      event.target.querySelector(".privacy-error").textContent = error.message;
      return;
    }
    state.modal = null;
    state.editingApplicationId = "";
    saveState("投递信息已更新");
    render();
    return;
  }
  if (event.target.id === "import-data-form") {
    const button = event.target.querySelector("button[type='submit']");
    const error = event.target.querySelector(".privacy-error");
    button.disabled = true;
    button.textContent = "正在恢复";
    try {
      await importWorkspaceBackup();
      render();
      showToast("结构化数据已从备份恢复");
    } catch (importError) {
      button.disabled = false;
      button.textContent = "确认覆盖并恢复";
      error.textContent = importError.message || "恢复失败，当前数据没有被替换。";
    }
    return;
  }
  if (event.target.id === "clear-data-form") {
    const data = Object.fromEntries(new FormData(event.target));
    const error = event.target.querySelector(".privacy-error");
    if (!cloudUser) {
      error.textContent = "登录状态已失效，请重新登录后再试。";
      return;
    }
    if (data.confirmation.trim() !== "清空我的数据") {
      error.textContent = "确认短语不正确，请完整输入“清空我的数据”。";
      event.target.confirmation.select();
      return;
    }
    const button = event.target.querySelector("button[type='submit']");
    button.disabled = true;
    button.textContent = "正在清空";
    try {
      await clearPersonalWorkspace();
      render();
      showToast("个人数据已清空，账号仍然保留");
    } catch (clearError) {
      button.disabled = false;
      button.textContent = "确认永久清空";
      error.textContent = clearError.message || "清空没有完成，请稍后重试。";
    }
    return;
  }
  if (event.target.id === "cloud-login-form") {
    const data = Object.fromEntries(new FormData(event.target));
    if (data.privacyConsent !== "accepted") return;
    if (!loginCaptcha.ready() || loginRequest.state.busy || loginRequest.remaining()) return;
    await loginRequest.submit(data.email);
    if (document.querySelector("#privacy-consent")?.checked) loginCaptcha.reset();
    return;
  }
  if (event.target.id === "company-diagnosis-form") {
    const data = Object.fromEntries(new FormData(event.target));
    const company = data.company.trim();
    if (!state.companyReviewQueue.includes(company)) state.companyReviewQueue.push(company);
    state.companyDiagnoses[company] = {
      company,
      conclusion: data.conclusion.trim(),
      updatedAt: new Date().toISOString()
    };
    state.selectedDiagnosisCompany = company;
    state.modal = null;
    state.jobView = "companies";
    saveState(`${company} 的诊断结果已保存`);
    render();
    return;
  }
  if (event.target.id === "radar-jd-form") {
    const data = Object.fromEntries(new FormData(event.target));
    const radarJob = radarJobs.find(item => item.id === data.jobId);
    if (!radarJob) return;
    const details = {
      id: radarJob.id,
      company: radarJob.company,
      role: data.role.trim(),
      location: radarJob.location,
      mode: radarJob.batch,
      salary: "校招岗位",
      tags: [radarJob.industry, radarJob.cohort, radarJob.batch].filter(Boolean),
      jd: data.jd.trim(),
      jdSource: "pasted",
      match: null,
      sourceName: radarJob.sourceNames.join(" + "),
      applyUrl: radarJob.applyUrl,
      deadline: radarJob.deadline
    };
    const existingIndex = state.jobs.findIndex(item => item.id === radarJob.id);
    if (existingIndex >= 0) state.jobs[existingIndex] = details;
    else state.jobs.unshift(details);
    state.selectedJob = radarJob.id;
    state.jdContext = { jobId: radarJob.id, keywords: extractKeywords(details.jd, details.tags), gaps: getGaps(details) };
    state.modal = null;
    state.tasks.analyze = true;
    saveState("具体 JD 已保存并完成初步分析");
    render();
    return;
  }
  if (event.target.id === "resume-profile-form") {
    const data = Object.fromEntries(new FormData(event.target));
    const skills = data.skills.split(/[、,，]/).map(item => item.trim()).filter(Boolean);
    state.profile = {
      ...state.profile,
      ...data,
      skills,
      source: "user",
      education: [data.school, data.major, data.degree].filter(Boolean).join(" / ")
    };
    state.modal = null;
    state.tasks.resume = true;
    saveState("简历资料已更新");
    render();
  }
  if (event.target.id === "answer-form") {
    const data = Object.fromEntries(new FormData(event.target));
    state.answerBank.unshift({
      id: crypto.randomUUID(),
      question: data.question.trim(),
      answer: data.answer.trim(),
      tags: data.tags.split(/[、,，]/).map(item => item.trim()).filter(Boolean)
    });
    state.modal = null;
    saveState("常用回答已加入资料库");
    render();
  }
  if (event.target.id === "autofill-form") {
    const data = Object.fromEntries(new FormData(event.target));
    const job = state.jobs.find(item => item.id === data.jobId);
    if (job) {
      const draft = {
        id: crypto.randomUUID(),
        jobId: job.id,
        platform: data.platform,
        createdAt: new Date().toISOString(),
        reviewed: false,
        reviewedAt: "",
        fields: createAutofillFields(job)
      };
      state.applicationDrafts.unshift(draft);
      state.activeApplicationDraft = draft.id;
      state.selectedJob = job.id;
      state.jdContext = { jobId: job.id, keywords: extractKeywords(job.jd, job.tags), gaps: getGaps(job) };
      state.resumeView = "drafts";
      state.modal = null;
      saveState("填写草稿已生成，请逐项核对");
      render();
    }
  }
  if (event.target.id === "profile-form") {
    const data = Object.fromEntries(new FormData(event.target));
    state.profile = { ...state.profile, ...data, source: "user", skills: data.skills.split(/[、,，]/).map(item => item.trim()).filter(Boolean) };
    state.modal = null;
    saveState("基础资料已更新，所有模块将使用新信息");
    render();
  }
  if (event.target.id === "resume-form") {
    const data = Object.fromEntries(new FormData(event.target));
    state.profile = { ...state.profile, ...data, source: "user" };
    state.tasks.resume = true;
    saveState("简历已保存");
    render();
  }
  if (event.target.id === "job-form") {
    const data = Object.fromEntries(new FormData(event.target));
    const job = {
      id: crypto.randomUUID(),
      company: data.company,
      role: data.role,
      location: data.location || "地点待确认",
      mode: data.batch,
      salary: "校招岗位",
      tags: [data.industry || "其他", data.cohort || "不限", data.batch],
      jd: `${data.cohort || "校园"}${data.batch}。开放方向：${data.role}。`,
      match: 70,
      sourceName: "手动记录",
      applyUrl: data.applyUrl,
      deadline: data.deadline || "待确认"
    };
    state.jobs.unshift(job);
    state.selectedJob = job.id;
    const application = { id: crypto.randomUUID(), jobId: job.id, status: normalizeApplicationStatus(data.status), next: applicationNextAction(normalizeApplicationStatus(data.status)), date: new Date().toLocaleDateString("zh-CN"), appliedAt: new Date().toISOString().slice(0, 10), followUpAt: data.reminderAt || "", archivedAt: "", progressUrl: data.applyUrl || "", notes: "", interviewRecordId: "", feishuRecordId: "", syncStatus: "local_only", updatedAt: new Date().toISOString(), createdAt: new Date().toISOString() };
    state.applications.push(application);
    synchronizeApplicationProcessState(application);
    state.modal = null;
    state.activeView = "pipeline";
    saveState("投递记录已添加");
    render();
  }
  if (event.target.id === "interview-record-form") {
    const data = Object.fromEntries(new FormData(event.target));
    const result = data.result || "pending";
    const record = {
      id: crypto.randomUUID(),
      applicationId: data.applicationId || "",
      company: data.company,
      role: data.role,
      round: data.round,
      date: data.date,
      status: result === "pending" ? "scheduled" : "completed",
      result,
      duration: data.duration,
      recording: null,
      questions: [],
      answerNotes: "",
      strengths: "",
      improvements: "",
      assistantReview: "",
      nextActions: data.nextActions || ""
    };
    if (!record.nextActions) record.nextActions = processNextAction(record);
    state.interviewRecords.unshift(record);
    syncApplicationFromRecord(record);
    state.selectedInterviewRecord = record.id;
    state.interviewFilters = { stage: stageForProcessRecord(record.round), status: "all" };
    state.interviewView = record.status === "completed" ? "review" : "records";
    state.modal = null;
    saveState("面试记录已创建");
    render();
  }
  if (event.target.id === "interview-review-form") {
    const data = Object.fromEntries(new FormData(event.target));
    const record = state.interviewRecords.find(item => item.id === data.id);
    if (record) {
      record.questions = data.questions.split("\n").map(item => item.trim()).filter(Boolean);
      record.answerNotes = data.answerNotes.trim();
      record.strengths = data.strengths.trim();
      record.improvements = data.improvements.trim();
      record.assistantReview = data.assistantReview.trim();
      record.result = data.result;
      record.status = record.result === "pending" ? "scheduled" : "completed";
      record.nextActions = data.nextActions.trim() || processNextAction(record);
      syncApplicationFromRecord(record);
      state.tasks.interview = true;
      saveState("面试复盘已保存");
      render();
    }
  }
  if (event.target.id === "interview-prep-form") {
    const data = Object.fromEntries(new FormData(event.target));
    state.interviewPrep = { intro60: data.intro60.trim(), intro180: data.intro180.trim(), reminders: data.reminders.trim() };
    saveState("面试前准备已保存");
    render();
  }
  if (event.target.id === "project-form") {
    const data = Object.fromEntries(new FormData(event.target));
    state.projects.unshift({ id: crypto.randomUUID(), ...data });
    state.modal = null;
    state.tasks.interview = true;
    state.interviewView = "prep";
    saveState("项目介绍已保存");
    render();
  }
});

function updateRadarResults() {
  const filtered = visibleRadarJobs();
  const groups = groupRadarJobsByCompany(filtered);
  if (!filtered.some(job => job.id === state.selectedRadarJob)) state.selectedRadarJob = filtered[0]?.id || "";
  const list = document.querySelector("#job-list");
  if (list) list.innerHTML = renderCompanyRows(groups.slice(0, 200));
  const detail = document.querySelector("#job-detail");
  const selected = filtered.find(job => job.id === state.selectedRadarJob) || filtered[0];
  if (detail) detail.innerHTML = selected ? renderRadarDetail(selected, filtered) : `<div class="large-empty"><strong>没有符合条件的岗位</strong><p>减少筛选条件后再试。</p></div>`;
  const detailTitle = document.querySelector(".radar-detail-panel .radar-pane-title span");
  if (detailTitle) detailTitle.textContent = selected?.company || "未选择";
  const count = document.querySelector("#radar-result-count");
  if (count) count.textContent = `共 ${groups.length} 家公司 · ${filtered.length} 个岗位`;
  updateRadarActivityUi();
  saveState();
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.modal) {
    state.modal = null;
    render();
  }
});

window.addEventListener("beforeunload", event => {
  if (!workspaceSync.pending) return;
  event.preventDefault();
  event.returnValue = "";
});

async function applyCloudUser(user) {
  const epoch = ++authEpoch;
  workspaceSync.close();
  legacyMigrationNote = "";
  pendingWorkspaceImport = null;
  interviewAudioUrls.forEach(url => URL.revokeObjectURL(url));
  interviewAudioUrls = [];
  state = structuredClone(initialState);
  cloudUser = user;
  if (!user) {
    cloudSyncStatus = cloudConfigured ? "ready" : "local";
    render();
    return;
  }
  cloudSyncStatus = "syncing";
  render();
  try {
    const remote = await workspaceSync.open(user.id);
    if (epoch !== authEpoch || !remote) return;
    state = restoreState(remote.state);
    state.modal = null;
    synchronizeProcessRecordsFromApplications();
  } catch {
    if (epoch !== authEpoch) return;
    cloudSyncStatus = "error";
  }
  render();
}

async function initializeApp() {
  render();
  refreshDailyEncouragement();
  refreshRadarJobs();
  loadCommunityQuestionBank([...SEED_QUESTIONS, ...(state.importedQuestions || [])])
    .then((questions) => {
      communityQuestions = questions;
      communityPapers = questions.length ? [createCommunityPaper(questions)] : [];
      communityBankStatus = questions.length ? "ready" : "error";
      render();
    })
    .catch(() => {
      communityBankStatus = "error";
      render();
    });
  if (!cloudConfigured) return;
  try {
    watchCloudAuth((user) => {
      if (user?.id === cloudUser?.id) return;
      applyCloudUser(user);
    });
    const epoch = authEpoch;
    const user = await currentCloudUser();
    if (epoch === authEpoch) await applyCloudUser(user);
  } catch {
    cloudSyncStatus = "error";
    render();
  }
}

initializeApp();

setInterval(() => {
  const timer = document.querySelector(".exam-timer");
  if (!timer || !state.practiceSession || state.practiceSession.status !== "active") return;
  timer.textContent = formatDuration((Date.now() - state.practiceSession.startedAt) / 1000);
}, 1000);
