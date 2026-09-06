import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourcePath = path.join(root, "work/source-bank/fei98-questions.json");
const imageDir = path.join(root, "public/question-images/data-charts");
const outputPath = path.join(root, "src/data-chart-bank.js");
const sourceQuestions = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
fs.mkdirSync(imageDir, { recursive: true });

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

function usable(question) {
  const options = Object.entries(question.options || {}).filter(([key, value]) => /^[A-E]$/.test(key) && clean(value));
  return question.category === "资料分析"
    && question.reviewed === true
    && question.type === "single"
    && question.images?.length === 1
    && /\/tarzan\/images\//.test(question.images[0])
    && clean(question.stem)
    && clean(question.explanation)
    && options.length >= 4
    && options.some(([key]) => key === question.answer);
}

function detectExtension(buffer) {
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "png";
  if (buffer[0] === 255 && buffer[1] === 216) return "jpg";
  if (buffer.subarray(0, 3).toString() === "GIF") return "gif";
  if (buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP") return "webp";
  throw new Error("下载内容不是可识别的图片");
}

async function downloadImage(sourceUrl) {
  const stableUrl = sourceUrl.replace("fb.fenbike.cn", "fb.fbstatic.cn");
  const response = await fetch(stableUrl, { headers: { "Accept-Encoding": "identity" } });
  if (!response.ok) throw new Error(`图片下载失败 ${response.status}: ${stableUrl}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const extension = detectExtension(buffer);
  const hash = crypto.createHash("sha1").update(sourceUrl).digest("hex").slice(0, 14);
  const filename = `chart-${hash}.${extension}`;
  fs.writeFileSync(path.join(imageDir, filename), buffer);
  return `/question-images/data-charts/${filename}`;
}

const groups = new Map();
for (const question of sourceQuestions.filter(usable)) {
  const url = question.images[0];
  if (!groups.has(url)) groups.set(url, []);
  groups.get(url).push(question);
}

const selected = [];
for (let round = 0; round < 3 && selected.length < 200; round += 1) {
  for (const rows of groups.values()) {
    if (rows[round] && selected.length < 200) selected.push(rows[round]);
  }
}

const localImages = new Map();
const imageUrls = [...new Set(selected.map((question) => question.images[0]))];
for (let offset = 0; offset < imageUrls.length; offset += 8) {
  const batch = imageUrls.slice(offset, offset + 8);
  const paths = await Promise.all(batch.map(downloadImage));
  batch.forEach((url, index) => localImages.set(url, paths[index]));
}

const questions = selected.map((question) => {
  const entries = Object.entries(question.options)
    .filter(([key, value]) => /^[A-E]$/.test(key) && clean(value))
    .sort(([a], [b]) => a.localeCompare(b));
  const meta = question.sourceMeta || {};
  const sourceLabel = [meta.province, meta.year, meta.section].filter(Boolean).join(" · ");
  return {
    id: `chart-${question.id}`,
    paperId: "data-chart-bank",
    source: `GitHub 公开学习题库 · 图表题${sourceLabel ? ` · ${sourceLabel}` : ""}`,
    category: "data",
    subtype: clean((question.pitfallTags?.[0] || "资料-综合").replace(/^.*?-/, "")),
    difficulty: Math.min(5, Math.max(1, Number(question.difficulty) || 3)),
    prompt: clean(question.stem),
    options: entries.map(([, value]) => clean(value)),
    answer: entries.findIndex(([key]) => key === question.answer),
    explanation: clean(question.explanation),
    image: localImages.get(question.images[0]),
    expectedSeconds: 120
  };
});

const paperIds = questions.slice(0, 20).map((question) => question.id);
const output = `// 此文件由 scripts/build-data-chart-bank.mjs 生成，请勿手工编辑。\n\n`
  + `export const DATA_CHART_QUESTIONS = ${JSON.stringify(questions, null, 2)};\n\n`
  + `export const DATA_CHART_PAPER_IDS = ${JSON.stringify(paperIds, null, 2)};\n`;
fs.writeFileSync(outputPath, output);
console.log(JSON.stringify({ questions: questions.length, localImages: imageUrls.length, outputPath }, null, 2));
