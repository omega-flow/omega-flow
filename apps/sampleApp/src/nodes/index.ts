import {
  defaultNodeTypes,
  mergeNodeTypes,
  type NodeTypeDefinition,
} from "@omega-flow/editor";
import { storeTriggerNodeType } from "./storeTrigger";

export const nodeTypes: NodeTypeDefinition[] = mergeNodeTypes(defaultNodeTypes, [
  storeTriggerNodeType,
]);
