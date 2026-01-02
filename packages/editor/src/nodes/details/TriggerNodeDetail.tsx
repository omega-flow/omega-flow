import React from "react";
import { TextField, FieldGroup } from "../../primitives";
import type { NodeDetailProps } from "../types";

interface TriggerData {
  params?: {
    event?: string;
  };
}

/**
 * Detail editor for Trigger nodes.
 * Allows setting the event type that triggers this node.
 */
export function TriggerNodeDetail({ node, onChange }: NodeDetailProps) {
  const data = node.data as TriggerData;

  const handleEventChange = (event: string) => {
    onChange({
      ...data,
      params: { ...data.params, event },
    });
  };

  return (
    <FieldGroup label="Trigger Configuration">
      <TextField
        label="Event Type"
        value={data.params?.event ?? ""}
        onChange={handleEventChange}
        placeholder="e.g., user.signup, order.placed"
        hint="The event type that will start this workflow"
      />
    </FieldGroup>
  );
}
