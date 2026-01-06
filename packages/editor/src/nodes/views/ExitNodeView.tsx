import React from "react";
import type { NodeProps } from "@xyflow/react";
import { BaseNodeView } from "./BaseNodeView";

const EXIT_COLOR = "#F44336";

export function ExitNodeView({ id, data, selected }: NodeProps) {
  return (
    <BaseNodeView
      id={id}
      data={data as Record<string, unknown>}
      selected={selected}
      label="Exit"
      color={EXIT_COLOR}
      icon="⏹"
      sourceHandles={[]}
      targetHandles={[{ id: "input" }]}
    >
      End workflow
    </BaseNodeView>
  );
}
