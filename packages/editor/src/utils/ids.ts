// Counter for generating unique node IDs
let nodeIdCounter = 0;

export function generateNodeId(type: string): string {
  nodeIdCounter++;
  return `${type.toLowerCase()}-${Date.now()}-${nodeIdCounter}`;
}

export function generateEdgeId(source: string, target: string): string {
  return `edge-${source}-${target}-${Date.now()}`;
}
