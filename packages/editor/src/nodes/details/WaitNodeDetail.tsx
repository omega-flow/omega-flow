import React from "react";
import { DurationField, FieldGroup } from "../../primitives";
import type { NodeDetailProps } from "../types";

interface WaitData {
  params?: {
    duration?: number;
  };
}

/**
 * Detail editor for Wait nodes.
 * Allows setting the wait duration.
 */
export function WaitNodeDetail({ node, onChange }: NodeDetailProps) {
  const data = node.data as WaitData;

  const handleDurationChange = (duration: number) => {
    onChange({
      ...data,
      params: { ...data.params, duration },
    });
  };

  return (
    <FieldGroup label="Wait Configuration">
      <DurationField
        label="Duration"
        value={data.params?.duration ?? 60000}
        onChange={handleDurationChange}
        hint="How long to pause before continuing to the next node"
      />
    </FieldGroup>
  );
}
