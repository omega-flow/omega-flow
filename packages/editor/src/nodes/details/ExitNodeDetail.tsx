import React from "react";
import { FieldGroup } from "../../primitives";
import { useTranslation } from "../../i18n";
import type { NodeDetailProps } from "../types";

/**
 * Detail editor for Exit nodes.
 * Exit nodes have no configurable properties.
 */
export function ExitNodeDetail(_props: NodeDetailProps) {
  const t = useTranslation();
  return (
    <FieldGroup label={t("nodeDetails.exit.group")}>
      <p style={{ fontSize: "13px", color: "#6B7280", margin: 0 }}>
        {t("nodeDetails.exit.message")}
      </p>
    </FieldGroup>
  );
}
