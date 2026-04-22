import React, { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { Conditions } from "@omega-flow/types";
import type { ConditionBuilderDialogProps } from "./types";
import { ConditionBuilder } from "./ConditionBuilder";
import { useTranslation } from "../../i18n";

const backdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0, 0, 0, 0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10000,
  animation: "of-dialog-fade-in 0.15s ease-out",
};

const dialogStyle: React.CSSProperties = {
  backgroundColor: "var(--of-panel-bg, #fff)",
  borderRadius: "var(--of-radius-lg, 8px)",
  boxShadow: "0 20px 60px rgba(0, 0, 0, 0.2)",
  width: "min(680px, calc(100vw - 48px))",
  maxHeight: "calc(100vh - 48px)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  animation: "of-dialog-slide-in 0.15s ease-out",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "var(--of-spacing-6, 16px) var(--of-spacing-7, 20px)",
  borderBottom: "1px solid var(--of-color-border-secondary, #E5E7EB)",
  flexShrink: 0,
};

const titleStyle: React.CSSProperties = {
  fontSize: "var(--of-font-size-lg, 14px)",
  fontWeight: "var(--of-font-weight-semibold, 600)" as React.CSSProperties["fontWeight"],
  color: "var(--of-color-text-primary, #111827)",
};

const closeButtonStyle: React.CSSProperties = {
  padding: "var(--of-spacing-1, 4px) var(--of-spacing-2, 6px)",
  border: "none",
  background: "none",
  color: "var(--of-color-text-muted, #9CA3AF)",
  cursor: "pointer",
  fontSize: "18px",
  lineHeight: 1,
  borderRadius: "var(--of-radius-sm, 4px)",
};

const bodyStyle: React.CSSProperties = {
  padding: "var(--of-spacing-7, 20px)",
  overflowY: "auto",
  flex: 1,
};

const footerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "var(--of-spacing-3, 8px)",
  padding: "var(--of-spacing-6, 16px) var(--of-spacing-7, 20px)",
  borderTop: "1px solid var(--of-color-border-secondary, #E5E7EB)",
  flexShrink: 0,
};

const cancelButtonStyle: React.CSSProperties = {
  padding: "var(--of-button-padding, 8px 16px)",
  border: "1px solid var(--of-color-border-primary, #D1D5DB)",
  borderRadius: "var(--of-button-radius, 6px)",
  backgroundColor: "var(--of-field-bg, #fff)",
  color: "var(--of-color-text-secondary, #374151)",
  cursor: "pointer",
  fontSize: "var(--of-font-size-sm, 12px)",
  fontWeight: "var(--of-font-weight-medium, 500)" as React.CSSProperties["fontWeight"],
};

const applyButtonStyle: React.CSSProperties = {
  padding: "var(--of-button-padding, 8px 16px)",
  border: "none",
  borderRadius: "var(--of-button-radius, 6px)",
  backgroundColor: "var(--of-button-primary-bg, #3B82F6)",
  color: "var(--of-button-primary-color, #fff)",
  cursor: "pointer",
  fontSize: "var(--of-font-size-sm, 12px)",
  fontWeight: "var(--of-font-weight-medium, 500)" as React.CSSProperties["fontWeight"],
};

// Inject keyframe animations once
let stylesInjected = false;
function injectStyles() {
  if (stylesInjected || typeof document === "undefined") return;
  stylesInjected = true;
  const style = document.createElement("style");
  style.textContent = `
    @keyframes of-dialog-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes of-dialog-slide-in {
      from { opacity: 0; transform: translateY(-8px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
  `;
  document.head.appendChild(style);
}

/**
 * Dialog wrapper for the ConditionBuilder.
 * Opens as a modal overlay using React portal.
 */
export function ConditionBuilderDialog({
  open,
  onClose,
  value,
  onChange,
  properties,
  operators,
}: ConditionBuilderDialogProps) {
  const t = useTranslation();
  const [draft, setDraft] = useState<Conditions>(value);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Reset draft when dialog opens
  useEffect(() => {
    if (open) {
      setDraft(value);
      injectStyles();
    }
  }, [open, value]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const handleDraftChange = useCallback((next: Conditions) => {
    setDraft(next);
  }, []);

  const handleApply = () => {
    onChange(draft);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) {
      onClose();
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      ref={backdropRef}
      style={backdropStyle}
      onClick={handleBackdropClick}
    >
      <div style={dialogStyle} role="dialog" aria-modal="true">
        <div style={headerStyle}>
          <div style={titleStyle}>
            {t("conditionBuilder.dialogTitle")}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={closeButtonStyle}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color =
                "var(--of-color-text-primary, #111827)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color =
                "var(--of-color-text-muted, #9CA3AF)")
            }
          >
            ✕
          </button>
        </div>

        <div style={bodyStyle}>
          <ConditionBuilder
            value={draft}
            onChange={handleDraftChange}
            properties={properties}
            operators={operators}
          />
        </div>

        <div style={footerStyle}>
          <button
            type="button"
            onClick={onClose}
            style={cancelButtonStyle}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor =
                "var(--of-color-bg-tertiary, #F3F4F6)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor =
                "var(--of-field-bg, #fff)")
            }
          >
            {t("conditionBuilder.cancel")}
          </button>
          <button
            type="button"
            onClick={handleApply}
            style={applyButtonStyle}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor =
                "var(--of-button-primary-bg-hover, #2563EB)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor =
                "var(--of-button-primary-bg, #3B82F6)")
            }
          >
            {t("conditionBuilder.apply")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
