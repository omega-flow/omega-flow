import type { Node } from "@omega-flow/types";

/**
 * Effective name of a node: the user-defined `data.name`, falling back to the
 * node type. Mirrors the engine's `NodeModel.getName()` so what the editor
 * shows is exactly what `{{state.<name>.…}}` templates resolve against.
 */
export function getNodeName(node: Node): string {
  const name = (node.data as Record<string, unknown> | undefined)?.name;
  if (typeof name === "string" && name.trim() !== "") {
    return name.trim();
  }
  return node.type ?? node.id;
}

/**
 * Return `base` if no node already uses it as its effective name, otherwise
 * the first free `base 2`, `base 3`, … suffix. Used to keep node names
 * unique so `{{state.<name>.…}}` references are unambiguous.
 */
export function uniqueNodeName(base: string, nodes: Node[]): string {
  const taken = new Set(nodes.map((node) => getNodeName(node)));
  if (!taken.has(base)) {
    return base;
  }
  let suffix = 2;
  while (taken.has(`${base} ${suffix}`)) {
    suffix++;
  }
  return `${base} ${suffix}`;
}
