import React from "react";
import { JsonField, FieldGroup } from "../../primitives";
import { useTranslation } from "../../i18n";
import type { NodeDetailProps } from "../types";

interface ConditionData {
  conditions?: {
    all?: unknown[];
    any?: unknown[];
  };
}

/**
 * Detail editor for Condition nodes.
 * Allows editing json-rules-engine conditions.
 */
export function ConditionNodeDetail({ node, onChange }: NodeDetailProps) {
  const t = useTranslation();
  const data = node.data as ConditionData;

  const handleConditionsChange = (conditions: unknown) => {
    onChange({
      ...data,
      conditions: conditions as ConditionData["conditions"],
    });
  };

  return (
    <FieldGroup label={t("nodeDetails.condition.group")}>
      <JsonField
        label={t("nodeDetails.condition.conditionsLabel")}
        value={data.conditions ?? { all: [] }}
        onChange={handleConditionsChange}
        hint={t("nodeDetails.condition.conditionsHint")}
        rows={10}
      />
    </FieldGroup>
  );
}
