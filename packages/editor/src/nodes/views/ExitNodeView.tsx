import React from "react";
import type { NodeProps } from "@xyflow/react";
import { BaseNodeView } from "./BaseNodeView";
import { useTranslation } from "../../i18n";
import { defaultTargetHandles } from "../handles";

const EXIT_COLOR = "var(--of-node-exit-color, #F44336)";

export function ExitNodeView({ id, data, selected }: NodeProps) {
  const t = useTranslation();
  return (
    <BaseNodeView
      id={id}
      data={data as Record<string, unknown>}
      selected={selected}
      label={t("nodes.exit.label")}
      color={EXIT_COLOR}
      icon="⏹"
      sourceHandles={[]}
      targetHandles={defaultTargetHandles}
    >
      {t("nodes.exit.endWorkflow")}
    </BaseNodeView>
  );
}
