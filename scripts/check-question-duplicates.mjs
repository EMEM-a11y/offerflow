import { JD_SUPPLEMENT_QUESTIONS } from "../src/jd-supplement-question-bank.js";
import { SEED_QUESTIONS } from "../src/question-bank.js";

const normalize = (value) =>
  String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]/gu, "");

const grams = (value) => {
  const text = normalize(value);
  const result = new Set();
  for (let index = 0; index < text.length - 1; index += 1) result.add(text.slice(index, index + 2));
  return result;
};

const similarity = (left, right) => {
  const a = grams(left);
  const b = grams(right);
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const item of a) if (b.has(item)) shared += 1;
  return shared / (a.size + b.size - shared);
};

const issues = [];
const ids = new Set();
for (const question of JD_SUPPLEMENT_QUESTIONS) {
  if (ids.has(question.id)) issues.push(`重复 ID：${question.id}`);
  ids.add(question.id);
  if (!question.prompt || question.options.length !== 4) issues.push(`题目结构不完整：${question.id}`);
  if (!Number.isInteger(question.answer) || question.answer < 0 || question.answer >= question.options.length) {
    issues.push(`答案索引无效：${question.id}`);
  }
}

const baseline = SEED_QUESTIONS.filter((question) => !question.id.startsWith("jd-supp-"));
for (let index = 0; index < JD_SUPPLEMENT_QUESTIONS.length; index += 1) {
  const question = JD_SUPPLEMENT_QUESTIONS[index];
  for (const other of JD_SUPPLEMENT_QUESTIONS.slice(index + 1)) {
    const score = similarity(question.prompt, other.prompt);
    if (score >= 0.82) issues.push(`增补题疑似重复：${question.id} / ${other.id}（${score.toFixed(2)}）`);
  }
  for (const other of baseline) {
    const score = similarity(question.prompt, other.prompt);
    if (score >= 0.82) issues.push(`与现有题库疑似重复：${question.id} / ${other.id}（${score.toFixed(2)}）`);
  }
}

if (issues.length) {
  console.error(issues.join("\n"));
  process.exit(1);
}

console.log(`校验通过：${JD_SUPPLEMENT_QUESTIONS.length} 道增补题，未发现结构错误或相似度 ≥ 0.82 的重复题。`);
