import axios from "axios";

export async function getAccessTokenWithRefresh(params: { serverUrl: string; agentId: string; refreshSecret: string }) {
  const { serverUrl, agentId, refreshSecret } = params;
  const url = new URL("/api/agent-auth/token", serverUrl).toString();
  const r = await axios.post(url, { agentId, refreshSecret }, { timeout: 15000 });
  return { accessToken: r.data.accessToken as string, expiresInSeconds: r.data.expiresInSeconds as number };
}




