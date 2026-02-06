import React from "react";
import type { NodeProps } from "@xyflow/react";
import { BaseNodeView } from "./BaseNodeView";
import { useTranslation } from "../../i18n";
import { formatDuration } from "../../utils/duration";

const WAIT_COLOR = "var(--of-node-wait-color, #9C27B0)";

export function WaitNodeView({ id, data, selected }: NodeProps) {
  const t = useTranslation();
  const nodeData = data as Record<string, unknown>;
  const params = nodeData.params as { duration?: number } | undefined;
  const duration = params?.duration;

  return (
    <BaseNodeView
      id={id}
      data={nodeData}
      selected={selected}
      label={t("nodes.wait.label")}
      color={WAIT_COLOR}
      icon="⏱"
      sourceHandles={[{ id: "output" }]}
      targetHandles={[{ id: "input" }]}
    >
      {duration != null ? formatDuration(duration) : <em>{t("nodes.wait.noDuration")}</em>}
    </BaseNodeView>
  );
}
