// Publishable Supabase anon keys are public configuration; session/admin keys are not.
export function secretFindings(text) {
  const findings = [];
  if (/\bsb_secret_[A-Za-z0-9_-]{12,}|\bre_[A-Za-z0-9_-]{24,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)) {
    findings.push("secret material");
  }
  for (const match of text.matchAll(/eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)) {
    try {
      const payload = JSON.parse(Buffer.from(match[1], "base64url"));
      if (payload.role !== "anon" || payload.sub || payload.session_id) findings.push("non-public JWT");
    } catch {
      findings.push("unrecognized JWT");
    }
  }
  if (/[#?&](?:access_token|refresh_token|token_hash)=[A-Za-z0-9_.-]{12,}/.test(text)) {
    findings.push("login credentials in URL");
  }
  return [...new Set(findings)];
}
