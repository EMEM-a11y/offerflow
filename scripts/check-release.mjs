import { readdir, readFile } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { secretFindings } from "./release-security.mjs";

const root = resolve("dist");
const failures = [];
async function inspect(dir) {
  for (const entry of await readdir(dir, { withFileTypes:true })) {
    const path = resolve(dir,entry.name);
    const label = relative(root,path);
    if (entry.isSymbolicLink()) { failures.push(`${label}: symbolic link`); continue; }
    if (entry.isDirectory()) { await inspect(path); continue; }
    if (/(^|\/)(\.env[^/]*|private|work|tmp)(\/|$)|\.(pdf|docx?|csv|xlsx?|m4a|mp3|wav|sql|tgz|zip)$/i.test(label)) failures.push(`${label}: private file type/path`);
    if (!/\.(js|html|json|css|txt)$/i.test(label)) continue;
    const text = await readFile(path,"utf8");
    if (/offerflow-practice-mvp-20260905-v2|migrate-legacy-files/.test(text)) failures.push(`${label}: development-only legacy migration`);
    for (const finding of secretFindings(text)) failures.push(`${label}: ${finding}`);
    if (/(?:src|href)=["']\/(?:assets|question-images|data)\//.test(text) && process.env.OFFERFLOW_BASE && process.env.OFFERFLOW_BASE !== "/") failures.push(`${label}: root-relative public asset`);
  }
}
await inspect(root);
if (failures.length) { console.error(failures.join("\n")); process.exitCode=1; }
else console.log("发布文件检查通过：未检出私有文件类型或管理员密钥。此检查不能替代云端权限验收与题源授权确认。");
