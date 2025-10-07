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
async function sendHeartbeat(params: HeartbeatParams): Promise<{ success: boolean; newInterval?: number }> {
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
    
    // Check if server returned a new heartbeat interval
    if (response.data && response.data.heartbeatIntervalSeconds) {
      return { success: true, newInterval: response.data.heartbeatIntervalSeconds };
    }
    
    return { success: true };
    
  } catch (error: any) {
    console.error(`[heartbeat] Failed to send heartbeat:`, error.message);
    return { success: false };
  }
}

// Start the heartbeat service
export async function startHeartbeat(params: HeartbeatParams): Promise<void> {
  const { serverUrl, accessToken, agentId } = params;
  
  console.log("[heartbeat] Starting heartbeat service...");
  
  let consecutiveFailures = 0;
  const maxConsecutiveFailures = 5;
  let currentInterval = 30000; // Default 30 seconds, will be updated by server
  let heartbeatTimer: NodeJS.Timeout | null = null;
  
  // Generate initial jitter offset (0-15 seconds) that will be preserved across interval changes
  const jitterOffset = Math.floor(Math.random() * 15000); // 0-15 seconds in milliseconds
  console.log(`[heartbeat] Initial jitter offset: ${jitterOffset}ms (${Math.round(jitterOffset/1000)}s)`);
  
  const scheduleNextHeartbeat = (intervalMs: number) => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
    }
    
    // Calculate the next heartbeat time with jitter offset
    const now = Date.now();
    const timeSinceLastInterval = now % intervalMs;
    const timeUntilNextInterval = intervalMs - timeSinceLastInterval;
    const nextHeartbeatDelay = timeUntilNextInterval + jitterOffset;
    
    console.log(`[heartbeat] Scheduling next heartbeat in ${Math.round(nextHeartbeatDelay/1000)}s (interval: ${intervalMs/1000}s + jitter: ${jitterOffset/1000}s)`);
    
    // Use setTimeout for the first heartbeat to align with jitter, then setInterval for subsequent ones
    heartbeatTimer = setTimeout(async () => {
      // Send the heartbeat
      const result = await sendHeartbeat(params);
      
      if (result.success) {
        consecutiveFailures = 0;
        
        // Check if server sent a new interval
        if (result.newInterval && result.newInterval !== currentInterval / 1000) {
          const newIntervalMs = result.newInterval * 1000;
          console.log(`[heartbeat] Server requested new interval: ${result.newInterval} seconds (was ${currentInterval / 1000} seconds)`);
          currentInterval = newIntervalMs;
          scheduleNextHeartbeat(newIntervalMs);
          return; // Don't set up the interval timer, scheduleNextHeartbeat will handle it
        }
      } else {
        consecutiveFailures++;
        console.log(`[heartbeat] Heartbeat failed (${consecutiveFailures}/${maxConsecutiveFailures})`);
        
        // If too many consecutive failures, try to get a new token
        if (consecutiveFailures >= maxConsecutiveFailures) {
          console.log("[heartbeat] Too many consecutive failures, will retry with exponential backoff");
          consecutiveFailures = 0; // Reset counter
        }
      }
      
      // Set up the regular interval timer for subsequent heartbeats
      heartbeatTimer = setInterval(async () => {
        const result = await sendHeartbeat(params);
        
        if (result.success) {
          consecutiveFailures = 0;
          
          // Check if server sent a new interval
          if (result.newInterval && result.newInterval !== currentInterval / 1000) {
            const newIntervalMs = result.newInterval * 1000;
            console.log(`[heartbeat] Server requested new interval: ${result.newInterval} seconds (was ${currentInterval / 1000} seconds)`);
            currentInterval = newIntervalMs;
            scheduleNextHeartbeat(newIntervalMs);
          }
        } else {
          consecutiveFailures++;
          console.log(`[heartbeat] Heartbeat failed (${consecutiveFailures}/${maxConsecutiveFailures})`);
          
          // If too many consecutive failures, try to get a new token
          if (consecutiveFailures >= maxConsecutiveFailures) {
            console.log("[heartbeat] Too many consecutive failures, will retry with exponential backoff");
            consecutiveFailures = 0; // Reset counter
          }
        }
      }, intervalMs);
      
    }, nextHeartbeatDelay);
  };
  
  // Send initial heartbeat immediately
  console.log("[heartbeat] Sending initial heartbeat...");
  const initialResult = await sendHeartbeat(params);
  if (initialResult.success) {
    consecutiveFailures = 0;
    console.log("[heartbeat] Initial heartbeat successful");
    
    // Use server-provided interval if available, otherwise use default
    if (initialResult.newInterval) {
      currentInterval = initialResult.newInterval * 1000;
      console.log(`[heartbeat] Using server-configured interval: ${initialResult.newInterval} seconds`);
    }
  } else {
    consecutiveFailures++;
    console.log(`[heartbeat] Initial heartbeat failed (${consecutiveFailures}/${maxConsecutiveFailures})`);
  }
  
  // Start periodic heartbeat with current interval
  scheduleNextHeartbeat(currentInterval);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log("[heartbeat] Shutting down heartbeat service...");
    if (heartbeatTimer) {
      clearTimeout(heartbeatTimer);
      clearInterval(heartbeatTimer);
    }
    
    // Send final offline heartbeat
    sendHeartbeat({ ...params, status: 'offline' } as any).catch(() => {
      // Ignore errors on shutdown
    });
    
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log("[heartbeat] Shutting down heartbeat service...");
    if (heartbeatTimer) {
      clearTimeout(heartbeatTimer);
      clearInterval(heartbeatTimer);
    }
    
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
