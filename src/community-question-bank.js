const REPOSITORY_URL = "https://github.com/minnielv/beisen-quiz";
const COMMIT = "df6ef3312ee3fc676b657fc31a683dcc2ab6731e";
const CDN_ROOT = `https://cdn.jsdelivr.net/gh/minnielv/beisen-quiz@${COMMIT}/public/`;
const DATA_URL = `${CDN_ROOT}data/questions.json`;

export const COMMUNITY_BANK_SOURCE = {
  title: "北森社区整理题库",
  repositoryUrl: REPOSITORY_URL,
  note: "非北森官方题库；自动检查不等于题源核验，未核对的图片题暂停出题",
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
  return Array.isArray(question?.options) ? question.options.findIndex((option) => option?.key === question.answer) : -1;
}

// Source p328_1 contains FIVE options, top to bottom. The upstream four-way
// crop merged A+B. Keep the original strip, never infer cuts from pixel gaps.
const REVIEWED_GRAPH_ID = "graph-110";

export function inspectCommunityQuestion(question) {
  const issues = [];
  if (!question || typeof question !== "object") return ["invalid-row"];
  if (question.images !== undefined && (!Array.isArray(question.images) || question.images.some(path => typeof path !== "string"))) return ["invalid-images"];
  const options = question.options;
  if (typeof question.id !== "string" || !/^(verbal|data|graph)-\d+$/.test(question.id)) issues.push("invalid-id");
  else if (!question.id.startsWith(`${question.sectionId}-`)) issues.push("id-section-mismatch");
  if (question.explanation !== undefined && typeof question.explanation !== "string") issues.push("invalid-explanation");
  if (!SECTION_CONFIG[question.sectionId]) issues.push("unknown-section");
  if (typeof question.stem !== "string" || !question.stem.trim()) issues.push("missing-stem");
  if (/<|>|data-v=/i.test(question.stem || "")) issues.push("markup-in-stem");
  if (!Array.isArray(options) || options.length < 2 || options.length > 6) issues.push("invalid-options");
  else {
    if (options.some((option, index) => option?.key !== String.fromCharCode(65 + index))) issues.push("option-label-order");
    if (options.some(option => !option || typeof option.text !== "string" || !option.text.trim())) issues.push("missing-option-text");
    const contents = options.map(option => `${option?.text || ""}|${option?.image || ""}`.replace(/\s/g, ""));
    if (new Set(contents).size !== contents.length) issues.push("duplicate-options");
    if (question.optionsAreImages && options.some(option => typeof option?.image !== "string" || !option.image.trim())) issues.push("missing-option-image");
    const paths = options.map(option => option?.image).filter(Boolean);
    if (new Set(paths).size !== paths.length) issues.push("duplicate-option-image");
    if (paths.some(path => (question.images || []).includes(path))) issues.push("stem-option-image-reused");
  }
  if (answerIndex(question) < 0) issues.push("invalid-answer");
  const assets = [...(question.images || []), ...(Array.isArray(options) ? options.map(option => option?.image).filter(Boolean) : [])];
  if (assets.some(path => typeof path !== "string" || !/^images\/[a-zA-Z0-9_\/-]+\.png$/.test(path) || path.includes(".."))) issues.push("invalid-asset-path");
  if (question.id === REVIEWED_GRAPH_ID && (question.answer !== "A" || question.images?.join() !== "images/graph/p327_4_4882.png" || options?.length !== 4 || options.some((option, index) => option?.image !== `images/graph/options/graph-110_${String.fromCharCode(65 + index)}.png`))) issues.push("reviewed-source-changed");
  if (AUDITED_CONTENT_EXCLUSIONS.has(question.id)) issues.push("known-content-defect");
  if (question.sectionId === "data" && !hasQuestionImage(question)) issues.push("missing-chart");
  if (question.sectionId === "graph" && !hasQuestionImage(question) && !/(不同|特殊)/.test(question.stem || "")) issues.push("missing-stimulus");
  // Page-order allocation and inferred option counts are not source reviews.
  if (["data", "graph"].includes(question.sectionId) && question.id !== REVIEWED_GRAPH_ID) issues.push("visual-source-review-pending");
  return issues;
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
  if (inspectCommunityQuestion(question).length) return null;
  const config = SECTION_CONFIG[question.sectionId];
  const answer = answerIndex(question);
  if (!isCompleteCommunityQuestion(question, config, answer)) return null;

  if (question.id === REVIEWED_GRAPH_ID) return {
    id: "community-beisen-graph-110-reviewed-v2",
    paperId: "community-beisen-bank",
    source: "社区原图核对 · 原 PDF 第 327–328 页（非北森官方）",
    sourceUrl: `${REPOSITORY_URL}/tree/${COMMIT}/public/images/graph`,
    category: "graphic", subtype: "图形推理", difficulty: 3,
    prompt: "接下来的图形应该是？第二张完整原图从上到下依次为 A、B、C、D、E，请按位置选择。",
    options: ["A · 原图第 1 项", "B · 原图第 2 项", "C · 原图第 3 项", "D · 原图第 4 项", "E · 原图第 5 项"],
    images: [assetUrl("images/graph/p327_4_4882.png"), assetUrl("images/graph/p328_1_4892.png")],
    answer: 0, explanation: question.explanation.replace(/\s+/g, " ").trim(), expectedSeconds: 80,
  };

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
    const ids = new Set();
    return payload.questions
      .map(convertQuestion)
      .filter(Boolean)
      .filter((question) => {
        const promptKey = normalizePrompt(question.prompt);
        const key = exactQuestionKey(question);
        if (!promptKey || existingPrompts.has(promptKey) || seen.has(key) || ids.has(question.id)) return false;
        seen.add(key);
        ids.add(question.id);
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
    description: `言语 ${counts.verbal || 0}、资料 ${counts.data || 0}、图形 ${counts.graphic || 0}；未核对的社区图片题暂停出题，自动检查不代表内容全部正确。每次最多抽取 40 题。非北森官方题库。`,
    sourceUrl: REPOSITORY_URL,
    durationMinutes: 55,
    questionLimit: 40,
    questionIds: questions.map((question) => question.id),
  };
}
