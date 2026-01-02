import React from "react";
import type { NodeProps } from "@xyflow/react";
import { BaseNodeView } from "./BaseNodeView";

const WAIT_COLOR = "#9C27B0";

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${ms / 1000}s`;
  if (ms < 3600000) return `${ms / 60000}min`;
  return `${ms / 3600000}h`;
}

export function WaitNodeView({ id, data, selected }: NodeProps) {
  const nodeData = data as Record<string, unknown>;
  const params = nodeData.params as { duration?: number } | undefined;
  const duration = params?.duration;

  return (
    <BaseNodeView
      id={id}
      data={nodeData}
      selected={selected}
      label="Wait"
      color={WAIT_COLOR}
      icon="⏱"
      sourceHandles={[{ id: "output" }]}
      targetHandles={[{ id: "input" }]}
    >
      {duration != null ? formatDuration(duration) : <em>No duration set</em>}
    </BaseNodeView>
  );
}
