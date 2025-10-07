import axios from "axios";

export async function enroll(params: { serverUrl: string; agentId: string; enrollToken: string }) {
  const { serverUrl, agentId, enrollToken } = params;
  const url = new URL("/api/agent-auth/enroll", serverUrl).toString();
  const r = await axios.post(url, { agentId, enrollToken }, { timeout: 15000 });
  return { accessToken: r.data.accessToken as string, refreshSecret: r.data.refreshSecret as string };
}




