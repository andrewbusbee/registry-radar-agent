import Docker from "dockerode";

export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  tag: string;
  status: 'running' | 'stopped' | 'exited' | 'paused' | 'restarting';
  created: string;
  labels?: Record<string, string>;
}

// Helper function to parse image and tag properly
function parseImageTag(imageString: string): { image: string; tag: string } {
  // Handle SHA hashes - these are not real image names and should be treated specially
  if (imageString.startsWith('sha256:') && imageString.length > 70) {
    // This is a SHA hash, treat it as a special case
    return { 
      image: imageString, 
      tag: 'sha256' 
    };
  }
  
  // Handle registry URLs and complex image names
  const parts = imageString.split(':');
  if (parts.length === 2) {
    // Check if this is a SHA hash (64 character hex string)
    if (parts[0] === 'sha256' && /^[a-f0-9]{64}$/i.test(parts[1])) {
      return { image: imageString, tag: 'sha256' };
    }
    // Simple case: image:tag
    return { image: parts[0], tag: parts[1] };
  } else if (parts.length > 2) {
    // Complex case: registry.com/ns/image:tag
    const lastPart = parts[parts.length - 1];
    const image = parts.slice(0, -1).join(':');
    return { image, tag: lastPart };
  } else {
    // No tag specified
    return { image: imageString, tag: 'latest' };
  }
}

export async function getContainerList(): Promise<ContainerInfo[]> {
  const docker = new Docker();
  try {
    const containers = await docker.listContainers({ all: true });
    return containers.map(container => {
      const { image, tag } = parseImageTag(container.Image);
      return {
        id: container.Id,
        name: container.Names[0]?.replace('/', '') || container.Id.substring(0, 12),
        image: image,  // Just the image name, no tag
        tag: tag,      // Separate tag field
        status: container.State as any,
        created: new Date(container.Created * 1000).toISOString(),
        labels: container.Labels || {}
      };
    });
  } catch (err) {
    console.error("[docker] failed to list containers:", err);
    return [];
  }
}

export function startDockerWatch() {
  const docker = new Docker();
  docker.getEvents({}, (err: any, stream: any) => {
    if (err) {
      console.warn("[docker] events error:", err.message);
      return;
    }
    stream.on("data", (buf: Buffer) => {
      try {
        const e = JSON.parse(buf.toString());
        if (e.Type === "container") {
          console.log("[docker] event:", e.Action, e.Actor?.Attributes?.name || e.id);
        }
      } catch {}
    });
  });
}
