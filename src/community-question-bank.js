const REPOSITORY_URL = "https://github.com/minnielv/beisen-quiz";
const COMMIT = "df6ef3312ee3fc676b657fc31a683dcc2ab6731e";
const CDN_ROOT = `https://cdn.jsdelivr.net/gh/minnielv/beisen-quiz@${COMMIT}/public/`;
const DATA_URL = `${CDN_ROOT}data/questions.json`;

export const COMMUNITY_BANK_SOURCE = {
  title: "北森社区整理题库",
  repositoryUrl: REPOSITORY_URL,
  note: "GitHub 社区整理，已过滤缺图、残缺和串题数据，非北森官方题库",
};

const SECTION_CONFIG = {
  verbal: { category: "verbal", subtype: "言语理解", expectedSeconds: 75 },
  data: { category: "data", subtype: "资料分析", expectedSeconds: 110 },
  graph: { category: "graphic", subtype: "图形推理", expectedSeconds: 80 },
};

// The pinned source snapshot contains rows where the previous answer analysis was
// accidentally prepended to the next question, and a few rows whose stem no longer
// matches their options. These IDs were checked against that exact snapshot and must
// not enter random practice.
const AUDITED_CONTENT_EXCLUSIONS = new Set([
  "verbal-2", "verbal-5", "verbal-38", "verbal-90", "verbal-98", "verbal-101",
  "verbal-105", "verbal-106", "verbal-107", "verbal-111", "verbal-133", "verbal-136",
  "verbal-141", "verbal-142", "verbal-146", "verbal-153", "verbal-158", "verbal-161",
  "verbal-162", "verbal-163", "verbal-167", "verbal-181", "verbal-182", "verbal-195",
  "verbal-199", "verbal-219", "verbal-223", "verbal-240", "verbal-251", "verbal-276",
  "verbal-297", "verbal-302", "verbal-303",
  "data-8", "data-10", "data-13", "data-20", "data-25", "data-26", "data-29",
  "data-37", "data-66", "data-88", "data-159", "data-196", "data-219", "data-238",
  "data-252",
  "graph-43",
]);

function normalizePrompt(value = "") {
  return String(value).replace(/\s+/g, "").replace(/[，。；：、“”‘’（）()]/g, "").toLowerCase();
}

function exactQuestionKey(question) {
  return [
    normalizePrompt(question.prompt),
    question.options.map(normalizePrompt).join("|"),
    (question.images || []).join("|"),
    (question.optionImages || []).join("|"),
  ].join("::");
}

function assetUrl(path = "") {
  return path ? new URL(path, CDN_ROOT).href : "";
}

function answerIndex(question) {
  return question.options.findIndex((option) => option.key === question.answer);
}

function optionContent(option = {}) {
  return option.text?.trim() || option.image?.trim() || "";
}

function hasCompleteOptions(question) {
  const options = question.options || [];
  const normalized = options.map((option) => normalizePrompt(optionContent(option)));
  return normalized.every(Boolean) && new Set(normalized).size === normalized.length;
}

function hasQuestionImage(question) {
  return (question.images || []).some(Boolean);
}

function isCompleteCommunityQuestion(question, config, answer) {
  if (!config || !question.stem?.trim() || question.options?.length < 2 || answer < 0) return false;
  if (AUDITED_CONTENT_EXCLUSIONS.has(question.id)) return false;
  if (/<|>|data-v=/i.test(question.stem) || !hasCompleteOptions(question)) return false;

  // In this source, every usable data-analysis item relies on its chart or table.
  if (question.sectionId === "data" && !hasQuestionImage(question)) return false;

  // Graphic odd-one-out items legitimately use only option images. Other graphic
  // prompts need a separate stimulus image; otherwise users see choices with no task.
  if (question.sectionId === "graph" && !hasQuestionImage(question) && !/(\u4e0d\u540c|\u7279\u6b8a)/.test(question.stem)) return false;

  return true;
}

function convertQuestion(question) {
  const config = SECTION_CONFIG[question.sectionId];
  const answer = answerIndex(question);
  if (!isCompleteCommunityQuestion(question, config, answer)) return null;

  return {
    id: `community-beisen-${question.id}`,
    paperId: "community-beisen-bank",
    source: "GitHub 社区整理 · minnielv/beisen-quiz（非北森官方）",
    sourceUrl: REPOSITORY_URL,
    category: config.category,
    subtype: config.subtype,
    difficulty: 3,
    prompt: question.stem.replace(/\s+/g, " ").trim(),
    options: question.options.map((option) => option.text?.trim() || `选项 ${option.key}`),
    optionImages: question.options.map((option) => assetUrl(option.image)),
    answer,
    explanation: question.explanation?.replace(/\s+/g, " ").trim() || "原社区题库未提供文字解析，请结合正确答案复盘。",
    images: (question.images || []).map(assetUrl).filter(Boolean),
    expectedSeconds: config.expectedSeconds,
  };
}

export async function loadCommunityQuestionBank(existingQuestions = []) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(DATA_URL, { signal: controller.signal });
    if (!response.ok) throw new Error(`题库请求失败：${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload?.questions)) throw new Error("题库格式不正确");

    const existingPrompts = new Set(existingQuestions.map((question) => normalizePrompt(question.prompt)));
    const seen = new Set();
    return payload.questions
      .map(convertQuestion)
      .filter(Boolean)
      .filter((question) => {
        const promptKey = normalizePrompt(question.prompt);
        const key = exactQuestionKey(question);
        if (!promptKey || existingPrompts.has(promptKey) || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  } finally {
    window.clearTimeout(timeout);
  }
}

export function createCommunityPaper(questions) {
  const counts = questions.reduce((result, question) => {
    result[question.category] = (result[question.category] || 0) + 1;
    return result;
  }, {});

  return {
    id: "community-beisen-bank",
    title: `北森社区题库 · ${questions.length} 题`,
    provider: "GitHub 社区整理",
    description: `言语 ${counts.verbal || 0}、资料 ${counts.data || 0}、图形 ${counts.graphic || 0}；已自动剔除缺图、缺选项、答案异常和题干串入解析的数据，每次随机抽取 40 题。非北森官方题库。`,
    sourceUrl: REPOSITORY_URL,
    durationMinutes: 55,
    questionLimit: 40,
    questionIds: questions.map((question) => question.id),
  };
}
