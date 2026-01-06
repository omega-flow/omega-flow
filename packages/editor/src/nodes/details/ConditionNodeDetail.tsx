import React from "react";
import { JsonField, FieldGroup } from "../../primitives";
import type { NodeDetailProps } from "../types";

interface ConditionData {
  conditions?: {
    all?: unknown[];
    any?: unknown[];
  };
}

/**
 * Detail editor for Condition nodes.
 * Allows editing json-rules-engine conditions.
 */
export function ConditionNodeDetail({ node, onChange }: NodeDetailProps) {
  const data = node.data as ConditionData;

  const handleConditionsChange = (conditions: unknown) => {
    onChange({
      ...data,
      conditions: conditions as ConditionData["conditions"],
    });
  };

  return (
    <FieldGroup label="Condition Configuration">
      <JsonField
        label="Conditions"
        value={data.conditions ?? { all: [] }}
        onChange={handleConditionsChange}
        hint="JSON rules engine format. Use 'all' or 'any' arrays with conditions like: { fact: 'amount', operator: 'greaterThan', value: 100 }"
        rows={10}
      />
    </FieldGroup>
  );
}
