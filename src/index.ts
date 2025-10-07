import { enroll } from "./enroll";
import { getAccessTokenWithRefresh } from "./auth";
import { connectWs } from "./ws";
import { startDockerWatch } from "./docker";

async function main() {
  const serverUrl = process.env.SERVER_URL || "";
  const agentId = process.env.AGENT_ID || "";
  const enrollToken = process.env.AGENT_ENROLL_TOKEN;
  let refreshSecret = process.env.REFRESH_SECRET;

  if (!serverUrl || !agentId) {
    throw new Error("Missing SERVER_URL or AGENT_ID");
  }

  if (enrollToken && !refreshSecret) {
    const res = await enroll({ serverUrl, agentId, enrollToken });
    refreshSecret = res.refreshSecret;
    process.env.REFRESH_SECRET = refreshSecret;
    console.log("[agent] enrolled; received refresh secret");
  }

  if (!refreshSecret) {
    throw new Error("Missing REFRESH_SECRET (or provide AGENT_ENROLL_TOKEN for one-time enrollment)");
  }

  const access = await getAccessTokenWithRefresh({ serverUrl, agentId, refreshSecret });
  console.log("[agent] obtained access token");

  // Start monitoring Docker events
  console.log("[agent] starting Docker event monitoring");
  startDockerWatch();

  await connectWs({ serverUrl, accessToken: access.accessToken, agentId });
}

main().catch((err) => {
  console.error("[agent] fatal:", err);
  process.exit(1);
});




