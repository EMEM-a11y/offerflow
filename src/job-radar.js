import { assetUrl } from "./asset-url.js";

export const JOB_REFRESH_WORKFLOW_URL = "https://github.com/EMEM-a11y/offerflow/actions/workflows/update-official-jobs.yml";

export const JOB_SOURCES = [
  {
    id: "official-live",
    name: "企业招聘官网",
    url: assetUrl("data/official-live-jobs.json"),
    homepage: "https://github.com/HA7CH/job-pro",
    cadence: "官网定时采集 · 每日 2 次",
    license: "MIT"
  },
  {
    id: "xiaozhao-radar",
    name: "校招雷达公开聚合",
    url: assetUrl("data/campus-jobs-snapshot.json"),
    homepage: "https://github.com/jiabaobei/xiaozhao-radar",
    cadence: "内置快照 · 2026-09-03",
    license: "Apache-2.0"
  },
  {
    id: "xixicc2027",
    name: "2027 届秋招信息汇总",
    url: assetUrl("data/radar-updates.json"),
    homepage: "https://github.com/xixicc186/xixicc2027",
    cadence: "定时检查快照 · 以最近成功更新时间为准",
    license: "公开数据源"
  }
];

export const INDUSTRY_GROUPS = [
  "互联网/科技",
  "半导体/硬件",
  "金融",
  "消费/零售",
  "汽车/新能源",
  "制造/能源",
  "央国企/公共部门",
  "其他"
];

export const JOB_ROLE_CATEGORIES = ["全部方向", "产品/项目", "运营/增长", "数据/分析", "技术/研发", "设计/创意", "市场/商务", "职能/支持", "其他"];

const JOB_ROLE_CATEGORY_RULES = [
  ["产品/项目", /产品|项目管理|项目经理|产品策划|产品运营/i],
  ["运营/增长", /运营|增长|用户|内容|社区|活动|商业化|平台治理/i],
  ["数据/分析", /数据|分析|商业分析|经营分析|策略|BI\b|SQL/i],
  ["技术/研发", /研发|开发|工程|算法|机器学习|人工智能|AI\b|测试|架构|运维|安全|后端|前端|客户端|芯片|硬件/i],
  ["设计/创意", /设计|视觉|交互|UX\b|UI\b|创意|美术|动画/i],
  ["市场/商务", /市场|营销|品牌|商务|销售|客户|渠道|公关|广告/i],
  ["职能/支持", /人力|招聘|财务|会计|法务|行政|采购|供应链|审计|风控|合规|战略|管理培训|管培/i],
];

export function jobRoleCategories(job) {
  const value = [job?.role, ...(job?.positions || []), job?.program].filter(Boolean).join(" ");
  const categories = JOB_ROLE_CATEGORY_RULES.filter(([, pattern]) => pattern.test(value)).map(([category]) => category);
  return categories.length ? categories : ["其他"];
}

export const FALLBACK_RADAR_JOBS = [
  {
    id: "fallback-baidu-2027",
    company: "百度",
    role: "技术类、产品类、专业服务和管理支持类、政企行业解决方案和服务类",
    positions: ["产品类", "技术类", "专业服务和管理支持类"],
    location: "北京 / 上海 / 广州 / 深圳",
    locations: ["北京", "上海", "广州", "深圳"],
    industry: "互联网/科技",
    cohort: "2027届",
    batch: "正式批",
    program: "2027 届校园招聘",
    deadline: "招满即止",
    applyUrl: "",
    sourceId: "fallback",
    sourceName: "离线示例",
    sourceNames: ["离线示例"],
    firstSeen: "2026-09-01",
    lastSeen: "2026-09-05",
    confirmedBy: 1
  },
  {
    id: "fallback-sasac-2027",
    company: "中国航天科工",
    role: "研发、项目管理、职能管理",
    positions: ["项目管理", "研发", "职能管理"],
    location: "全国",
    locations: ["全国"],
    industry: "央国企/公共部门",
    cohort: "2027届",
    batch: "正式批",
    program: "2027 届秋季招聘",
    deadline: "以官网为准",
    applyUrl: "https://www.sasac.gov.cn/n2588035/n2588325/n2588350/index.html",
    sourceId: "fallback",
    sourceName: "离线示例",
    sourceNames: ["离线示例"],
    firstSeen: "2026-09-02",
    lastSeen: "2026-09-05",
    confirmedBy: 1
  },
  {
    id: "fallback-xpeng-2027",
    company: "小鹏汽车",
    role: "智能研发类、汽车研发类、测试类、芯片类、产品运营类",
    positions: ["产品运营类", "智能研发类", "汽车研发类"],
    location: "广州 / 深圳 / 上海 / 北京",
    locations: ["广州", "深圳", "上海", "北京"],
    industry: "汽车/新能源",
    cohort: "2027届",
    batch: "正式批",
    program: "探索者计划",
    deadline: "招满即止",
    applyUrl: "https://xiaopeng.jobs.feishu.cn/campus/m/",
    sourceId: "fallback",
    sourceName: "离线示例",
    sourceNames: ["离线示例"],
    firstSeen: "2026-08-29",
    lastSeen: "2026-09-05",
    confirmedBy: 1
  }
];

const OFFICIAL_LINK_POLICIES = [
  {
    company: /\u5b57\u8282\u8df3\u52a8|bytedance/i,
    hosts: [/(^|\.)jobs\.bytedance\.com$/, /(^|\.)seed\.bytedance\.com$/],
    officialUrl: "https://jobs.bytedance.com/campus/position",
  },
  {
    company: /\u6c90[\u77b3\u7ae5]|moonton/i,
    hosts: [/(^|\.)moonton\.jobs\.feishu\.cn$/, /(^|\.)cn\.moonton\.com$/],
    officialUrl: "https://moonton.jobs.feishu.cn/campus",
  },
  { company: /\u963f\u91cc|\u6dd8\u5929/, hosts: [/(^|\.)alibaba\.com$/] },
  { company: /\u8682\u8681\u96c6\u56e2/, hosts: [/(^|\.)antgroup\.com$/] },
  { company: /\u817e\u8baf/, hosts: [/(^|\.)join\.qq\.com$/] },
  { company: /\u7f8e\u56e2/, hosts: [/(^|\.)zhaopin\.meituan\.com$/] },
  { company: /\u5c0f\u7ea2\u4e66/, hosts: [/(^|\.)job\.xiaohongshu\.com$/] },
  { company: /^\u4eac\u4e1c(?:\u96c6\u56e2|\u79d1\u6280|\u7269\u6d41|\u5065\u5eb7|\u96f6\u552e|\u5de5\u4e1a)?$/, hosts: [/(^|\.)campus\.jd\.com$/] },
  { company: /\u5feb\u624b/, hosts: [/(^|\.)campus\.kuaishou\.cn$/] },
  { company: /\u767e\u5ea6/, hosts: [/(^|\.)talent\.baidu\.com$/] },
  { company: /\u7f51\u6613/, hosts: [/(^|\.)hr\.163\.com$/] },
  { company: /\u6ef4\u6ef4/, hosts: [/(^|\.)talent\.didiglobal\.com$/] },
  { company: /\u54d4\u54e9\u54d4\u54e9/, hosts: [/(^|\.)jobs\.bilibili\.com$/] },
  { company: /\u62fc\u591a\u591a/, hosts: [/(^|\.)careers\.pinduoduo\.com$/, /(^|\.)careers\.pddglobalhr\.com$/] },
  { company: /\u5c0f\u7c73/, hosts: [/(^|\.)xiaomi\.jobs\.f\.mioffice\.cn$/] },
  { company: /\u851a\u6765/, hosts: [/(^|\.)nio\.jobs\.feishu\.cn$/] },
  { company: /minimax/i, hosts: [/(^|\.)vrfi1sk8a0\.jobs\.feishu\.cn$/] },
  { company: /\u534e\u4e3a/, hosts: [/(^|\.)career\.huawei\.com$/] },
  { company: /\u5fae\u535a/, urls: [/app\.mokahr\.com\/(?:campus-recruitment|social-recruitment)\/sina\//i] },
  { company: /\u7c73\u54c8\u6e38/, hosts: [/(^|\.)jobs\.mihoyo\.com$/] },
  { company: /\u5e73\u5b89/, hosts: [/(^|\.)campus\.pingan\.com$/] },
  { company: /\u643a\u7a0b|trip\.com/i, hosts: [/(^|\.)careers\.ctrip\.com$/] },
  { company: /\u5b87\u6811/, hosts: [/(^|\.)www\.unitree\.com$/] },
  { company: /\u6bd4\u4e9a\u8fea|byd/i, hosts: [/(^|\.)job\.byd\.com$/] },
  { company: /\u7406\u60f3\u6c7d\u8f66/, hosts: [/(^|\.)www\.lixiang\.com$/] },
  { company: /\u987a\u4e30/, hosts: [/(^|\.)campus\.sf-express\.com$/] },
  { company: /oppo/i, hosts: [/(^|\.)careers\.oppo\.com$/] },
  { company: /\u6708\u4e4b\u6697\u9762|moonshot/i, urls: [/app\.mokahr\.com\/social-recruitment\/moonshot\//i] },
  { company: /\u667a\u8c31/, hosts: [/(^|\.)zhipu-ai\.jobs\.feishu\.cn$/, /(^|\.)zhipuai\.jobs\.feishu\.cn$/] },
  { company: /\u7231\u5947\u827a|iqiyi/i, hosts: [/(^|\.)careers\.iqiyi\.com$/] },
  { company: /\u667a\u5143(?:\u673a\u5668\u4eba)?|agibot/i, hosts: [/(^|\.)agirobot\.jobs\.feishu\.cn$/] },
  { company: /\u8389\u8389\u4e1d|lilith/i, hosts: [/(^|\.)lilithgames\.jobs\.feishu\.cn$/] },
  { company: /\u96f6\u4e00\u4e07\u7269|01\.ai/i, hosts: [/(^|\.)01ai\.jobs\.feishu\.cn$/] },
  { company: /\u767e\u5ddd\u667a\u80fd/, urls: [/cq6qe6bvfr6\.jobs\.feishu\.cn\/baichuanzhaopin\//i] },
  { company: /\u5546\u6c64|sensetime/i, hosts: [/(^|\.)hr\.sensetime\.com$/] },
  { company: /\u5730\u5e73\u7ebf|horizon robotics/i, urls: [/wecruit\.hotjob\.cn\/.*su6409ef49bef57c635fd390a6/i] },
  { company: /vivo/i, hosts: [/(^|\.)hr-campus\.vivo\.com$/, /(^|\.)vivo\.zhiye\.com$/] },
  { company: /\u79d1\u5927\u8baf\u98de|iflytek/i, hosts: [/(^|\.)iflytek\.zhiye\.com$/] },
  { company: /\u65f7\u89c6|megvii/i, urls: [/app\.mokahr\.com\/(?:campus_apply|social-recruitment)\/megviihr\//i] },
  { company: /deepseek|\u6df1\u5ea6\u6c42\u7d22/i, urls: [/app\.mokahr\.com\/social-recruitment\/high-flyer\//i] },
  { company: /\u94f6\u6cb3\u901a\u7528/, urls: [/app\.mokahr\.com\/social-recruitment\/yinhetongyong\//i] },
  { company: /\u9636\u8dc3\u661f\u8fb0|stepfun/i, urls: [/app\.mokahr\.com\/social-recruitment\/step\//i] },
  { company: /\u5bd2\u6b66\u7eaa|cambricon/i, urls: [/app\.mokahr\.com\/(?:campus-recruitment|social-recruitment)\/cambricon\//i] },
  { company: /\u5409\u5229/, urls: [/app\.mokahr\.com\/social-recruitment\/geely\//i] },
  { company: /\u5c0f\u9e4f(?:\u6c7d\u8f66)?|xpeng/i, hosts: [/(^|\.)xiaopeng\.jobs\.feishu\.cn$/] },
  { company: /\u6587\u8fdc\u77e5\u884c|weride/i, urls: [/app\.mokahr\.com\/(?:campus_apply|apply)\/jingchi\//i, /jobs\.lever\.co\/weride\//i] },
  { company: /hoyoverse/i, urls: [/jobs\.smartrecruiters\.com\/hoyoverse\//i] },
  { company: /\u4e2d\u82af\u56fd\u9645/, hosts: [/(^|\.)smics\.zhiye\.com$/] },
  { company: /applovin/i, hosts: [/(^|\.)applovin\.com$/] },
  { company: /\u5b81\u5fb7\u65f6\u4ee3/, urls: [/mokahr\.com\/campus-recruitment\/catlhr\//] },
  { company: /\u79be\u8fc8/, urls: [/mokahr\.com\/campus-recruitment\/hoymiles\//] },
  { company: /4399/, hosts: [/(^|\.)4399om\.com$/] },
  { company: /\u8c6a\u8fc8/, hosts: [/(^|\.)himile\.zhiye\.com$/] },
  { company: /\u4e0a\u6c7d/, hosts: [/(^|\.)saicmotor\.com$/] },
  { company: /\u5e7f\u7535\u8fd0\u901a/, urls: [/mokahr\.com\/campus-recruitment\/grgbanking\//] },
  { company: /\u664b\u534e\u96c6\u6210\u7535\u8def/, hosts: [/(^|\.)jhicc\.com$/] },
  { company: /\u7ea2\u661f\u7f8e\u51ef\u9f99/, hosts: [/(^|\.)mmall\.com$/] },
  { company: /\u4eac\u4e1c\u65b9/, hosts: [/(^|\.)boe\.m\.zhiye\.com$/] },
];

const COMPANY_NAME_REPLACEMENTS = [
  [/\u54d7\u54e9\u54d7\u54e9/g, "\u54d4\u54e9\u54d4\u54e9"],
  [/\u8bc1\u52b5/g, "\u8bc1\u5238"],
  [/\u6c90\u7ae5/g, "\u6c90\u77b3"],
  [/minmax/gi, "minimax"],
  [/pony\s*ai/gi, "\u5c0f\u9a6c\u667a\u884c"],
];

const TRACKING_PARAMS = /^(recommend|recommendCode|shareId|shareSource|spread|token|sessionid|sourceToken|referral_code|code|inviter_code|emplErp)$/i;
const OPAQUE_LINK_HOSTS = new Set(["dwz.cn", "dqr.cn"]);

function text(value) {
  return value == null ? "" : String(value).trim();
}

function normalizeCompanyName(value) {
  let result = text(value);
  COMPANY_NAME_REPLACEMENTS.forEach(([pattern, replacement]) => {
    result = result.replace(pattern, replacement);
  });
  return result;
}

function list(value) {
  if (Array.isArray(value)) return value.map(text).filter(Boolean);
  return text(value).split(/[、，,；;|]/).map(item => item.trim()).filter(Boolean);
}

function stableId(parts) {
  const raw = parts.map(text).join("|").toLowerCase();
  let hash = 2166136261;
  for (let index = 0; index < raw.length; index += 1) {
    hash ^= raw.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `radar-${(hash >>> 0).toString(36)}`;
}

function companyCore(value) {
  return normalizeCompanyName(value)
    .split(/[\u2014\u2013-]|\uff08|\(/)[0]
    .replace(/\s+/g, "")
    .replace(/\u80a1\u4efd\u6709\u9650\u516c\u53f8|\u6709\u9650\u8d23\u4efb\u516c\u53f8|\u6709\u9650\u516c\u53f8|\u63a7\u80a1\u96c6\u56e2|\u96c6\u56e2|\u79d1\u6280|\u516c\u53f8/g, "")
    .toLowerCase();
}

function sameCompanyFamily(first, second) {
  const a = companyCore(first);
  const b = companyCore(second);
  if (!a || !b) return false;
  if (a === b) return true;
  return Math.min(a.length, b.length) >= 2 && (a.includes(b) || b.includes(a));
}

function parsedHttpUrl(value) {
  try {
    const url = new URL(text(value));
    return /^https?:$/.test(url.protocol) ? url : null;
  } catch {
    return null;
  }
}

function canonicalRecruitmentUrl(value) {
  const url = parsedHttpUrl(value);
  if (!url) return "";
  url.hash = "";
  [...url.searchParams.keys()].forEach(key => {
    if (TRACKING_PARAMS.test(key)) url.searchParams.delete(key);
  });
  return url.href.replace(/\/$/, "");
}

function recruitmentTenantKey(value) {
  const url = parsedHttpUrl(value);
  if (!url) return "";
  const host = url.hostname.toLowerCase();
  if (/\.(?:jobs\.feishu\.cn|zhiye\.com|f\.mioffice\.cn)$/.test(host)) return host;
  if (host === "app.mokahr.com") {
    const tenant = url.pathname.match(/\/(?:campus-recruitment|social-recruitment|campus_apply|apply)\/([^/]+)/i)?.[1];
    if (tenant) return `${host}/${tenant.toLowerCase()}`;
  }
  if (host === "wecruit.hotjob.cn") {
    const tenant = url.pathname.match(/\/(su[a-z0-9]+)/i)?.[1];
    if (tenant) return `${host}/${tenant.toLowerCase()}`;
  }
  return "";
}

function linkPolicy(company) {
  return OFFICIAL_LINK_POLICIES.find(policy => policy.company.test(text(company)));
}

function policyMatchesUrl(policy, value) {
  if (!policy) return false;
  const url = parsedHttpUrl(value);
  if (!url) return false;
  return Boolean(policy.hosts?.some(pattern => pattern.test(url.hostname.toLowerCase())) || policy.urls?.some(pattern => pattern.test(url.href)));
}

function hasUnrelatedCompanies(rows) {
  const companies = [...new Set(rows.map(row => row.company))];
  return companies.some((company, index) => companies.slice(index + 1).some(other => !sameCompanyFamily(company, other)));
}

export function validateRadarJobLinks(jobs) {
  const prepared = jobs.map(job => {
    const originalApplyUrl = text(job.applyUrl);
    const policy = linkPolicy(job.company);
    if (!originalApplyUrl) return { ...job, linkStatus: "missing", linkNote: "\u539f数据未提供投递链接" };
    if (!parsedHttpUrl(originalApplyUrl)) {
      return { ...job, applyUrl: "", originalApplyUrl, linkStatus: "invalid", linkNote: "\u94fe接格式无效，已禁止打开" };
    }
    if (policy && !policyMatchesUrl(policy, originalApplyUrl)) {
      if (policy.officialUrl) {
        return {
          ...job,
          applyUrl: policy.officialUrl,
          originalApplyUrl,
          linkStatus: "corrected",
          linkNote: "\u805a合源链接与公司不匹配，已替换为官方招聘入口",
        };
      }
      return { ...job, applyUrl: "", originalApplyUrl, linkStatus: "mismatch", linkNote: "\u94fe接域名与公司不匹配，已禁止打开" };
    }
    const knownOwners = OFFICIAL_LINK_POLICIES.filter(candidate => policyMatchesUrl(candidate, originalApplyUrl));
    if (!policy && knownOwners.length) {
      return { ...job, applyUrl: "", originalApplyUrl, linkStatus: "mismatch", linkNote: "链接属于其他已知公司的招聘入口，已禁止打开" };
    }
    if (OPAQUE_LINK_HOSTS.has(parsedHttpUrl(originalApplyUrl).hostname.toLowerCase())) {
      return { ...job, applyUrl: "", originalApplyUrl, linkStatus: "unverified", linkNote: "\u77ed链接无法在打开前确认公司归属，已暂停使用" };
    }
    return {
      ...job,
      originalApplyUrl,
      linkStatus: policy ? "verified" : "source",
      linkNote: policy ? "\u516c司名与官方招聘域名匹配" : "\u94fe接来自聚合源，未标记为官网已核验",
    };
  });

  const rowsByUrl = new Map();
  const rowsByTenant = new Map();
  prepared.forEach(job => {
    const key = canonicalRecruitmentUrl(job.applyUrl);
    if (key) {
      if (!rowsByUrl.has(key)) rowsByUrl.set(key, []);
      rowsByUrl.get(key).push(job);
    }
    const tenantKey = recruitmentTenantKey(job.applyUrl);
    if (tenantKey) {
      if (!rowsByTenant.has(tenantKey)) rowsByTenant.set(tenantKey, []);
      rowsByTenant.get(tenantKey).push(job);
    }
  });

  return prepared.map(job => {
    const key = canonicalRecruitmentUrl(job.applyUrl);
    const relatedRows = key ? rowsByUrl.get(key) || [] : [];
    const tenantKey = recruitmentTenantKey(job.applyUrl);
    const relatedTenantRows = tenantKey ? rowsByTenant.get(tenantKey) || [] : [];
    const urlConflict = key && hasUnrelatedCompanies(relatedRows);
    const tenantConflict = tenantKey && hasUnrelatedCompanies(relatedTenantRows);
    if (!urlConflict && !tenantConflict) return job;
    const policy = linkPolicy(job.company);
    if (policyMatchesUrl(policy, job.applyUrl)) return job;
    return {
      ...job,
      applyUrl: "",
      linkStatus: "conflict",
      linkNote: "\u540c一链接被分配给多个不相关公司，已禁止打开",
    };
  });
}

function parseBatch(value) {
  const raw = text(value).replace(/^批次[:：]?/, "");
  if (raw.includes("提前")) return "提前批";
  if (raw.includes("实习")) return "实习";
  if (raw.includes("春招")) return "春招";
  if (raw.includes("补录")) return "补录";
  if (raw.includes("正式") || raw.includes("秋招")) return "正式批";
  return raw ? "其他" : "待确认";
}

function parseCohort(...values) {
  const joined = values.map(text).join(" ");
  const match = joined.match(/20\d{2}届|\d{2}届/);
  if (!match) return "不限";
  return match[0].length === 3 ? `20${match[0]}` : match[0];
}

function normalizeIndustry(value) {
  const raw = text(value);
  if (/互联网|科技|软件|游戏|通信|电商|人工智能|AI/i.test(raw)) return "互联网/科技";
  if (/半导体|芯片|硬件|电子/.test(raw)) return "半导体/硬件";
  if (/银行|金融|证券|保险|基金/.test(raw)) return "金融";
  if (/快消|零售|消费|食品|农业/.test(raw)) return "消费/零售";
  if (/汽车|新能源车/.test(raw)) return "汽车/新能源";
  if (/制造|装备|重工|能源|电力|化工|建筑|地产|物流|交通/.test(raw)) return "制造/能源";
  if (/央国企|国企|军工|研究所|事业单位|高校|政府/.test(raw)) return "央国企/公共部门";
  return "其他";
}

function splitRoleDirections(value) {
  const roles = (Array.isArray(value) ? value : [value])
    .flatMap(item => text(item).replaceAll("\\n", "\n").replaceAll("\\t", "\t").split(/[、，,；;|｜\/／\n\t]|\s{2,}|\s+·\s+/))
    .map(item => item.replace(/[（）()].*?[）)]/g, "").trim())
    .map(item => item.replace(/(?:等|等岗位|等方向)[。.！!]?$/, "").trim())
    .filter(item => item && item !== "-" && item.length <= 42);
  return [...new Set(roles)].slice(0, 12);
}

function normalizeXiaozhao(item) {
  const company = normalizeCompanyName(item.c) || "公司待确认";
  const role = text(item.p) || "岗位方向待确认";
  const location = text(item.l) || "地点待确认";
  const batch = parseBatch(item.w || item.t);
  const cohort = parseCohort(item.w, item.t, role);
  return {
    id: stableId([company, role, location, batch, item.u]),
    company,
    role,
    positions: splitRoleDirections(role),
    location,
    locations: list(location.replaceAll("/", "、")),
    industry: normalizeIndustry(text(item.ind) || text(item.t)),
    sourceIndustry: text(item.ind) || text(item.t) || "其他",
    cohort,
    batch,
    program: text(item.w).replace(/^批次[:：]?/, "") || `${cohort}校园招聘`,
    deadline: text(item.d) || "待确认",
    education: text(item.e),
    applyUrl: text(item.u),
    sourceId: "xiaozhao-radar",
    sourceName: text(item.s) || "校招雷达公开聚合",
    sourceNames: [text(item.s) || "校招雷达公开聚合"],
    firstSeen: "",
    lastSeen: "2026-09-03",
    confirmedBy: 1
  };
}

export function normalizeXixicc(item) {
  const company = normalizeCompanyName(item.company) || "公司待确认";
  const positions = list(item.positions);
  const role = positions.join("、") || "岗位方向待确认";
  const locations = list(item.locations);
  const batch = parseBatch(item.batch);
  return {
    id: stableId([company, item.program, role, locations.join("、"), batch]),
    company,
    role,
    positions: splitRoleDirections(positions),
    location: locations.join(" / ") || "地点待确认",
    locations,
    industry: normalizeIndustry(item.industry),
    sourceIndustry: text(item.industry) || "其他",
    cohort: text(item.cohort) || "不限",
    batch,
    program: text(item.program) || `${text(item.cohort) || "校园"}${batch}`,
    deadline: text(item.deadline) || "待确认",
    education: "",
    applyUrl: text(item.apply_url),
    sourceId: "xixicc2027",
    sourceName: "2027 届秋招信息汇总",
    sourceNames: ["2027 届秋招信息汇总"],
    firstSeen: text(item.first_seen),
    lastSeen: text(item.last_seen),
    confirmedBy: Number(item.confirmed_by) || 1
  };
}

function mergeJobs(jobs) {
  const merged = new Map();
  const linkStatusRank = { verified: 5, corrected: 4, source: 3, unverified: 2, conflict: 1, mismatch: 1, invalid: 1, missing: 0 };
  jobs.forEach(job => {
    const key = [job.company, job.batch, job.role.slice(0, 80), job.location].join("|").toLowerCase();
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, job);
      return;
    }
    existing.sourceNames = [...new Set([...existing.sourceNames, ...job.sourceNames])];
    existing.confirmedBy = Math.max(existing.confirmedBy, job.confirmedBy, existing.sourceNames.length);
    if ((linkStatusRank[job.linkStatus] || 0) > (linkStatusRank[existing.linkStatus] || 0)) {
      existing.applyUrl = job.applyUrl;
      existing.originalApplyUrl = job.originalApplyUrl;
      existing.linkStatus = job.linkStatus;
      existing.linkNote = job.linkNote;
    }
    existing.deadline = existing.deadline === "待确认" ? job.deadline : existing.deadline;
    existing.firstSeen ||= job.firstSeen;
    existing.lastSeen = [existing.lastSeen, job.lastSeen].filter(Boolean).sort().at(-1) || "";
  });
  return [...merged.values()];
}

export async function loadRadarJobs() {
  const status = [];
  const batches = await Promise.all(JOB_SOURCES.map(async source => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(source.url, { cache: "no-store", signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const raw = payload.jobs;
      if (!Array.isArray(raw) || !raw.length) throw new Error("数据源为空或格式发生变化");
      const jobs = source.id === "xiaozhao-radar" ? raw.map(normalizeXiaozhao) : raw;
      const sourceDetails = Array.isArray(payload.sources) ? payload.sources : [];
      const successfulDetails = sourceDetails.filter(item => item.state === "ok").length;
      const failedDetails = sourceDetails.length - successfulDetails;
      const rejectedLinks = sourceDetails.reduce((sum, item) => sum + (Number(item.rejectedLinks) || 0), 0);
      const detailSummary = sourceDetails.length
        ? ` · ${successfulDetails}/${sourceDetails.length} 官网成功${failedDetails ? `，${failedDetails} 家沿用上次结果` : ""}${rejectedLinks ? `，拦截 ${rejectedLinks} 条异常链接` : ""}`
        : "";
      status.push({
        ...source,
        cadence: payload.updatedAt ? `快照更新：${payload.updatedAt}${detailSummary}` : source.cadence,
        state: "ok",
        count: jobs.length,
        checkedAt: new Date().toISOString(),
        details: sourceDetails,
      });
      return jobs;
    } catch (error) {
      status.push({ ...source, state: "error", count: 0, checkedAt: new Date().toISOString(), message: error.message });
      return [];
    }
  }));
  const validatedJobs = validateRadarJobLinks(batches.flat());
  const jobs = mergeJobs(validatedJobs);
  const finalJobs = jobs.length ? jobs : validateRadarJobLinks(FALLBACK_RADAR_JOBS);
  const linkSummary = finalJobs.reduce((summary, job) => {
    summary[job.linkStatus || "missing"] = (summary[job.linkStatus || "missing"] || 0) + 1;
    return summary;
  }, {});
  return { jobs: finalJobs, status, offline: !jobs.length, linkSummary };
}
