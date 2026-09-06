let scriptPromise;
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      const fail = () => { clearTimeout(timeout); script.remove(); scriptPromise = null; reject(new Error("captcha_load_failed")); };
      const timeout = setTimeout(fail, 15000);
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.onerror = fail;
      script.onload = () => {
        if (!window.turnstile) { fail(); return; }
        clearTimeout(timeout);
        resolve(window.turnstile);
      };
      document.head.append(script);
    });
  }
  return scriptPromise;
}

// Tokens belong to the current login form only, never to saved workspace state.
export function createLoginCaptcha(sitekey, onChange = () => {}, load = loadTurnstile, now = Date.now) {
  let api, widget, container, generation = 0, token = "", expiresAt = 0;
  const state = { message:"" };
  const getToken = () => now() < expiresAt ? token : "";
  function clear() {
    generation++;
    token = "";
    expiresAt = 0;
    state.message = "";
    if (widget !== undefined) api.remove(widget);
    widget = undefined;
    container = null;
  }
  async function mount(element) {
    clear();
    if (!sitekey || !element) return;
    container = element;
    const current = generation;
    const valid = () => current === generation && element.isConnected;
    const invalidate = message => { if (valid()) { token = ""; expiresAt = 0; state.message = message; onChange(); } };
    state.message = "正在加载安全验证…";
    onChange();
    try {
      api = await load();
      if (!valid()) return;
      widget = api.render(element, {
        sitekey, theme:"auto", size:"flexible", action:"login", "response-field":false,
        callback:value => { if (valid()) { token = value; expiresAt = now() + 290000; state.message = "安全验证已通过"; onChange(); } },
        "expired-callback":() => invalidate("验证已过期，请重新验证。"),
        "error-callback":() => { invalidate("验证暂不可用，请检查网络后重试验证。"); return true; },
        "timeout-callback":() => invalidate("验证超时，请重试验证。"),
      });
    } catch {
      invalidate("安全验证加载失败，请检查网络后重试验证。");
    }
  }
  return { state, getToken, mount, clear, reset:() => mount(container), ready:() => !sitekey || Boolean(getToken()) };
}
