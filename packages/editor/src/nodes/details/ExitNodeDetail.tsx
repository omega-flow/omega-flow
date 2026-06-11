import React from "react";
import { FieldGroup } from "../../primitives";
import { useTranslation } from "../../i18n";
import { ExitIcon } from "../icons";
import type { NodeDetailProps } from "../types";

const heroStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "var(--of-spacing-5, 12px)",
  padding: "var(--of-spacing-5, 12px)",
  borderRadius: "var(--of-radius-lg, 8px)",
  border: "1px solid var(--of-color-border-secondary, #E5E7EB)",
  borderLeft: "3px solid var(--of-node-exit-color, #F44336)",
  backgroundColor: "var(--of-color-bg-secondary, #F9FAFB)",
};

const iconBadgeStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  width: "36px",
  height: "36px",
  borderRadius: "var(--of-radius-md, 6px)",
  backgroundColor: "var(--of-color-bg-primary, #fff)",
  border: "1px solid var(--of-color-border-secondary, #E5E7EB)",
};

const heroTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "var(--of-font-size-md, 13px)",
  fontWeight:
    "var(--of-font-weight-semibold, 600)" as React.CSSProperties["fontWeight"],
  color: "var(--of-color-text-primary, #111827)",
};

const heroDescriptionStyle: React.CSSProperties = {
  margin: "var(--of-spacing-2, 6px) 0 0",
  fontSize: "var(--of-font-size-sm, 12px)",
  lineHeight: 1.5,
  color: "var(--of-color-text-tertiary, #6B7280)",
};

const noConfigStyle: React.CSSProperties = {
  marginTop: "var(--of-spacing-5, 12px)",
  padding: "var(--of-spacing-4, 10px) var(--of-spacing-5, 12px)",
  borderRadius: "var(--of-radius-md, 6px)",
  backgroundColor: "var(--of-color-bg-tertiary, #F3F4F6)",
};

const noConfigTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "var(--of-font-size-sm, 12px)",
  fontWeight:
    "var(--of-font-weight-medium, 500)" as React.CSSProperties["fontWeight"],
  color: "var(--of-color-text-secondary, #374151)",
};

const noConfigHintStyle: React.CSSProperties = {
  margin: "var(--of-spacing-1, 4px) 0 0",
  fontSize: "var(--of-font-size-xs, 11px)",
  color: "var(--of-color-text-muted, #9CA3AF)",
};

/**
 * Detail editor for Exit nodes.
 *
 * Exit nodes have no configurable properties, so this panel explains what the
 * node does — the workflow ends when execution reaches it — instead of leaving
 * an empty form.
 */
export function ExitNodeDetail(_props: NodeDetailProps) {
  const t = useTranslation();
  return (
    <FieldGroup label={t("nodeDetails.exit.group")}>
      <div style={heroStyle}>
        <span style={iconBadgeStyle}>
          <ExitIcon size={22} />
        </span>
        <div>
          <p style={heroTitleStyle}>{t("nodeDetails.exit.title")}</p>
          <p style={heroDescriptionStyle}>
            {t("nodeDetails.exit.description")}
          </p>
        </div>
      </div>
      <div style={noConfigStyle}>
        <p style={noConfigTitleStyle}>{t("nodeDetails.exit.noConfigTitle")}</p>
        <p style={noConfigHintStyle}>{t("nodeDetails.exit.noConfigHint")}</p>
      </div>
    </FieldGroup>
  );
}
