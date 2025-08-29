import NodeModel from "./NodeModel";
import EdgeModel from "./EdgeModel";

export type Connection = {
  targetNode: NodeModel;
  edge: EdgeModel;
};
