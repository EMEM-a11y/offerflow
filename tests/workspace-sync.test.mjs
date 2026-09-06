import test from "node:test";
import assert from "node:assert/strict";
import { WorkspaceSync } from "../src/workspace-sync.js";

function setup(t, overrides = {}) {
  const records = new Map();
  const cache = new Map();
  const writes = [];
  const statuses = [];
  const sync = new WorkspaceSync({
    delay: 60000,
    load: async id => structuredClone(records.get(id)),
    save: async (id, state, revision) => {
      if ((records.get(id)?.updated_at ?? null) !== revision) throw Object.assign(new Error("Conflict"), { code: "WORKSPACE_CONFLICT" });
      const row = { state: structuredClone(state), updated_at: String(writes.length + 1) };
      records.set(id, row);
      writes.push({ id, ...row });
      return row;
    },
    storage: { getItem: k => cache.get(k) ?? null, setItem: (k,v) => cache.set(k,v), removeItem: k => cache.delete(k) },
    onStatus: s => statuses.push(s),
    ...overrides,
  });
  t.after(() => sync.close());
  return { sync, records, cache, writes, statuses };
}

test("guest edits never persist", async t => {
  const { sync, writes, cache } = setup(t);
  sync.queue({ private: "guest" });
  await sync.flush();
  assert.equal(writes.length, 0);
  assert.equal(cache.size, 0);
});

test("new account starts empty; old browser workspace is never adopted", async t => {
  const { sync, writes, cache } = setup(t);
  cache.set("offerflow-practice-mvp-20260905-v2", JSON.stringify({ name:"A" }));
  await sync.open("A");
  sync.queue({ name: "A" });
  await sync.flush();
  sync.close();
  const remote = await sync.open("B");
  assert.equal(remote.state, null);
  assert.deepEqual(writes.map(w => w.id), ["A"]);
});

test("logout cancels queued saves", async t => {
  const { sync, writes } = setup(t);
  await sync.open("A");
  sync.queue({ name:"A" });
  sync.close();
  await sync.flush();
  assert.equal(writes.length, 0);
});

test("late load cannot unlock a previous account", async t => {
  let resolveA;
  const { sync } = setup(t, { load: id => id === "A" ? new Promise(r => { resolveA = r; }) : Promise.resolve({ state:{name:"B"},updated_at:"1" }) });
  const a = sync.open("A");
  const b = await sync.open("B");
  resolveA({ state:{name:"A"},updated_at:"1" });
  assert.equal(await a, null);
  assert.equal(b.state.name, "B");
  assert.equal(sync.userId, "B");
});

test("in-flight save stays bound to original account", async t => {
  let resolveSave;
  const writes = [];
  const { sync } = setup(t, { save: (id,state) => { writes.push({id,state}); return new Promise(r => { resolveSave=r; }); } });
  await sync.open("A");
  sync.queue({name:"A"});
  const saving = sync.flush();
  await sync.open("B");
  resolveSave({updated_at:"1"});
  await saving;
  assert.equal(sync.userId,"B");
  assert.equal(sync.revision,null);
  assert.deepEqual(writes,[{id:"A",state:{name:"A"}}]);
});

test("two-device conflict preserves remote and recovery draft", async t => {
  const { sync, records, cache, statuses } = setup(t);
  records.set("A", {state:{value:1},updated_at:"1"});
  await sync.open("A");
  records.set("A", {state:{value:2},updated_at:"2"});
  sync.queue({value:3});
  await assert.rejects(sync.flush(), { code:"WORKSPACE_CONFLICT" });
  assert.equal(records.get("A").state.value,2);
  assert.equal(JSON.parse(cache.get(sync.key())).state.value,3);
  assert.equal(statuses.at(-1),"conflict");
  await assert.rejects(sync.flush());
});

test("edits while saving are serialized against the returned revision", async t => {
  let resolveFirst;
  const revisions = [];
  const { sync } = setup(t,{ save: async (id,state,revision) => {
    revisions.push(revision);
    if (state.value === 1) return new Promise(r=>{resolveFirst=r;});
    return {updated_at:"2"};
  }});
  await sync.open("A");
  sync.queue({value:1});
  const saving = sync.flush();
  sync.queue({value:2});
  resolveFirst({updated_at:"1"});
  await saving;
  assert.deepEqual(revisions,[null,"1"]);
  assert.equal(sync.pending,null);
});

test("load failure stays locked and never writes", async t => {
  const { sync, writes } = setup(t,{load:async()=>{throw new Error("offline");}});
  await assert.rejects(sync.open("A"));
  assert.equal(sync.ready,false);
  sync.queue({name:"A"});
  assert.equal(writes.length,0);
});

test("unresolved recovery remains available even after a new session edit", async t=>{
  const {sync,cache}=setup(t);
  await sync.open("A");
  sync.queue({value:"unsent"});
  await sync.open("A");
  assert.equal(sync.recovery.state.value,"unsent");
  sync.queue({value:"new edit"});
  await sync.flush();
  await sync.open("A");
  assert.equal(sync.recovery.state.value,"unsent");
  assert.ok(cache.get(`${sync.key()}:recovery`));
});
