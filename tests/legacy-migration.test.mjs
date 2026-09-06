import test from "node:test";
import assert from "node:assert/strict";
import { readLegacyWorkspace, compareLegacyWorkspace, migrateLegacyFiles } from "../src/legacy-migration.js";

test("legacy reader rejects invalid data", () => {
  for (const value of ["null", "[]", "broken"]) assert.equal(readLegacyWorkspace({ getItem:()=>value }), null);
});

test("comparison reports older differences without changing either workspace", () => {
  const legacy={ applications:[{id:"a",stage:"old"},{id:"b"}] };
  const current={ applications:[{id:"a",stage:"new"},{id:"c"}] };
  const before=JSON.stringify({legacy,current});
  assert.deepEqual(compareLegacyWorkspace(legacy,current),[{key:"applications",missing:1,changed:1}]);
  assert.equal(JSON.stringify({legacy,current}),before);
});

test("migration does not overwrite existing account attachments", async () => {
  let writes=0;
  const result=await migrateLegacyFiles({ state:{resumeDocuments:[{id:"a",name:"resume.pdf"}]}, assertCurrent:()=>{}, getResume:async()=>({name:"resume.pdf"}), putResume:async()=>writes++ });
  assert.deepEqual(result,{copied:0,existing:1,missing:0});
  assert.equal(writes,0);
});

test("migration aborts if account changes during a read", async () => {
  let changed=false;
  await assert.rejects(migrateLegacyFiles({state:{resumeDocuments:[{id:"a"}]},assertCurrent:()=>{if(changed) throw Error("account changed");},getResume:async()=>{changed=true;return {};}}),/account changed/);
});
