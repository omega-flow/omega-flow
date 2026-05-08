import React from "react";
import type { NodeProps } from "@xyflow/react";
import { BaseNodeView } from "./BaseNodeView";
import { useTranslation } from "../../i18n";
import { formatDuration } from "../../utils/duration";

const TRIGGER_OR_TIMEOUT_COLOR = "var(--of-node-trigger-timeout-color, #607D8B)";

interface TriggerOrTimeoutData {
  params?: {
    event?: string;
    duration?: number;
  };
}

export function TriggerOrTimeoutNodeView({ id, data, selected }: NodeProps) {
  const t = useTranslation();
  const nodeData = data as Record<string, unknown>;
  const params = (nodeData as TriggerOrTimeoutData).params;
  const eventName = params?.event;
  const duration = params?.duration;

  const description = [
    eventName || t("nodes.triggerOrTimeout.eventFallback"),
    duration != null ? t("nodes.triggerOrTimeout.orDuration", { duration: formatDuration(duration) }) : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <BaseNodeView
      id={id}
      data={nodeData}
      selected={selected}
      label={t("nodes.triggerOrTimeout.label")}
      color={TRIGGER_OR_TIMEOUT_COLOR}
      icon="⏰"
      sourceHandles={[
        { id: "trigger", label: t("nodes.triggerOrTimeout.handleTrigger") },
        { id: "timeout", label: t("nodes.triggerOrTimeout.handleTimeout") },
      ]}
      targetHandles={[{ id: "input" }]}
    >
      {description || <em>{t("nodes.triggerOrTimeout.notConfigured")}</em>}
    </BaseNodeView>
  );
}
