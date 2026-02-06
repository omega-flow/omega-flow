import React from "react";
import { TextField, DurationField, FieldGroup } from "../../primitives";
import { useTranslation } from "../../i18n";
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
  const t = useTranslation();
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
    <FieldGroup label={t("nodeDetails.triggerOrTimeout.group")}>
      <TextField
        label={t("nodeDetails.triggerOrTimeout.eventLabel")}
        value={data.params?.event ?? ""}
        onChange={handleEventChange}
        placeholder={t("nodeDetails.triggerOrTimeout.eventPlaceholder")}
        hint={t("nodeDetails.triggerOrTimeout.eventHint")}
      />
      <DurationField
        label={t("nodeDetails.triggerOrTimeout.durationLabel")}
        value={data.params?.duration ?? 60000}
        onChange={handleDurationChange}
        hint={t("nodeDetails.triggerOrTimeout.durationHint")}
      />
    </FieldGroup>
  );
}
