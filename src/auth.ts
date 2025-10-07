import { makeHttpRequest } from "./utils/http";

export async function getAccessTokenWithRefresh(params: { serverUrl: string; agentId: string; refreshSecret: string }) {
  const { serverUrl, agentId, refreshSecret } = params;
  const url = new URL("/api/agent-auth/token", serverUrl).toString();
  
  const response = await makeHttpRequest({
    method: 'POST',
    url: url,
    data: { agentId, refreshSecret },
  }, "token refresh");
  
  return { 
    accessToken: response.accessToken as string, 
    expiresInSeconds: response.expiresInSeconds as number 
  };
}





