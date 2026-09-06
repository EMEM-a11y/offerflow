// Read-only verification. Use disposable A/B accounts with pre-existing test workspaces.
// Supply tokens through local environment variables; never paste them into GitHub or chat.
const origin = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const tokens = [process.env.TEST_USER_A_TOKEN, process.env.TEST_USER_B_TOKEN];
if (!origin || !key || tokens.some(token=>!token)) throw new Error("需要 Supabase 配置及两个测试账号的本地会话令牌");

async function request(path, token) {
  const response = await fetch(new URL(path,origin), { headers:{ apikey:key, Authorization:`Bearer ${token || key}` },signal:AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`权限检查请求失败（HTTP ${response.status}），未通过验收`);
  return response.json();
}
const users=await Promise.all(tokens.map(token=>request("/auth/v1/user",token)));
if (!users[0].id || users[0].id===users[1].id) throw new Error("必须使用两个不同测试账号");
const guest=await request("/rest/v1/user_workspaces?select=user_id&limit=1");
if (guest.length) throw new Error("访客能读取私人工作区，禁止发布");
for (let index=0;index<2;index++) {
  const own=await request(`/rest/v1/user_workspaces?select=user_id&user_id=eq.${users[index].id}`,tokens[index]);
  if (own.length!==1) throw new Error("测试账号需要有自己的测试工作区，无法完成正向验收");
  const other=await request(`/rest/v1/user_workspaces?select=user_id&user_id=eq.${users[1-index].id}`,tokens[index]);
  if (other.length) throw new Error("账号之间可以交叉读取，禁止发布");
}
console.log("云端读取隔离通过：访客无权读取，A/B 各自只能读取自己的测试工作区。写入隔离仍需在测试环境单独验收。");
