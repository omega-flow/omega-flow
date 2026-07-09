import React from "react";
import { TextField, DurationField, FieldGroup } from "../../primitives";
import { useTranslation } from "../../i18n";
import type { NodeDetailProps } from "../types";
import {
  SubscriptionMatchFields,
  type MatchParams,
} from "./SubscriptionMatchFields";

interface TriggerOrTimeoutData {
  params?: {
    event?: string;
    duration?: number;
    match?: MatchParams;
  };
}

/**
 * Detail editor for TriggerOrTimeout nodes.
 * Allows setting the event type, the timeout duration, and an optional
 * cross-subject match (event subscription).
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

  const handleMatchChange = (match: MatchParams | undefined) => {
    const { match: _removed, ...params } = data.params ?? {};
    onChange({
      ...data,
      params: match === undefined ? params : { ...params, match },
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
      <SubscriptionMatchFields
        match={data.params?.match}
        onChange={handleMatchChange}
      />
    </FieldGroup>
  );
}
