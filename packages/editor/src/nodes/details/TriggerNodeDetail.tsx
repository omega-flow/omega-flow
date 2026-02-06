import React from "react";
import { TextField, FieldGroup } from "../../primitives";
import { useTranslation } from "../../i18n";
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
  const t = useTranslation();
  const data = node.data as TriggerData;

  const handleEventChange = (event: string) => {
    onChange({
      ...data,
      params: { ...data.params, event },
    });
  };

  return (
    <FieldGroup label={t("nodeDetails.trigger.group")}>
      <TextField
        label={t("nodeDetails.trigger.eventLabel")}
        value={data.params?.event ?? ""}
        onChange={handleEventChange}
        placeholder={t("nodeDetails.trigger.eventPlaceholder")}
        hint={t("nodeDetails.trigger.eventHint")}
      />
    </FieldGroup>
  );
}
