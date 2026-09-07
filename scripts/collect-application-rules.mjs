import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { APPLICATION_RULES } from "../src/application-rules.js";

// Candidate excerpts only: fetching a page never changes the published rules.
export function extractRuleExcerpts(html) {
  const text = html
    .replace(/<!--[^]*?-->/g, " ")
    .replace(/<(script|style|noscript)\b[^>]*>[^]*?<\/\1\s*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:nbsp|amp|lt|gt|quot);/g, " ")
    .replace(/\s+/g, " ").trim();
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
    const excerpts = extractRuleExcerpts(await response.text());
    return {
      ...result,
      status: excerpts.length ? "candidate_only" : "manual_required",
      reason: excerpts.length ? "候选摘录，尚未验证公司、届次或规则含义" : "未提取到规则，可能需要浏览器或人工查看",
      excerpts
    };
  } catch (error) {
    return { ...result, status: "unavailable", reason: error.message };
  }
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
  await writeFile(new URL("application-rule-candidates.json", directory), JSON.stringify({
    notice: "仅为来源收集报告，不是已核验规则，不会自动发布。新增公司需要先登记来源；不同届次、校招/社招、专项须分别核对。",
    results
  }, null, 2));
  console.log(`报告已保存至 work/application-rule-candidates.json；${results.filter(result => result.status === "candidate_only").length} 个来源提取到候选文本。其余需人工查看；现有规则未改动。`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
