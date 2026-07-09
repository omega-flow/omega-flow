import React from "react";
import { TextField, FieldGroup } from "../../primitives";
import { useTranslation } from "../../i18n";
import { useWorkflowEditorContext } from "../../context/WorkflowEditorContext";
import type { NodeDetailProps } from "../types";
import {
  SubscriptionMatchFields,
  type MatchParams,
} from "./SubscriptionMatchFields";

interface TriggerData {
  params?: {
    event?: string;
    match?: MatchParams;
  };
}

const warningStyle: React.CSSProperties = {
  padding: "var(--of-spacing-3, 8px) var(--of-spacing-4, 10px)",
  marginBottom: "var(--of-spacing-5, 12px)",
  borderRadius: "var(--of-field-radius, 6px)",
  backgroundColor: "var(--of-color-warning-bg, #FEF3C7)",
  color: "var(--of-color-warning-text, #92400E)",
  fontSize: "var(--of-field-font-size, 13px)",
};

/**
 * Detail editor for Trigger nodes.
 * Allows setting the event type that triggers this node and, for mid-flow
 * triggers (nodes with an incoming edge), an optional cross-subject match
 * (event subscription). Start triggers cannot subscribe — no instance exists
 * yet — so the match section is hidden for them, with a warning if a stale
 * match is present (e.g. after disconnecting the node's incoming edge).
 */
export function TriggerNodeDetail({ node, onChange }: NodeDetailProps) {
  const t = useTranslation();
  const { edges } = useWorkflowEditorContext();
  const data = node.data as TriggerData;

  const isStartNode = !edges.some((edge) => edge.target === node.id);
  const match = data.params?.match;

  const handleEventChange = (event: string) => {
    onChange({
      ...data,
      params: { ...data.params, event },
    });
  };

  const handleMatchChange = (newMatch: MatchParams | undefined) => {
    const { match: _removed, ...params } = data.params ?? {};
    onChange({
      ...data,
      params: newMatch === undefined ? params : { ...params, match: newMatch },
    });
  };

  return (
    <FieldGroup label={t("nodeDetails.trigger.group")}>
      <TextField
        label={t("nodeDetails.trigger.eventLabel")}
        value={data.params?.event ?? ""}
        onChange={handleEventChange}
        placeholder={t("nodeDetails.trigger.eventPlaceholder")}
        hint={t("nodeDetails.trigger.eventHint")}
      />
      {isStartNode && match !== undefined && (
        <div style={warningStyle}>{t("nodeDetails.match.startNodeWarning")}</div>
      )}
      {(!isStartNode || match !== undefined) && (
        <SubscriptionMatchFields match={match} onChange={handleMatchChange} />
      )}
    </FieldGroup>
  );
}
