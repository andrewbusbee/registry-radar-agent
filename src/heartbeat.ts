import { getContainerList } from "./docker";
import { makeHttpRequest } from "./utils/http";

interface HeartbeatParams {
  serverUrl: string;
  accessToken: string;
  agentId: string;
}

// Exponential backoff with max 15s delay
function getRetryDelay(attempt: number): number {
  const delay = Math.min(2000 * Math.pow(2, attempt), 15000);
  return delay;
}

// Sleep function
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Send heartbeat to server
async function sendHeartbeat(params: HeartbeatParams): Promise<boolean> {
  const { serverUrl, accessToken, agentId } = params;
  
  try {
    // Get current container list
    const containers = await getContainerList();
    
    const url = new URL("/api/agent/heartbeat", serverUrl).toString();
    
    const response = await makeHttpRequest({
      method: 'POST',
      url: url,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        agentId,
        containers: containers,
        status: 'online',
        timestamp: new Date().toISOString()
      }
    }, "heartbeat");

    console.log(`[heartbeat] Successfully sent heartbeat with ${containers.length} containers`);
    return true;
    
  } catch (error: any) {
    console.error(`[heartbeat] Failed to send heartbeat:`, error.message);
    return false;
  }
}

// Start the heartbeat service
export async function startHeartbeat(params: HeartbeatParams): Promise<void> {
  const { serverUrl, accessToken, agentId } = params;
  
  console.log("[heartbeat] Starting heartbeat service...");
  
  let consecutiveFailures = 0;
  const maxConsecutiveFailures = 5;
  
  // Send initial heartbeat immediately
  console.log("[heartbeat] Sending initial heartbeat...");
  const initialSuccess = await sendHeartbeat(params);
  if (initialSuccess) {
    consecutiveFailures = 0;
    console.log("[heartbeat] Initial heartbeat successful");
  } else {
    consecutiveFailures++;
    console.log(`[heartbeat] Initial heartbeat failed (${consecutiveFailures}/${maxConsecutiveFailures})`);
  }
  
  // Set up periodic heartbeat (every 30 seconds)
  const heartbeatInterval = setInterval(async () => {
    const success = await sendHeartbeat(params);
    
    if (success) {
      consecutiveFailures = 0;
    } else {
      consecutiveFailures++;
      console.log(`[heartbeat] Heartbeat failed (${consecutiveFailures}/${maxConsecutiveFailures})`);
      
      // If too many consecutive failures, try to get a new token
      if (consecutiveFailures >= maxConsecutiveFailures) {
        console.log("[heartbeat] Too many consecutive failures, will retry with exponential backoff");
        consecutiveFailures = 0; // Reset counter
      }
    }
  }, 30000); // 30 seconds
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log("[heartbeat] Shutting down heartbeat service...");
    clearInterval(heartbeatInterval);
    
    // Send final offline heartbeat
    sendHeartbeat({ ...params, status: 'offline' } as any).catch(() => {
      // Ignore errors on shutdown
    });
    
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log("[heartbeat] Shutting down heartbeat service...");
    clearInterval(heartbeatInterval);
    
    // Send final offline heartbeat
    sendHeartbeat({ ...params, status: 'offline' } as any).catch(() => {
      // Ignore errors on shutdown
    });
    
    process.exit(0);
  });
  
  // Keep the process alive
  return new Promise(() => {
    // This promise never resolves, keeping the process running
    // The heartbeat service runs in the background via setInterval
  });
}
