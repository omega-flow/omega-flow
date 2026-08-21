import React from "react";
import { CheckboxField, DynamicValueField } from "../../primitives";
import { useTranslation } from "../../i18n";

/** Shape of the optional `params.match` section on trigger-like nodes. */
export interface MatchParams {
  subjectId?: string;
}

export interface SubscriptionMatchFieldsProps {
  /** Current `params.match` value; undefined = feature off (same-subject wait) */
  match: MatchParams | undefined;
  /** Called with the new match section, or undefined to remove it */
  onChange: (match: MatchParams | undefined) => void;
}

/**
 * Cross-subject wait (event subscription) fields, shared by the Trigger and
 * TriggerOrTimeout detail panels.
 *
 * The toggle maps to the presence of `params.match`: off = the key is absent
 * (the node waits in its own subject space, today's behavior), on = the node
 * registers a subscription on park. An empty subject id means a wildcard
 * subscription ("any subject") — allowed, but each matching event costs one
 * delivery per parked instance, so the hint calls that out.
 */
export function SubscriptionMatchFields({
  match,
  onChange,
}: SubscriptionMatchFieldsProps) {
  const t = useTranslation();
  const enabled = match !== undefined;
  const subjectId = match?.subjectId ?? "";

  const handleToggle = (checked: boolean) => {
    onChange(checked ? { subjectId: "" } : undefined);
  };

  const handleSubjectIdChange = (value: string) => {
    onChange({ subjectId: value });
  };

  return (
    <>
      <CheckboxField
        label={t("nodeDetails.match.toggleLabel")}
        checked={enabled}
        onChange={handleToggle}
      />
      {enabled && (
        <DynamicValueField
          label={t("nodeDetails.match.subjectIdLabel")}
          value={subjectId}
          onChange={handleSubjectIdChange}
          placeholder={t("nodeDetails.match.subjectIdPlaceholder")}
          hint={
            subjectId === ""
              ? t("nodeDetails.match.wildcardHint")
              : t("nodeDetails.match.subjectIdHint")
          }
        />
      )}
    </>
  );
}
