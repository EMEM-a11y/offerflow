// UI duplicate-submit protection only; server-side rate limits remain required.
export function createLoginRequest(send, onChange = () => {}, now = Date.now) {
  const state = { busy:false, retryAt:0, message:"", success:false };
  const remaining = () => Math.max(0, Math.ceil((state.retryAt - now()) / 1000));
  async function submit(email) {
    if (state.busy || remaining()) return;
    state.busy = true;
    state.success = false;
    state.message = "正在发送登录请求…";
    onChange();
    try {
      await send(email.trim());
      state.success = true;
      state.retryAt = now() + 60000;
      state.message = "登录邮件发送请求已受理。请检查收件箱或垃圾邮件，并通过邮件中的链接登录。未收到邮件时，可在倒计时结束后重试。";
    } catch (error) {
      if (error.status === 429 || ["over_email_send_rate_limit", "over_request_rate_limit"].includes(error.code)) {
        state.retryAt = now() + 60000;
        state.message = "请求过于频繁，请稍后重试。如仍无法发送，请联系网站维护者。";
      } else if (error.code === "email_address_not_authorized") {
        state.message = "当前邮件服务暂不支持此邮箱。请联系网站维护者，或继续浏览公开岗位与题库。";
      } else if (error.code === "signup_disabled") {
        state.message = "网站暂未开放新账号注册，已有账号可继续登录。";
      } else if (["captcha_failed", "captcha_required"].includes(error.code)) {
        state.message = "安全验证未通过或已过期，请重新验证后再发送登录邮件。";
      } else {
        state.message = "暂时无法发送登录邮件，请检查网络后重试；若持续失败，请联系网站维护者。";
      }
    } finally {
      state.busy = false;
      onChange();
    }
  }
  return { state, remaining, submit };
}
