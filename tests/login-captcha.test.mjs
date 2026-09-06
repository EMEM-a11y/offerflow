import test from "node:test";
import assert from "node:assert/strict";
import { createLoginCaptcha } from "../src/login-captcha.js";

function fixture() {
  let clock = 0;
  const callbacks = [], removed = [];
  const api = { render(_element, options) { callbacks.push(options); return callbacks.length; }, remove(id) { removed.push(id); } };
  const captcha = createLoginCaptcha("public-site-key", () => {}, async () => api, () => clock);
  return { captcha, callbacks, removed, advance:() => { clock += 300000; } };
}
test("verification requires a live token and clears it on expiry/error/timeout", async () => {
  const f = fixture();
  assert.equal(f.captcha.ready(), false);
  await f.captcha.mount({isConnected:true});
  const cb = f.callbacks[0];
  cb.callback("synthetic-token");
  assert.equal(f.captcha.ready(), true);
  f.advance();
  assert.equal(f.captcha.getToken(), "");
  for (const event of ["expired-callback", "error-callback", "timeout-callback"]) {
    cb.callback("synthetic-token");
    cb[event]();
    assert.equal(f.captcha.ready(), false);
  }
});
test("reset and modal close invalidate tokens and stale callbacks", async () => {
  const f = fixture();
  await f.captcha.mount({isConnected:true});
  f.callbacks[0].callback("old-token");
  await f.captcha.reset();
  f.callbacks[0].callback("late-token");
  assert.equal(f.captcha.getToken(), "");
  f.callbacks[1].callback("new-token");
  assert.equal(f.captcha.getToken(), "new-token");
  f.captcha.clear();
  f.callbacks[1].callback("after-close");
  assert.equal(f.captcha.getToken(), "");
  assert.deepEqual(f.removed, [1,2]);
});
test("late script load never renders a closed modal and load failures stay locked", async () => {
  let resolve, renders=0;
  const captcha=createLoginCaptcha("key",()=>{},()=>new Promise(r=>resolve=r));
  const pending=captcha.mount({isConnected:true});
  captcha.clear();
  resolve({render(){renders++;}});
  await pending;
  assert.equal(renders,0);
  const failed=createLoginCaptcha("key",()=>{},async()=>{throw Error("offline");});
  await failed.mount({isConnected:true});
  assert.equal(failed.ready(),false);
  assert.match(failed.state.message,/加载失败/);
});
test("unconfigured local mode does not load third-party scripts", async () => {
  const captcha=createLoginCaptcha("",()=>{},()=>{throw Error("must not load");});
  await captcha.mount({isConnected:true});
  assert.equal(captcha.ready(),true);
});
