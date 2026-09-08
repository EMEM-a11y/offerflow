import { execFile } from "node:child_process";
import { readFile, rename, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const packageVersion = "@ha7ch/job-pro@1.2.1";
const target = new URL("../public/data/official-live-jobs.json", import.meta.url);

const MIXED_SCOPE_COMPANIES = new Set([
  "weibo", "byd", "moonshot", "zhipu", "lilith", "zerooneai", "baichuan",
  "deepseek", "galaxyuniversal", "stepfun", "geely", "hoyoverse",
]);

const COMPANY_INDUSTRIES = {
  pingan: "金融",
  unitree: "半导体/硬件",
  horizonrobotics: "半导体/硬件",
  cambricon: "半导体/硬件",
  byd: "汽车/新能源",
  liauto: "汽车/新能源",
  nio: "汽车/新能源",
  geely: "汽车/新能源",
  xpeng: "汽车/新能源",
  sf: "制造/能源",
};

const COMPANY_LINK_RULES = {
  tencent: [["join.qq.com"]],
  bytedance: [["jobs.bytedance.com"]],
  alibaba: [["campus-talent.alibaba.com"]],
  meituan: [["zhaopin.meituan.com"]],
  xiaohongshu: [["job.xiaohongshu.com"]],
  jd: [["campus.jd.com"]],
  kuaishou: [["campus.kuaishou.cn"]],
  baidu: [["talent.baidu.com"]],
  netease: [["hr.163.com"]],
  didi: [["talent.didiglobal.com"]],
  bilibili: [["jobs.bilibili.com"]],
  pdd: [["careers.pinduoduo.com"]],
  huawei: [["career.huawei.com"]],
  weibo: [["app.mokahr.com", "/sina/"]],
  mihoyo: [["jobs.mihoyo.com"]],
  pingan: [["campus.pingan.com"]],
  trip: [["careers.ctrip.com"]],
  unitree: [["www.unitree.com"]],
  byd: [["job.byd.com"]],
  antgroup: [["talent.antgroup.com"], ["hrcareersweb.antgroup.com"]],
  liauto: [["www.lixiang.com"]],
  sf: [["campus.sf-express.com"]],
  oppo: [["careers.oppo.com"]],
  xiaomi: [["xiaomi.jobs.f.mioffice.cn"]],
  nio: [["nio.jobs.feishu.cn"]],
  minimax: [["vrfi1sk8a0.jobs.feishu.cn"]],
  moonshot: [["app.mokahr.com", "/moonshot/"]],
  zhipu: [["zhipu-ai.jobs.feishu.cn"], ["zhipuai.jobs.feishu.cn"]],
  iqiyi: [["careers.iqiyi.com"]],
  agibot: [["agirobot.jobs.feishu.cn"]],
  lilith: [["lilithgames.jobs.feishu.cn"]],
  zerooneai: [["01ai.jobs.feishu.cn"]],
  baichuan: [["cq6qe6bvfr6.jobs.feishu.cn", "/baichuanzhaopin/"]],
  sensetime: [["hr.sensetime.com"]],
  horizonrobotics: [["wecruit.hotjob.cn", "/su6409ef49bef57c635fd390a6/"]],
  vivo: [["hr-campus.vivo.com"], ["vivo.zhiye.com"]],
  iflytek: [["iflytek.zhiye.com"]],
  megvii: [["app.mokahr.com", "/megviihr/"]],
  deepseek: [["app.mokahr.com", "/high-flyer/"]],
  galaxyuniversal: [["app.mokahr.com", "/yinhetongyong/"]],
  stepfun: [["app.mokahr.com", "/step/"]],
  cambricon: [["app.mokahr.com", "/cambricon/"]],
  geely: [["app.mokahr.com", "/geely/"]],
  xpeng: [["xiaopeng.jobs.feishu.cn"]],
  weride: [["app.mokahr.com", "/jingchi/"], ["jobs.lever.co", "/weride/"]],
  hoyoverse: [["jobs.smartrecruiters.com", "/hoyoverse/"]],
};

export const OFFICIAL_COMPANIES = [
  ["tencent", "腾讯"], ["bytedance", "字节跳动"], ["alibaba", "阿里巴巴"], ["meituan", "美团"],
  ["xiaohongshu", "小红书"], ["jd", "京东"], ["kuaishou", "快手"], ["baidu", "百度"],
  ["netease", "网易"], ["didi", "滴滴"], ["bilibili", "哔哩哔哩"], ["pdd", "拼多多"],
  ["huawei", "华为"], ["weibo", "微博"], ["mihoyo", "米哈游"], ["pingan", "平安"],
  ["trip", "携程"], ["unitree", "宇树科技"], ["byd", "比亚迪"], ["antgroup", "蚂蚁集团"],
  ["liauto", "理想汽车"], ["sf", "顺丰"], ["oppo", "OPPO"], ["xiaomi", "小米"],
  ["nio", "蔚来"], ["minimax", "MiniMax"], ["moonshot", "月之暗面"], ["zhipu", "智谱AI"],
  ["iqiyi", "爱奇艺"], ["agibot", "智元机器人"], ["lilith", "莉莉丝"], ["zerooneai", "零一万物"],
  ["baichuan", "百川智能"], ["sensetime", "商汤"], ["horizonrobotics", "地平线"], ["vivo", "vivo"],
  ["iflytek", "科大讯飞"], ["megvii", "旷视"], ["deepseek", "DeepSeek"], ["galaxyuniversal", "银河通用"],
  ["stepfun", "阶跃星辰"], ["cambricon", "寒武纪"], ["geely", "吉利"], ["xpeng", "小鹏汽车"],
  ["weride", "文远知行"], ["hoyoverse", "HoYoverse"],
].map(([id, name]) => ({
  id,
  name,
  scope: MIXED_SCOPE_COMPANIES.has(id) ? "all" : "campus",
  requireCampusEvidence: MIXED_SCOPE_COMPANIES.has(id),
  requirePostId: !["trip", "unitree"].includes(id),
  industry: COMPANY_INDUSTRIES[id] || "互联网/科技",
  linkRules: COMPANY_LINK_RULES[id] || [],
}));

function text(value) {
  return value == null ? "" : String(value).trim();
}

function stableId(value) {
  let hash = 2166136261;
  for (const character of value.toLowerCase()) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `official-${(hash >>> 0).toString(36)}`;
}

function splitLocations(value) {
  return [...new Set(text(value).split(/\s*\/\s*|[、，,；;|]/).map(item => item.trim()).filter(Boolean))];
}

function hasCampusEvidence(position) {
  const evidence = [position.title, position.project, position.recruit_label, position.bgs]
    .map(text)
    .join(" ");
  return /校招|校园|应届|毕业生|管培|实习|graduate|campus|intern/i.test(evidence)
    && !/仅社招|社会招聘专场/.test(evidence);
}

export function validateOfficialApplyUrl(company, value, postId = "") {
  let url;
  try {
    url = new URL(text(value));
  } catch {
    return { ok: false, reason: "投递链接格式无效" };
  }
  if (url.protocol !== "https:") return { ok: false, reason: "投递链接不是 HTTPS" };
  const hostname = url.hostname.toLowerCase();
  const pathname = `${url.pathname}/`.replace(/\/+/g, "/").toLowerCase();
  const matched = company.linkRules.some(([allowedHost, requiredPath]) => {
    const hostMatches = hostname === allowedHost || hostname.endsWith(`.${allowedHost}`);
    return hostMatches && (!requiredPath || pathname.includes(requiredPath.toLowerCase()));
  });
  if (!matched) return { ok: false, reason: `链接不属于${company.name}已核验的招聘入口` };
  if (company.requirePostId && postId) {
    let decodedUrl = url.href;
    try { decodedUrl = decodeURIComponent(decodedUrl); } catch { /* keep encoded URL */ }
    if (!decodedUrl.includes(postId)) return { ok: false, reason: "官网链接中的岗位 ID 与岗位记录不一致" };
  }
  return { ok: true, url: url.href };
}

function parseBatch(value) {
  if (/实习/.test(value)) return "实习";
  if (/春招/.test(value)) return "春招";
  if (/提前/.test(value)) return "提前批";
  if (/补录/.test(value)) return "补录";
  return "正式批";
}

function parseCohort(value) {
  const match = value.match(/20\d{2}(?=\s*(?:届|校园招聘))|\d{2}(?=\s*届)/);
  if (!match) return "不限";
  return `${match[0].length === 2 ? "20" : ""}${match[0]}届`;
}

export function normalizeOfficialPosition(company, position, checkedDate, previousById = new Map(), source = "") {
  const postId = text(position.post_id);
  const role = text(position.title) || "岗位名称待确认";
  const program = text(position.project) || text(position.recruit_label) || "校园招聘";
  const rawLocation = text(position.work_cities);
  const locations = splitLocations(rawLocation);
  const link = validateOfficialApplyUrl(company, position.apply_url, postId);
  if (!link.ok) throw new Error(link.reason);
  const id = stableId(`${company.id}|${postId || role}|${link.url || rawLocation}`);
  const previous = previousById.get(id);
  const displayLocation = rawLocation.length > 180
    ? `${locations.slice(0, 8).join(" / ")} / 等 ${locations.length} 地`
    : rawLocation || "地点待确认";
  const cohortText = `${role} ${program} ${position.recruit_label || ""}`;
  return {
    id,
    company: company.name,
    role,
    positions: [role],
    location: displayLocation,
    locations: locations.slice(0, 30),
    industry: company.industry || "互联网/科技",
    sourceIndustry: company.industry || "互联网/科技",
    cohort: parseCohort(cohortText),
    batch: parseBatch(cohortText),
    program,
    deadline: "以官网为准",
    education: "",
    applyUrl: link.url,
    sourceId: `official:${company.id}`,
    sourceName: `${company.name}招聘官网`,
    sourceNames: [`${company.name}招聘官网`],
    sourceHomepage: source,
    sourcePostId: postId,
    linkValidation: "company-allowlist",
    firstSeen: previous?.firstSeen || checkedDate,
    lastSeen: checkedDate,
    confirmedBy: 1,
  };
}

export function prepareOfficialSnapshot(results, previous = { jobs: [] }, checkedAt = new Date().toISOString()) {
  const checkedDate = checkedAt.slice(0, 10);
  const previousJobs = Array.isArray(previous.jobs) ? previous.jobs : [];
  const previousById = new Map(previousJobs.map(job => [job.id, job]));
  const previousBySource = new Map();
  previousJobs.forEach(job => {
    if (!previousBySource.has(job.sourceId)) previousBySource.set(job.sourceId, []);
    previousBySource.get(job.sourceId).push(job);
  });

  const sources = [];
  const jobs = [];
  results.forEach(result => {
    const sourceId = `official:${result.company.id}`;
    if (!result.ok) {
      const retained = previousBySource.get(sourceId) || [];
      jobs.push(...retained);
      sources.push({ id: sourceId, name: result.company.name, state: "error", count: retained.length, message: result.message || "未能读取官网" });
      return;
    }
    const normalized = [];
    const rejectedLinks = [];
    result.positions.forEach(position => {
      try {
        normalized.push(normalizeOfficialPosition(result.company, position, checkedDate, previousById, result.source));
      } catch (error) {
        rejectedLinks.push({ postId: text(position.post_id), reason: error.message });
      }
    });
    if (result.positions.length && !normalized.length) {
      const retained = previousBySource.get(sourceId) || [];
      jobs.push(...retained);
      sources.push({
        id: sourceId,
        name: result.company.name,
        state: "error",
        count: retained.length,
        message: `本轮 ${rejectedLinks.length} 条链接全部未通过公司归属校验`,
        rejectedLinks: rejectedLinks.length,
      });
      return;
    }
    jobs.push(...normalized);
    sources.push({
      id: sourceId,
      name: result.company.name,
      state: "ok",
      count: normalized.length,
      source: result.source,
      rawCount: result.rawCount,
      filteredOut: result.filteredOut,
      rejectedLinks: rejectedLinks.length,
    });
  });

  const uniqueJobs = [...new Map(jobs.map(job => [job.id, job])).values()];
  const successfulSources = sources.filter(source => source.state === "ok").length;
  if (successfulSources < 5) throw new Error(`仅 ${successfulSources} 个官网抓取成功，为避免覆盖有效快照已停止更新`);
  if (previousJobs.length && uniqueJobs.length < previousJobs.length * 0.65) {
    throw new Error("岗位总数骤降超过 35%，需要人工核对");
  }
  return { version: 1, checkedAt, updatedAt: checkedAt, provider: packageVersion, sources, jobs: uniqueJobs };
}

function parseCliOutput(stdout) {
  const line = stdout.trim().split("\n").reverse().find(item => item.trim().startsWith("{"));
  if (!line) throw new Error("命令未返回 JSON");
  const payload = JSON.parse(line);
  if (!payload.ok || !Array.isArray(payload.positions)) throw new Error(payload.message || payload.error || "返回格式发生变化");
  return payload;
}

async function crawlCompany(company) {
  try {
    const { stdout } = await execFileAsync("pnpm", [
      "--silent", "dlx", packageVersion, company.id, "all",
      "--scope", company.scope, "--page-size", "100", "--compact",
    ], { timeout: 120000, maxBuffer: 100 * 1024 * 1024 });
    const payload = parseCliOutput(stdout);
    const positions = company.requireCampusEvidence
      ? payload.positions.filter(hasCampusEvidence)
      : payload.positions;
    return {
      company,
      ok: true,
      positions,
      rawCount: payload.positions.length,
      filteredOut: payload.positions.length - positions.length,
      source: payload.source || "",
    };
  } catch (error) {
    return { company, ok: false, positions: [], message: error.stderr?.trim() || error.message };
  }
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let index = 0;
  async function next() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await worker(items[current]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, next));
  return results;
}

async function update() {
  let previous = { jobs: [] };
  try {
    previous = JSON.parse(await readFile(target, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const results = await mapWithConcurrency(OFFICIAL_COMPANIES, 4, crawlCompany);
  const snapshot = prepareOfficialSnapshot(results, previous);
  const temporary = new URL(`${target.href}.tmp`);
  await writeFile(temporary, `${JSON.stringify(snapshot)}\n`);
  await rename(temporary, target);
  const failed = snapshot.sources.filter(source => source.state === "error");
  console.log(`官网岗位快照已更新：${snapshot.jobs.length} 条，${snapshot.sources.length - failed.length}/${snapshot.sources.length} 个来源成功。`);
  if (failed.length) console.warn(`失败来源：${failed.map(source => source.name).join("、")}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  update().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
