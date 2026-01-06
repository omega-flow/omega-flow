import React from "react";
import { TextField, DurationField, FieldGroup } from "../../primitives";
import type { NodeDetailProps } from "../types";

interface TriggerOrTimeoutData {
  params?: {
    event?: string;
    duration?: number;
  };
}

/**
 * Detail editor for TriggerOrTimeout nodes.
 * Allows setting both the event type and timeout duration.
 */
export function TriggerOrTimeoutNodeDetail({ node, onChange }: NodeDetailProps) {
  const data = node.data as TriggerOrTimeoutData;

  const handleEventChange = (event: string) => {
    onChange({
      ...data,
      params: { ...data.params, event },
    });
  };

  const handleDurationChange = (duration: number) => {
    onChange({
      ...data,
      params: { ...data.params, duration },
    });
  };

  return (
    <FieldGroup label="Trigger or Timeout Configuration">
      <TextField
        label="Event Type"
        value={data.params?.event ?? ""}
        onChange={handleEventChange}
        placeholder="e.g., payment.received"
        hint="The event type to wait for"
      />
      <DurationField
        label="Timeout Duration"
        value={data.params?.duration ?? 60000}
        onChange={handleDurationChange}
        hint="Max time to wait before timing out"
      />
    </FieldGroup>
  );
}
