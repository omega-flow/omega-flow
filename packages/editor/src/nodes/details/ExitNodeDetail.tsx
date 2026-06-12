import React from "react";
import { FieldGroup } from "../../primitives";
import { useTranslation } from "../../i18n";
import type { NodeDetailProps } from "../types";

const descriptionStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "var(--of-font-size-md, 13px)",
  lineHeight: 1.5,
  color: "var(--of-color-text-tertiary, #6B7280)",
};

/**
 * Detail editor for Exit nodes.
 * Exit nodes have no configurable properties, so this panel just describes
 * what the node does: the workflow ends here.
 */
export function ExitNodeDetail(_props: NodeDetailProps) {
  const t = useTranslation();
  return (
    <FieldGroup label={t("nodeDetails.exit.group")}>
      <p style={descriptionStyle}>{t("nodeDetails.exit.message")}</p>
    </FieldGroup>
  );
}
