// Local development only. Production bundles must not import the ownerless legacy stores.
const LEGACY_KEY = "offerflow-practice-mvp-20260905-v2";
const COLLECTIONS = ["applications", "jobs", "projects", "interviewRecords", "resumeDocuments", "answerBank", "applicationDrafts", "importedQuestions"];

export function readLegacyWorkspace(storage = localStorage) {
  try {
    const value = JSON.parse(storage.getItem(LEGACY_KEY));
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch { return null; }
}

export function compareLegacyWorkspace(legacy, current) {
  const differences = [];
  if (!legacy) return differences;
  for (const key of COLLECTIONS) {
    const oldRows = Array.isArray(legacy[key]) ? legacy[key] : [];
    const newRows = Array.isArray(current[key]) ? current[key] : [];
    const missing = oldRows.filter(old => !newRows.some(row => row.id === old.id)).length;
    const changed = oldRows.filter(old => newRows.some(row => row.id === old.id && JSON.stringify(row) !== JSON.stringify(old))).length;
    if (missing || changed) differences.push({ key, missing, changed });
  }
  for (const key of ["profile", "interviewPrep", "companyDiagnoses", "radarActivity", "practiceHistory", "wrongQuestionIds"]) {
    if (legacy[key] && JSON.stringify(legacy[key]) !== JSON.stringify(current[key])) differences.push({ key, missing:0, changed:1 });
  }
  return differences;
}

async function readLegacyFile(database, store, id) {
  const databases = await indexedDB.databases();
  if (!databases.some(item => item.name === database)) return null;
  const db = await new Promise((resolve,reject)=>{
    const request=indexedDB.open(database);
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
  try {
    if (!db.objectStoreNames.contains(store)) return null;
    return await new Promise((resolve,reject)=>{
      const request=db.transaction(store,"readonly").objectStore(store).get(id);
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
  } finally { db.close(); }
}

export async function migrateLegacyFiles({ state, assertCurrent, getResume, putResume, getRecording, putRecording }) {
  const result = { copied:0, existing:0, missing:0 };
  const entries = [
    ...(state.resumeDocuments || []).map(file=>({id:file.id,name:file.name,db:"offerflow-resume-files",store:"files",get:getResume,put:putResume})),
    ...(state.interviewRecords || []).filter(record=>record.recording).map(record=>({id:record.id,name:record.recording.name,db:"offerflow-interview-audio",store:"recordings",get:getRecording,put:putRecording})),
  ];
  for (const entry of entries) {
    assertCurrent();
    const existing=await entry.get(entry.id);
    assertCurrent();
    if (existing) { result.existing++; continue; }
    const file=await readLegacyFile(entry.db,entry.store,entry.id);
    assertCurrent();
    if (!file || (file.name && file.name !== entry.name)) { result.missing++; continue; }
    await entry.put(entry.id,file);
    assertCurrent();
    result.copied++;
  }
  return result;
}
