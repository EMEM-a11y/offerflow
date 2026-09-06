// Explicit live test for two disposable email aliases. Never use personal accounts.
// Email links arrive via non-echoed stdin, not arguments, source files or logs.
import assert from "node:assert/strict";
import { createInterface } from "node:readline";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const origin = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const emails = [process.env.TEST_EMAIL_A, process.env.TEST_EMAIL_B];
assert.ok(origin && key && new URL(origin).protocol === "https:", "Missing HTTPS cloud configuration");
assert.ok(emails.every(e => /^[^+@]+\+offerflow-rls-[ab]-\d{8}@gmail\.com$/.test(e || "")), "Disposable aliases required");
assert.ok(emails[0] !== emails[1] && emails[0].split("+")[0] === emails[1].split("+")[0], "Two aliases of the same mailbox required");
const clients = emails.map(() => createClient(origin, key, { auth: { persistSession:false, autoRefreshToken:false, detectSessionInUrl:false } }));

if (process.argv.includes("--request")) {
  for (let i = 0; i < clients.length; i++) {
    const { error } = await clients[i].auth.signInWithOtp({ email:emails[i], options:{ shouldCreateUser:true, emailRedirectTo:"http://127.0.0.1:5174/" } });
    console.log(JSON.stringify({ account:i === 0 ? "A" : "B", accepted:!error, code:error?.code }));
    if (error) process.exit(1);
  }
  process.exit(0);
}

// Raw mode disables terminal echo before any credential is supplied.
if (process.stdin.isTTY) process.stdin.setRawMode(true);
const input = createInterface({ input:process.stdin, terminal:false });
console.log("Waiting for two test email links on non-echoed stdin.");
const line = await new Promise((resolve,reject) => {
  const timeout = setTimeout(() => reject(new Error("Test input timeout")), 300000);
  input.once("line", value => { clearTimeout(timeout); resolve(value); });
});
input.close();
process.stdin.pause();
const links = JSON.parse(line);
assert.equal(links.length, 2, "Two test links required");
const actors = [];
const marker = randomUUID();
const results = [];
const owned = new Set();
const path = "/rest/v1/user_workspaces";
const selection = id => `?user_id=eq.${id}`;
const fixture = note => ({ __offerflow_isolation_test:marker, note });

async function request(token, method, suffix = "", body) {
  const response = await fetch(new URL(path + suffix, origin), {
    method, headers:{ apikey:key, Authorization:`Bearer ${token || key}`, "Content-Type":"application/json", Prefer:"return=representation" },
    body:body === undefined ? undefined : JSON.stringify(body), signal:AbortSignal.timeout(15000)
  });
  const data = await response.json();
  return { status:response.status, data };
}
function rows(result, count) {
  assert.ok(result.status >= 200 && result.status < 300, `Unexpected HTTP ${result.status}`);
  assert.ok(Array.isArray(result.data) && result.data.length === count, "Unexpected visible/modified row count");
}
function blocked(result) {
  assert.ok([401,403].includes(result.status) && result.data.code === "42501", `Expected RLS/permission rejection (HTTP ${result.status}, code ${result.data.code || "none"})`);
}
async function readOwn(actor) {
  const result = await request(actor.token, "GET", selection(actor.id));
  rows(result, 1);
  assert.equal(result.data[0].state.__offerflow_isolation_test, marker, "Test marker mismatch");
  return result.data[0];
}

try {
  for (let i = 0; i < 2; i++) {
    const url = new URL(links[i]);
    assert.equal(url.origin, new URL(origin).origin, "Unexpected verification host");
    assert.equal(url.pathname, "/auth/v1/verify", "Unexpected verification path");
    const type = url.searchParams.get("type");
    assert.ok(["signup", "magiclink"].includes(type), "Unexpected link type");
    const { data, error } = await clients[i].auth.verifyOtp({ token_hash:url.searchParams.get("token"), type });
    assert.ok(!error && data.session, `Test login failed: ${error?.code || "no session"}`);
    assert.equal(data.user.email, emails[i], "Wrong test email");
    actors.push({ id:data.user.id, token:data.session.access_token });
    const replay = await clients[i].auth.verifyOtp({ token_hash:url.searchParams.get("token"), type });
    assert.ok(replay.error && !replay.data.session, "Login link unexpectedly reusable");
  }
  assert.notEqual(actors[0].id, actors[1].id, "Distinct users required");
  for (const actor of actors) rows(await request(actor.token, "GET", selection(actor.id)), 0);
  for (const actor of actors) owned.add(actor.id);
  results.push("two_verified_empty_accounts", "login_links_single_use");
  rows(await request(null, "GET", "?select=user_id&limit=1"), 0);
  // Targets have no workspace yet: duplicate keys cannot mask an insert-policy bug.
  for (const actor of actors) blocked(await request(null, "POST", "", { user_id:actor.id, state:fixture("guest") }));
  for (let i = 0; i < 2; i++) {
    const actor = actors[i], other = actors[1-i];
    blocked(await request(actor.token, "POST", "", { user_id:other.id, state:fixture("foreign insert") }));
    rows(await request(actor.token, "POST", "", { user_id:actor.id, state:fixture("own insert") }), 1);
    rows(await request(actor.token, "PATCH", selection(actor.id), { state:fixture("own update") }), 1);
    assert.equal((await readOwn(actor)).state.note, "own update");
    blocked(await request(actor.token, "PATCH", selection(actor.id), { user_id:other.id }));
    rows(await request(actor.token, "DELETE", selection(actor.id)), 1);
    rows(await request(actor.token, "GET", selection(actor.id)), 0);
  }
  results.push("own_crud", "foreign_insert_blocked", "owner_change_blocked", "guest_insert_blocked");
  for (const actor of actors) rows(await request(actor.token, "POST", "", { user_id:actor.id, state:fixture("baseline") }), 1);
  for (let i = 0; i < 2; i++) {
    const actor = actors[i], other = actors[1-i];
    rows(await request(actor.token, "GET", selection(other.id)), 0);
    rows(await request(actor.token, "PATCH", selection(other.id), { state:fixture("foreign overwrite") }), 0);
    rows(await request(actor.token, "DELETE", selection(other.id)), 0);
    rows(await request(null, "PATCH", selection(other.id), { state:fixture("guest overwrite") }), 0);
    rows(await request(null, "DELETE", selection(other.id)), 0);
    assert.equal((await readOwn(other)).state.note, "baseline");
  }
  rows(await request(null, "GET", "?select=user_id&limit=1"), 0);
  results.push("foreign_read_update_delete_blocked", "guest_read_update_delete_blocked");
} catch (error) {
  console.error(JSON.stringify({ passed:false, completed:results, error:error.message.replace(/eyJ[A-Za-z0-9_.-]+/g,"[redacted]") }));
  process.exitCode = 1;
} finally {
  for (const actor of actors) {
    if (!owned.has(actor.id)) continue;
    // Cleanup is restricted to this run's synthetic marker and the verified test user.
    const cleanup = await request(actor.token, "DELETE", selection(actor.id) + `&state->>__offerflow_isolation_test=eq.${marker}`);
    assert.ok(cleanup.status >= 200 && cleanup.status < 300, "Synthetic cleanup failed");
    rows(await request(actor.token, "GET", selection(actor.id)), 0);
  }
  for (const client of clients) await client.auth.signOut({ scope:"local" });
}
if (!process.exitCode) console.log(JSON.stringify({ passed:true, checks:results, syntheticWorkspacesRemoved:true, testAccountsRetained:true }));
