import { readFile, writeFile, rename } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { normalizeXixicc, validateRadarJobLinks } from "../src/job-radar.js";

const source = "https://raw.githubusercontent.com/xixicc186/xixicc2027/main/jobs.json";
const target = new URL("../public/data/radar-updates.json", import.meta.url);

export function prepareSnapshot(rows, previousCount = 0) {
  if (!Array.isArray(rows) || rows.length < 10 || rows.length > 50000) throw new Error("岗位数量异常，保留上次快照");
  if (previousCount && rows.length < previousCount * .7) throw new Error("岗位数骤减超过 30%，需要人工核对");
  if (rows.some(row => !row || typeof row.company !== "string" || !row.company.trim() || !Array.isArray(row.positions))) {
    throw new Error("数据结构改变，停止更新");
  }
  const jobs = validateRadarJobLinks(rows.map(normalizeXixicc)).map(job => {
    // Do not publish raw tracking URLs or unexpected upstream fields.
    const { originalApplyUrl, ...publicJob } = job;
    return publicJob;
  });
  return { version: 1, source, updatedAt: new Date().toISOString(), jobs };
}

async function update() {
  let previousCount = 0;
  try { previousCount = JSON.parse(await readFile(target, "utf8")).jobs.length; } catch (error) { if (error.code !== "ENOENT") throw error; }
  const response = await fetch(source, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`数据源返回 HTTP ${response.status}`);
  const snapshot = prepareSnapshot(await response.json(), previousCount);
  await writeFile(new URL(`${target.href}.tmp`), JSON.stringify(snapshot));
  await rename(new URL(`${target.href}.tmp`), target);
  console.log(`岗位快照已更新：${snapshot.jobs.length} 条；${snapshot.updatedAt}。公司域名校验不等于岗位仍开放。`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  update().catch(error => { console.error(error.message); process.exitCode = 1; });
}
