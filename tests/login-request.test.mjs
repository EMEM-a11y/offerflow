import test from "node:test";
import assert from "node:assert/strict";
import { createLoginRequest } from "../src/login-request.js";

test("in-flight and cooldown submissions do not send additional emails", async () => {
  let finish, count=0, clock=0;
  const login=createLoginRequest(()=>{count++;return new Promise(resolve=>finish=resolve);},()=>{},()=>clock);
  const first=login.submit("test@example.com");
  await login.submit("other@example.com");
  assert.equal(count,1);
  finish(); await first;
  await login.submit("test@example.com");
  assert.equal(count,1);
  assert.equal(login.remaining(),60);
  clock=60000;
  const next=login.submit("test@example.com");
  finish(); await next;
  assert.equal(count,2);
});

test("provider throttling starts cooldown without revealing raw errors", async () => {
  const login=createLoginRequest(async()=>{throw {status:429,message:"internal details"};});
  await login.submit("test@example.com");
  assert.equal(login.remaining(),60);
  assert.equal(login.state.success,false);
  assert.match(login.state.message,/频繁/);
  assert.doesNotMatch(login.state.message,/internal/);
});

test("failed sends permit retry and successful retry clears the error", async () => {
  let fail=true;
  const login=createLoginRequest(async()=>{if(fail)throw {code:"email_address_not_authorized"};});
  await login.submit("test@example.com");
  assert.match(login.state.message,/邮件服务暂不支持此邮箱/);
  assert.equal(login.state.busy,false);
  assert.equal(login.remaining(),0);
  fail=false;
  await login.submit("test@example.com");
  assert.equal(login.state.success,true);
  assert.doesNotMatch(login.state.message,/邮件服务暂不支持此邮箱/);
});

test("rejected CAPTCHA is not reported as an email success", async () => {
  const login=createLoginRequest(async()=>{throw {code:"captcha_failed"};});
  await login.submit("test@example.com");
  assert.equal(login.state.success,false);
  assert.match(login.state.message,/安全验证/);
});
