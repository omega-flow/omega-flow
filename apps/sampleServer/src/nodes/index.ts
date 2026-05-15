import { defaultNodeModels, type NodeModelRegistry } from "@omega-flow/engine";
import StoreTriggerModel from "./StoreTriggerModel.js";

export const nodeModels: NodeModelRegistry = {
  ...defaultNodeModels,
  StoreTrigger: StoreTriggerModel,
};
