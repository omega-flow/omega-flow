import React from "react";
import type { NodeProps } from "@xyflow/react";
import { BaseNodeView } from "./BaseNodeView";
import { useTranslation } from "../../i18n";

const CONDITION_COLOR = "var(--of-node-condition-color, #FF9800)";
const TRUE_HANDLE_COLOR = "var(--of-handle-positive-color, #2E7D32)";
const FALSE_HANDLE_COLOR = "var(--of-handle-negative-color, #C62828)";

interface ConditionData {
  conditions?: {
    all?: unknown[];
    any?: unknown[];
  };
}

export function ConditionNodeView({ id, data, selected }: NodeProps) {
  const t = useTranslation();
  const nodeData = data as Record<string, unknown>;
  const conditions = (nodeData as ConditionData).conditions;
  const ruleCount =
    (conditions?.all?.length ?? 0) + (conditions?.any?.length ?? 0);

  const ruleLabel =
    ruleCount === 0
      ? null
      : ruleCount === 1
        ? t("nodes.condition.ruleCountSingular")
        : t("nodes.condition.ruleCount", { count: String(ruleCount) });

  return (
    <BaseNodeView
      id={id}
      data={nodeData}
      selected={selected}
      label={t("nodes.condition.label")}
      color={CONDITION_COLOR}
      icon="?"
      sourceHandles={[
        { id: "true", label: t("nodes.condition.handleTrue"), color: TRUE_HANDLE_COLOR },
        { id: "false", label: t("nodes.condition.handleFalse"), color: FALSE_HANDLE_COLOR },
      ]}
      targetHandles={[{ id: "input" }]}
    >
      {ruleLabel ?? <em>{t("nodes.condition.noRules")}</em>}
    </BaseNodeView>
  );
}
