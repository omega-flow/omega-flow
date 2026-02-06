import React from "react";
import { TextField, JsonField, FieldGroup } from "../../primitives";
import { useTranslation } from "../../i18n";
import type { NodeDetailProps } from "../types";

interface ActionData {
  action?: string;
  params?: Record<string, unknown>;
}

/**
 * Detail editor for Action nodes.
 * Allows setting the action name and parameters.
 */
export function ActionNodeDetail({ node, onChange }: NodeDetailProps) {
  const t = useTranslation();
  const data = node.data as ActionData;

  const handleActionChange = (action: string) => {
    onChange({
      ...data,
      action,
    });
  };

  const handleParamsChange = (params: unknown) => {
    onChange({
      ...data,
      params: params as Record<string, unknown>,
    });
  };

  return (
    <FieldGroup label={t("nodeDetails.action.group")}>
      <TextField
        label={t("nodeDetails.action.nameLabel")}
        value={data.action ?? ""}
        onChange={handleActionChange}
        placeholder={t("nodeDetails.action.namePlaceholder")}
        hint={t("nodeDetails.action.nameHint")}
      />
      <JsonField
        label={t("nodeDetails.action.paramsLabel")}
        value={data.params ?? {}}
        onChange={handleParamsChange}
        hint={t("nodeDetails.action.paramsHint")}
        rows={4}
      />
    </FieldGroup>
  );
}
