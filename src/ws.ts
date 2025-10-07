import WebSocket from "ws";
import { getContainerList, ContainerInfo } from "./docker";

// Exponential backoff with max 15s delay
function getRetryDelay(attempt: number): number {
  const delay = Math.min(2000 * Math.pow(2, attempt), 15000);
  return delay;
}

// Sleep function
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function connectWs(params: { serverUrl: string; accessToken: string; agentId: string }) {
  const { serverUrl, accessToken } = params;
  let attempt = 0;
  
  while (true) {
    try {
      console.log(`[ws] attempting to connect - attempt ${attempt + 1}${attempt > 0 ? ` (after ${getRetryDelay(attempt - 1)}ms delay)` : ''}`);
      
      const url = new URL("/api/agents/connect", serverUrl);
      const ws = new WebSocket(url, { headers: { Authorization: `Bearer ${accessToken}` } });

      let containers: ContainerInfo[] = [];
      let containerUpdateInterval: NodeJS.Timeout | null = null;

      ws.on("open", async () => {
        console.log("[ws] connected successfully");
        attempt = 0; // Reset attempt counter on successful connection
        
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
        
        // Set up periodic container updates
        containerUpdateInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            sendContainerList();
          }
        }, 30000);
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
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: "containers",
              data: containers
            }));
            console.log(`[ws] sent updated container list: ${containers.length} containers`);
          }
        } catch (err) {
          console.error("[ws] failed to send container list:", err);
        }
      };

      ws.on("close", (code, reason) => {
        console.log(`[ws] connection closed - code: ${code}, reason: ${reason}`);
        if (containerUpdateInterval) {
          clearInterval(containerUpdateInterval);
        }
        
        // Don't exit on close, try to reconnect
        setTimeout(() => {
          attempt++;
          const delay = getRetryDelay(attempt - 1);
          console.log(`[ws] will retry connection in ${delay}ms...`);
          connectWs(params);
        }, getRetryDelay(attempt - 1));
      });
      
      ws.on("error", (err) => {
        console.error(`[ws] connection error:`, err);
        if (containerUpdateInterval) {
          clearInterval(containerUpdateInterval);
        }
        
        // Don't exit on error, try to reconnect
        setTimeout(() => {
          attempt++;
          const delay = getRetryDelay(attempt - 1);
          console.log(`[ws] will retry connection in ${delay}ms...`);
          connectWs(params);
        }, getRetryDelay(attempt - 1));
      });
      
      // If we reach here, the WebSocket connection was established
      // Wait for either close or error events
      return new Promise(() => {}); // Keep the function running
      
    } catch (error) {
      console.error(`[ws] connection attempt ${attempt + 1} failed:`, error);
      attempt++;
      
      if (attempt < 10) { // Prevent infinite immediate retries
        const delay = getRetryDelay(attempt - 1);
        console.log(`[ws] retrying connection in ${delay}ms...`);
        await sleep(delay);
      } else {
        console.log(`[ws] too many rapid failures, waiting 30 seconds before retry...`);
        await sleep(30000);
        attempt = 0; // Reset attempt counter
      }
    }
  }
}





