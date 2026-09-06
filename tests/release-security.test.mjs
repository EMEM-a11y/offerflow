import test from "node:test";
import assert from "node:assert/strict";
import { secretFindings } from "../scripts/release-security.mjs";

const jwt = payload => [Buffer.from('{"alg":"HS256"}').toString("base64url"), Buffer.from(JSON.stringify(payload)).toString("base64url"), "fake_signature"].join(".");

test("release scan permits public config, but blocks admin and user session JWTs", () => {
  assert.deepEqual(secretFindings(jwt({role:"anon",iss:"supabase"})), []);
  for (const payload of [{role:"service_role"}, {role:"authenticated",sub:"test-user"}, {role:"anon",sub:"test-user"}, {session_id:"test-session"}]) {
    assert.ok(secretFindings(jwt(payload)).includes("non-public JWT"));
  }
});

test("release scan catches SMTP keys and copied login URLs without echoing values", () => {
  const smtpKey = "re_" + "synthetic".repeat(5);
  assert.deepEqual(secretFindings(smtpKey), ["secret material"]);
  for (const field of ["access_token", "refresh_token", "token_hash"]) {
    assert.ok(secretFindings(`https://example.com/#${field}=${"synthetic".repeat(4)}`).includes("login credentials in URL"));
  }
  assert.deepEqual(secretFindings("const field = 'access_token';"), []);
});
