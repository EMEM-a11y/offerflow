import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const cloudConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const captchaSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() || "";
export const cloud = cloudConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
  : null;

export async function currentCloudUser() {
  if (!cloud) return null;
  const { data, error } = await cloud.auth.getSession();
  if (error) throw error;
  return data.session?.user || null;
}

export function watchCloudAuth(callback) {
  if (!cloud) return () => {};
  const { data } = cloud.auth.onAuthStateChange((_event, session) => {
    window.setTimeout(() => callback(session?.user || null), 0);
  });
  return () => data.subscription.unsubscribe();
}

export async function sendLoginLink(email, captchaToken) {
  if (!cloud) throw new Error("云同步尚未配置");
  if (captchaSiteKey && !captchaToken) throw Object.assign(new Error("请先完成安全验证"), { code:"captcha_required" });
  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  const { error } = await cloud.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo, shouldCreateUser: true, captchaToken }
  });
  if (error) throw error;
}

export async function signOutCloud() {
  if (!cloud) return;
  const { error } = await cloud.auth.signOut();
  if (error) throw error;
}

export async function loadCloudWorkspace(userId) {
  if (!cloud || !userId) return null;
  const { data, error } = await cloud
    .from("user_workspaces")
    .select("state, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveCloudWorkspace(userId, state, expectedUpdatedAt) {
  if (!cloud || !userId) throw new Error("请先登录");
  if (expectedUpdatedAt === undefined) throw new Error("缺少云端版本，已停止保存");
  const updated_at = new Date(Math.max(Date.now(), Date.parse(expectedUpdatedAt || "") + 1 || 0)).toISOString();
  const table = cloud.from("user_workspaces");
  const query = expectedUpdatedAt === null
    ? table.insert({ user_id: userId, state, updated_at })
    : table.update({ state, updated_at }).eq("user_id", userId).eq("updated_at", expectedUpdatedAt);
  const { data, error } = await query.select("updated_at").maybeSingle();
  if (error?.code === "23505" || (!error && !data)) {
    throw Object.assign(new Error("另一设备已更新资料，已阻止覆盖。请先备份本页，再重新载入云端记录"), { code: "WORKSPACE_CONFLICT" });
  }
  if (error) throw error;
  return data;
}
