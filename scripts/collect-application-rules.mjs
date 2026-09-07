import { mkdir, readFile, writeFile, appendFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { APPLICATION_RULES } from "../src/application-rules.js";

// Candidate excerpts only: fetching a page never changes the published rules.
function pageText(html) {
  return html
    .replace(/<!--[^]*?-->/g, " ")
    .replace(/<(script|style|noscript)\b[^>]*>[^]*?<\/\1\s*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:nbsp|amp|lt|gt|quot);/g, " ")
    .replace(/\s+/g, " ").trim();
}

export function extractRuleExcerpts(html) {
  const text = pageText(html);
  const excerpts = [];
  const pattern = /(?:投递|志愿|更换岗位|冷却期|重投|再次申请)/g;
  let end = -1;
  for (const match of text.matchAll(pattern)) {
    if (match.index < end) continue;
    end = match.index + 95;
    excerpts.push(text.slice(Math.max(0, match.index - 25), end));
    if (excerpts.length === 3) break;
  }
  return excerpts;
}

export async function collectSource(rule, source, fetchPage = fetch) {
  const result = { company: rule.company, cohort: rule.cohort, source: source.url, label: source.label, fetchedAt: new Date().toISOString() };
  try {
    const url = new URL(source.url);
    if (url.protocol !== "https:" || url.username || url.password) throw new Error("仅收集已登记的 HTTPS 公开来源");
    const response = await fetchPage(url, { signal: AbortSignal.timeout(12000), redirect: "error" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (!/text\/html/i.test(response.headers.get("content-type") || "")) {
      return { ...result, status: "manual_required", reason: "非 HTML 页面，需人工打开核对" };
    }
    const html = await response.text();
    const excerpts = extractRuleExcerpts(html);
    return {
      ...result,
      status: excerpts.length ? "candidate_only" : "manual_required",
      reason: excerpts.length ? "候选摘录，尚未验证公司、届次或规则含义" : "未提取到规则，可能需要浏览器或人工查看",
      // Hash all extracted text, not just the three preview excerpts.
      contentHash: createHash("sha256").update(pageText(html)).digest("hex"),
      excerpts
    };
  } catch (error) {
    return { ...result, status: "unavailable", reason: error.message };
  }
}

export function compareSources(results, previous = { version: 1, sources: [] }) {
  if (previous.version !== 1 || !Array.isArray(previous.sources)) throw new Error("规则比较基线格式异常，未覆盖旧记录");
  const key = row => JSON.stringify([row.company, row.source]);
  const saved = new Map(previous.sources.map(row => [key(row), row]));
  const rows = results.map(row => {
    const old = saved.get(key(row));
    if (row.status !== "candidate_only") return { ...row, change: "uncheckable", lastSuccessAt: old?.fetchedAt || null };
    if (!/^[a-f0-9]{64}$/.test(row.contentHash || "")) throw new Error("来源缺少有效内容指纹，未覆盖旧记录");
    const change = !old ? "first_seen" : old.contentHash === row.contentHash && old.cohort === row.cohort ? "unchanged" : "changed";
    saved.set(key(row), { company: row.company, source: row.source, cohort: row.cohort, contentHash: row.contentHash, excerpts: row.excerpts, fetchedAt: row.fetchedAt });
    return { ...row, change, previousExcerpts: change === "changed" ? old.excerpts : undefined, lastSuccessAt: old?.fetchedAt || null };
  });
  return { rows, baseline: { version: 1, sources: [...saved.values()] } };
}

export function renderReview(rows) {
  const labels = { first_seen: "首次收集", changed: "内容变化，待核对", unchanged: "未变", uncheckable: "暂无法核对" };
  const safe = value => String(value || "").replace(/[\r\n|]/g, " ").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/([\\`*_[\]])/g, "\\$1");
  const lines = ["# 投递规则定时检查", "", "仅检查已登记来源；内容变化不等于投递规则已改变，需核对公司、届次及上下文。网站规则未被自动修改。", "", "首次运行或缓存丢失时会重新建立比较基线，不会把全部来源误报为变化。摘要最多展示三段，更多细节请打开来源。", "",
    Object.entries(labels).map(([key, label]) => `${label}：${rows.filter(row => row.change === key).length}`).join(" · "), "",
    "| 公司 / 批次 | 结果 | 抓取时间（UTC） | 来源 |", "| --- | --- | --- | --- |"];
  for (const row of rows) lines.push(`| ${safe(row.company)} / ${safe(row.cohort)} | ${labels[row.change]} | ${safe(row.fetchedAt)} | ${safe(row.source)} |`);
  for (const row of rows.filter(row => row.change !== "unchanged")) {
    lines.push("", `## ${safe(row.company)} · ${labels[row.change]}`, "", `来源：${safe(row.source)}`, "", safe(row.reason));
    if (row.previousExcerpts?.length) lines.push("", "上次摘录：", ...row.previousExcerpts.map(text => `- ${safe(text)}`));
    if (row.excerpts?.length) lines.push("", "本次摘录：", ...row.excerpts.map(text => `- ${safe(text)}`));
    if (row.change === "uncheckable" && row.lastSuccessAt) lines.push("", `保留上次成功记录：${safe(row.lastSuccessAt)}`);
  }
  return lines.join("\n") + "\n";
}

async function main() {
  const query = (process.argv[2] || "").toLowerCase();
  const rules = APPLICATION_RULES.filter(rule => [rule.company, ...rule.aliases].some(name => name.toLowerCase().includes(query)));
  if (!rules.length) throw new Error("规则库中没有匹配的公司；请先登记并核对该公司的公开来源");
  const sources = rules.flatMap(rule => rule.sources.map(source => ({ rule, source })));
  const results = [];
  // Small batches, no retry loops or access-control bypasses.
  for (let i = 0; i < sources.length; i += 3) {
    results.push(...await Promise.all(sources.slice(i, i + 3).map(({ rule, source }) => collectSource(rule, source))));
    console.log(`已检查 ${Math.min(i + 3, sources.length)}/${sources.length} 个来源`);
  }
  const directory = new URL("../work/", import.meta.url);
  await mkdir(directory, { recursive: true });
  const baselinePath = new URL("application-rule-baseline.json", directory);
  let previous;
  try { previous = JSON.parse(await readFile(baselinePath, "utf8")); } catch (error) { if (error.code !== "ENOENT") throw error; }
  const { rows, baseline } = compareSources(results, previous);
  const review = renderReview(rows);
  await writeFile(new URL("application-rule-candidates.json", directory), JSON.stringify({
    notice: "仅为来源收集报告，不是已核验规则，不会自动发布。新增公司需要先登记来源；不同届次、校招/社招、专项须分别核对。",
    results: rows
  }, null, 2));
  await writeFile(new URL("application-rule-review.md", directory), review);
  await writeFile(baselinePath, JSON.stringify(baseline, null, 2));
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, review);
  console.log(`报告已保存至 work/application-rule-candidates.json；${results.filter(result => result.status === "candidate_only").length} 个来源提取到候选文本。其余需人工查看；现有规则未改动。`);
  console.log(`内容变化：${rows.filter(row => row.change === "changed").length}；首次收集：${rows.filter(row => row.change === "first_seen").length}。`);
  if (results.every(row => row.status !== "candidate_only")) throw new Error("所有来源都未提取到可比较文本，请查看本次报告；旧规则和成功基线均保留");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
