import React from "react";
import type { NodeProps } from "@xyflow/react";
import { BaseNodeView } from "./BaseNodeView";

const TRIGGER_COLOR = "var(--of-node-trigger-color, #4CAF50)";

export function TriggerNodeView({ id, data, selected }: NodeProps) {
  const nodeData = data as Record<string, unknown>;
  const params = nodeData.params as { event?: string } | undefined;
  const eventName = params?.event;

  return (
    <BaseNodeView
      id={id}
      data={nodeData}
      selected={selected}
      label="Trigger"
      color={TRIGGER_COLOR}
      icon="▶"
      sourceHandles={[{ id: "output" }]}
      targetHandles={[]}
    >
      {eventName ? eventName : <em>No event set</em>}
    </BaseNodeView>
  );
}
