import React from "react";
import { FieldGroup } from "../../primitives";
import type { NodeDetailProps } from "../types";

/**
 * Detail editor for Exit nodes.
 * Exit nodes have no configurable properties.
 */
export function ExitNodeDetail(_props: NodeDetailProps) {
  return (
    <FieldGroup label="Exit Node">
      <p style={{ fontSize: "13px", color: "#6B7280", margin: 0 }}>
        This node ends the workflow. No configuration needed.
      </p>
    </FieldGroup>
  );
}
