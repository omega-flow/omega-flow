import React from "react";
import type { NodeProps } from "@xyflow/react";
import { BaseNodeView } from "./BaseNodeView";

const ACTION_COLOR = "var(--of-node-action-color, #2196F3)";

export function ActionNodeView({ id, data, selected }: NodeProps) {
  const nodeData = data as Record<string, unknown>;
  const actionName = nodeData.action as string | undefined;

  return (
    <BaseNodeView
      id={id}
      data={nodeData}
      selected={selected}
      label="Action"
      color={ACTION_COLOR}
      icon="⚡"
      sourceHandles={[{ id: "output" }]}
      targetHandles={[{ id: "input" }]}
    >
      {actionName ? actionName : <em>No action set</em>}
    </BaseNodeView>
  );
}
