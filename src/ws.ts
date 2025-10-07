import WebSocket from "ws";
import { getContainerList, ContainerInfo } from "./docker";

export async function connectWs(params: { serverUrl: string; accessToken: string; agentId: string }) {
  const { serverUrl, accessToken } = params;
  const url = new URL("/api/agents/connect", serverUrl);
  const ws = new WebSocket(url, { headers: { Authorization: `Bearer ${accessToken}` } });

  let containers: ContainerInfo[] = [];

  ws.on("open", async () => {
    console.log("[ws] connected");
    
    // Send initial container list
    try {
      containers = await getContainerList();
      console.log(`[ws] sending ${containers.length} containers to server`);
      ws.send(JSON.stringify({
        type: "containers",
        data: containers
      }));
    } catch (err) {
      console.error("[ws] failed to get container list:", err);
    }
  });

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg?.type === "heartbeat") return;
      if (msg?.type === "request_containers") {
        // Server is requesting current container list
        sendContainerList();
      }
      console.log("[ws] msg:", msg);
    } catch {
      console.log("[ws] raw:", data.toString());
    }
  });

  const sendContainerList = async () => {
    try {
      containers = await getContainerList();
      ws.send(JSON.stringify({
        type: "containers",
        data: containers
      }));
      console.log(`[ws] sent updated container list: ${containers.length} containers`);
    } catch (err) {
      console.error("[ws] failed to send container list:", err);
    }
  };

  // Send container updates every 30 seconds
  setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      sendContainerList();
    }
  }, 30000);

  ws.on("close", () => {
    console.log("[ws] closed");
    process.exit(1);
  });
  ws.on("error", (err) => {
    console.error("[ws] error:", err);
  });
}




