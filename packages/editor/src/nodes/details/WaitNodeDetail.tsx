import React from "react";
import { DurationField, FieldGroup } from "../../primitives";
import { useTranslation } from "../../i18n";
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
  const t = useTranslation();
  const data = node.data as WaitData;

  const handleDurationChange = (duration: number) => {
    onChange({
      ...data,
      params: { ...data.params, duration },
    });
  };

  return (
    <FieldGroup label={t("nodeDetails.wait.group")}>
      <DurationField
        label={t("nodeDetails.wait.durationLabel")}
        value={data.params?.duration ?? 60000}
        onChange={handleDurationChange}
        hint={t("nodeDetails.wait.durationHint")}
      />
    </FieldGroup>
  );
}
