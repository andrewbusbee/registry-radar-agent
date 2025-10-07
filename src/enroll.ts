import { makeHttpRequest } from "./utils/http";

export async function enroll(params: { serverUrl: string; agentId: string; enrollToken: string }) {
  const { serverUrl, agentId, enrollToken } = params;
  const url = new URL("/api/agent-auth/enroll", serverUrl).toString();
  
  const response = await makeHttpRequest({
    method: 'POST',
    url: url,
    data: { agentId, enrollToken },
  }, "enrollment");
  
  return { 
    accessToken: response.accessToken as string, 
    refreshSecret: response.refreshSecret as string 
  };
}





