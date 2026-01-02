import React from "react";
import { TextField, JsonField, FieldGroup } from "../../primitives";
import type { NodeDetailProps } from "../types";

interface ActionData {
  action?: string;
  params?: Record<string, unknown>;
}

/**
 * Detail editor for Action nodes.
 * Allows setting the action name and parameters.
 */
export function ActionNodeDetail({ node, onChange }: NodeDetailProps) {
  const data = node.data as ActionData;

  const handleActionChange = (action: string) => {
    onChange({
      ...data,
      action,
    });
  };

  const handleParamsChange = (params: unknown) => {
    onChange({
      ...data,
      params: params as Record<string, unknown>,
    });
  };

  return (
    <FieldGroup label="Action Configuration">
      <TextField
        label="Action Name"
        value={data.action ?? ""}
        onChange={handleActionChange}
        placeholder="e.g., sendEmail, createTask"
        hint="The action to perform when this node is reached"
      />
      <JsonField
        label="Parameters"
        value={data.params ?? {}}
        onChange={handleParamsChange}
        hint="JSON object with action parameters"
        rows={4}
      />
    </FieldGroup>
  );
}
