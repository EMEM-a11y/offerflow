// UI duplicate-submit protection only; server-side rate limits remain required.
export function createLoginRequest(send, onChange = () => {}, now = Date.now) {
  const state = { busy:false, retryAt:0, message:"", success:false };
  const remaining = () => Math.max(0, Math.ceil((state.retryAt - now()) / 1000));
  async function submit(email) {
    if (state.busy || remaining()) return;
    state.busy = true;
    state.success = false;
    state.message = "正在请求登录邮件…";
    onChange();
    try {
      await send(email.trim());
      state.success = true;
      state.retryAt = now() + 60000;
      state.message = "登录邮件已请求发送，请查收收件箱和垃圾邮件。点击邮件里的链接完成注册或登录；未收到时可稍后重发。";
    } catch (error) {
      if (error.status === 429 || ["over_email_send_rate_limit", "over_request_rate_limit"].includes(error.code)) {
        state.retryAt = now() + 60000;
        state.message = "发送过于频繁，请稍后再试。如果仍受限，请等待发信额度恢复。";
      } else if (error.code === "email_address_not_authorized") {
        state.message = "网站尚未完成公众邮件服务配置，暂时不能向此邮箱发送。你仍可使用公开题库和岗位雷达。";
      } else if (error.code === "signup_disabled") {
        state.message = "网站暂未开放新账号注册，已有账号可继续登录。";
      } else if (["captcha_failed", "captcha_required"].includes(error.code)) {
        state.message = "安全验证未通过或已过期，请重新验证后发送。";
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
