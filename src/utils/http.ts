import axios, { AxiosRequestConfig } from "axios";

// Static User-Agent string
const USER_AGENT = "Registry-Radar-Agent/latest";

// Exponential backoff with max 15s delay
function getRetryDelay(attempt: number): number {
  const delay = Math.min(2000 * Math.pow(2, attempt), 15000);
  return delay;
}

// Sleep function
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Enhanced HTTP request with retry logic
export async function makeHttpRequest<T = any>(
  config: AxiosRequestConfig,
  operation: string,
  maxRetries: number = Infinity
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Set User-Agent and timeout
      const requestConfig: AxiosRequestConfig = {
        ...config,
        timeout: 45000, // 45 second timeout
        headers: {
          ...config.headers,
          'User-Agent': USER_AGENT,
        },
      };

      console.log(`[agent] ${operation} - attempt ${attempt + 1}${attempt > 0 ? ` (after ${getRetryDelay(attempt - 1)}ms delay)` : ''}`);
      
      const response = await axios(requestConfig);
      console.log(`[agent] ${operation} - success on attempt ${attempt + 1}`);
      return response.data;
      
    } catch (error: any) {
      lastError = error;
      
      // Log detailed error information
      if (error.response) {
        console.error(`[agent] ${operation} - attempt ${attempt + 1} failed with status ${error.response.status}: ${error.response.statusText}`);
      } else if (error.request) {
        console.error(`[agent] ${operation} - attempt ${attempt + 1} failed: network error`);
        if (error.code) {
          console.error(`[agent] ${operation} - error code: ${error.code}`);
        }
        if (error.cause?.errors) {
          console.error(`[agent] ${operation} - connection errors:`, error.cause.errors.map((e: any) => `${e.code} ${e.address}:${e.port}`));
        }
      } else {
        console.error(`[agent] ${operation} - attempt ${attempt + 1} failed: ${error.message}`);
      }
      
      // If we've reached max retries, throw the error
      if (attempt === maxRetries - 1) {
        throw error;
      }
      
      // Wait before retrying
      const delay = getRetryDelay(attempt);
      console.log(`[agent] ${operation} - retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
  
  throw lastError;
}

// Health check function
export async function checkHealth(serverUrl: string): Promise<void> {
  const url = new URL("/api/health", serverUrl).toString();
  
  while (true) {
    try {
      console.log("[agent] checking server health...");
      await makeHttpRequest({
        method: 'GET',
        url: url,
      }, "health check", 1); // No retries for health check
      
      console.log("[agent] server health check passed");
      return;
      
    } catch (error) {
      console.error("[agent] server health check failed, retrying in 30 seconds...");
      await sleep(30000);
    }
  }
}
