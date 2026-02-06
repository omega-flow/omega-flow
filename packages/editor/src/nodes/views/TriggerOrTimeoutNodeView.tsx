import React from "react";
import type { NodeProps } from "@xyflow/react";
import { BaseNodeView } from "./BaseNodeView";
import { useTranslation } from "../../i18n";

const TRIGGER_OR_TIMEOUT_COLOR = "var(--of-node-trigger-timeout-color, #607D8B)";

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${ms / 1000}s`;
  if (ms < 3600000) return `${ms / 60000}min`;
  return `${ms / 3600000}h`;
}

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
      sourceHandles={[{ id: "output" }]}
      targetHandles={[{ id: "input" }]}
    >
      {description || <em>{t("nodes.triggerOrTimeout.notConfigured")}</em>}
    </BaseNodeView>
  );
}
