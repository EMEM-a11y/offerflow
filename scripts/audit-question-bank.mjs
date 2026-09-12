import fs from "node:fs/promises";
import { inspectCommunityQuestion, loadCommunityQuestionBank } from "../src/community-question-bank.js";
import { SEED_QUESTIONS, SUSPENDED_QUESTION_IDS, validateImportedQuestions } from "../src/question-bank.js";

const commit = "df6ef3312ee3fc676b657fc31a683dcc2ab6731e";
const url = `https://cdn.jsdelivr.net/gh/minnielv/beisen-quiz@${commit}/public/data/questions.json`;
const payload = process.argv[2] ? JSON.parse(await fs.readFile(process.argv[2], "utf8")) : await (await fetch(url)).json();
if (!Array.isArray(payload.questions)) throw new Error("Invalid source snapshot");
globalThis.window = globalThis;
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => ({ ok: true, json: async () => payload });
const admitted = await loadCommunityQuestionBank(SEED_QUESTIONS);
globalThis.fetch = originalFetch;
const activeIds = new Set(admitted.map(question => question.id));
const seenIds = new Set();
const rows = payload.questions.map(question => {
  const issues = inspectCommunityQuestion(question);
  if (seenIds.has(question.id)) issues.push("duplicate-id");
  seenIds.add(question.id);
  const id = question.id === "graph-110" ? "community-beisen-graph-110-reviewed-v2" : `community-beisen-${question.id}`;
  const active = activeIds.has(id);
  return { id: question.id, section: question.sectionId, status: active ? "admitted" : "held", issues: active || issues.length ? issues : ["existing-completeness-or-deduplication-rule"], review: question.id === "graph-110" ? "original-stimulus-and-five-option-strip-reviewed" : "not-semantically-certified" };
});
for (const question of SEED_QUESTIONS) {
  const issues = [];
  try { validateImportedQuestions([question]); } catch (error) { issues.push(error.message); }
  if (SUSPENDED_QUESTION_IDS.has(question.id)) issues.push("shortened-passage-missing-evidence");
  for (const image of [question.image, ...(question.images || []), ...(question.optionImages || [])].filter(Boolean)) {
    if (image.startsWith("/")) {
      try { await fs.access(new URL(`../public${image}`, import.meta.url)); } catch { issues.push(`missing-local-image:${image}`); }
    }
  }
  rows.push({ id: question.id, section: question.category, status: issues.length ? "held" : "admitted", issues, review: "structural-check-not-new-original-PDF-certification" });
}
const report = {
  sourceCommit: commit,
  scope: "All bundled and pinned community rows; excludes private imports. Structural checks cover every row, not full semantic certification. Review-pending is informational and does not block practice.",
  total: rows.length, admitted: rows.filter(row => row.status === "admitted").length,
  held: rows.filter(row => row.status === "held").length,
  reasons: rows.flatMap(row => row.issues).reduce((counts, reason) => ({ ...counts, [reason]: (counts[reason] || 0) + 1 }), {}), rows,
};
await fs.writeFile(new URL("../data/question-bank-audit.json", import.meta.url), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ total: report.total, admitted: report.admitted, held: report.held, reasons: report.reasons }, null, 2));
