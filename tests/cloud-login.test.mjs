import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

test("login passes CAPTCHA to Auth and returns to the current site root", async () => {
  const calls=[];
  const code=readFileSync(new URL("../src/cloud.js",import.meta.url),"utf8")
    .replace(/^import .*;\n/gm, "")
    .replaceAll("import.meta.env", "env")
    .replace(/^export /gm, "");
  const context=vm.createContext({
    env:{VITE_SUPABASE_URL:"https://example.supabase.co",VITE_SUPABASE_ANON_KEY:"public-key",VITE_TURNSTILE_SITE_KEY:"public-site-key"},
    window:{location:{origin:"https://emcalling.com",pathname:"/"}},
    createClient:()=>({auth:{signInWithOtp:async args=>{calls.push(args);return {error:null};}}}),
  });
  vm.runInContext(code,context);
  await assert.rejects(vm.runInContext('sendLoginLink("test@example.com")',context), {code:"captcha_required"});
  assert.equal(calls.length,0);
  await vm.runInContext('sendLoginLink("test@example.com", "synthetic-token")',context);
  assert.equal(calls[0].options.captchaToken,"synthetic-token");
  assert.equal(calls[0].options.emailRedirectTo,"https://emcalling.com/");
});
