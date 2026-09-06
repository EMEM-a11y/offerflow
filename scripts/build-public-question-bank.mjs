import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourcePath = path.join(root, "work/source-bank/fei98-questions.json");
const outputPath = path.join(root, "src/public-question-bank.js");
const sourceQuestions = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

const categoryConfig = {
  "言语理解": { id: "verbal", limit: 180, seconds: 75 },
  "数量关系": { id: "numerical", limit: 180, seconds: 90 },
  "资料分析": { id: "data", limit: 150, seconds: 110 },
  "判断推理": { id: "logic", limit: 180, seconds: 80 }
};

const graphicImages = {
  "imp-a47b7d9e2c41": "/question-images/github-graphic-fold-1.png",
  "imp-36e98cc49ec0": "/question-images/github-graphic-fold-2.png",
  "imp-dadae0c69fc9": "/question-images/github-graphic-cut-1.png",
  "imp-d7be06e1509b": "/question-images/github-graphic-fold-3.png"
};

function clean(value = "") {
  return String(value)
    .replaceAll("&emsp;", " ")
    .replaceAll("&nbsp;", " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function isUsable(question, allowImages = false) {
  const options = Object.entries(question.options || {}).filter(([key, value]) => /^[A-E]$/.test(key) && clean(value));
  return question.reviewed === true
    && question.type === "single"
    && clean(question.stem)
    && clean(question.explanation)
    && options.length >= 4
    && options.some(([key]) => key === question.answer)
    && (allowImages || !(question.images || []).length);
}

function subtypeOf(question) {
  const tag = question.pitfallTags?.[0] || question.sourceMeta?.section || "综合";
  return clean(tag.replace(/^.*?-/, ""));
}

function roundRobinBySubtype(rows, limit) {
  const groups = new Map();
  for (const row of rows) {
    const subtype = subtypeOf(row);
    if (!groups.has(subtype)) groups.set(subtype, []);
    groups.get(subtype).push(row);
  }

  const buckets = [...groups.values()];
  const result = [];
  while (result.length < limit && buckets.some((bucket) => bucket.length)) {
    for (const bucket of buckets) {
      if (bucket.length && result.length < limit) result.push(bucket.shift());
    }
  }
  return result;
}

function normalize(question, category, image) {
  const entries = Object.entries(question.options)
    .filter(([key, value]) => /^[A-E]$/.test(key) && clean(value))
    .sort(([a], [b]) => a.localeCompare(b));
  const answer = entries.findIndex(([key]) => key === question.answer);
  const meta = question.sourceMeta || {};
  const sourceLabel = [meta.province, meta.year, meta.section].filter(Boolean).join(" · ");

  return {
    id: `public-${question.id}`,
    paperId: "public-online-bank",
    source: `GitHub 公开学习题库${sourceLabel ? ` · ${sourceLabel}` : ""}`,
    category,
    subtype: subtypeOf(question),
    difficulty: Math.min(5, Math.max(1, Number(question.difficulty) || 3)),
    prompt: clean(question.stem),
    options: entries.map(([, value]) => clean(value)),
    answer,
    explanation: clean(question.explanation),
    ...(image ? { image } : {}),
    expectedSeconds: category === "data" ? 110 : category === "numerical" ? 90 : category === "graphic" ? 75 : 80
  };
}

const selected = [];
const counts = {};

for (const [sourceCategory, config] of Object.entries(categoryConfig)) {
  const eligible = sourceQuestions.filter((question) => question.category === sourceCategory && isUsable(question));
  const rows = roundRobinBySubtype(eligible, config.limit);
  selected.push(...rows.map((question) => normalize(question, config.id)));
  counts[config.id] = rows.length;
}

const graphicRows = Object.entries(graphicImages).map(([id, image]) => {
  const question = sourceQuestions.find((item) => item.id === id);
  if (!question || !isUsable(question, true)) throw new Error(`图形题不可用：${id}`);
  return normalize(question, "graphic", image);
});
selected.push(...graphicRows);
counts.graphic = graphicRows.length;

const paperIds = ["verbal", "numerical", "data", "logic", "graphic"]
  .flatMap((category) => selected.filter((question) => question.category === category).slice(0, 5).map((question) => question.id));

const output = `// 此文件由 scripts/build-public-question-bank.mjs 生成，请勿手工编辑。\n`
  + `// 来源：https://github.com/fei98/civil-service-exam-prep，仅用于个人学习。\n\n`
  + `export const PUBLIC_QUESTION_BANK = ${JSON.stringify(selected, null, 2)};\n\n`
  + `export const PUBLIC_PAPER_IDS = ${JSON.stringify(paperIds, null, 2)};\n`;

fs.writeFileSync(outputPath, output);
console.log(JSON.stringify({ total: selected.length, counts, paperQuestions: paperIds.length, outputPath }, null, 2));
