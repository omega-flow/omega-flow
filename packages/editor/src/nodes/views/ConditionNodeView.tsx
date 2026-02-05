import React from "react";
import type { NodeProps } from "@xyflow/react";
import { BaseNodeView } from "./BaseNodeView";

const CONDITION_COLOR = "var(--of-node-condition-color, #FF9800)";

interface ConditionData {
  conditions?: {
    all?: unknown[];
    any?: unknown[];
  };
}

export function ConditionNodeView({ id, data, selected }: NodeProps) {
  const nodeData = data as Record<string, unknown>;
  const conditions = (nodeData as ConditionData).conditions;
  const ruleCount =
    (conditions?.all?.length ?? 0) + (conditions?.any?.length ?? 0);

  return (
    <BaseNodeView
      id={id}
      data={nodeData}
      selected={selected}
      label="Condition"
      color={CONDITION_COLOR}
      icon="?"
      sourceHandles={[
        { id: "true", label: "True" },
        { id: "false", label: "False" },
      ]}
      targetHandles={[{ id: "input" }]}
    >
      {ruleCount > 0 ? `${ruleCount} rule${ruleCount > 1 ? "s" : ""}` : <em>No rules</em>}
    </BaseNodeView>
  );
}
