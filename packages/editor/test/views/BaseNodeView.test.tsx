import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * ReactFlow's `Handle` needs a live ReactFlowProvider/store, which is not
 * available when rendering a single node in isolation. Replace it with a stub
 * that echoes the props BaseNodeView sets, so the handle styling and labelling
 * can be asserted without mounting a canvas.
 */
jest.mock("@xyflow/react", () => ({
  Position: { Top: "top", Bottom: "bottom" },
  Handle: ({
    id,
    type,
    position,
    title,
    style,
    ...rest
  }: {
    id: string;
    type: string;
    position: string;
    title?: string;
    style?: React.CSSProperties;
    "aria-label"?: string;
  }) => (
    <div
      data-handle-id={id}
      data-handle-type={type}
      data-handle-position={position}
      data-handle-title={title ?? ""}
      data-handle-label={rest["aria-label"] ?? ""}
      style={style}
    />
  ),
}));

import { BaseNodeView } from "../../src/nodes/views/BaseNodeView";
import { ConditionNodeView } from "../../src/nodes/views/ConditionNodeView";
import { TriggerOrTimeoutNodeView } from "../../src/nodes/views/TriggerOrTimeoutNodeView";

function render(element: React.ReactElement): string {
  return renderToStaticMarkup(element);
}

describe("BaseNodeView handles", () => {
  it("spreads handles evenly across the side they sit on", () => {
    const html = render(
      <BaseNodeView
        id="n1"
        data={{}}
        label="Node"
        color="#111"
        sourceHandles={[
          { id: "a", label: "Alpha" },
          { id: "b", label: "Beta" },
        ]}
        targetHandles={[{ id: "input" }]}
      />
    );

    expect(html).toContain("left:33.33333333333333%");
    expect(html).toContain("left:66.66666666666666%");
    // The branch names belong on the edges, not on the node itself.
    expect(html).not.toContain(">Alpha<");
    expect(html).not.toContain(">Beta<");
  });

  it("exposes the label to assistive tech and as a hover tooltip", () => {
    const html = render(
      <BaseNodeView
        id="n1"
        data={{}}
        label="Node"
        color="#111"
        sourceHandles={[
          { id: "a", label: "Alpha" },
          { id: "b", label: "Beta" },
        ]}
      />
    );

    expect(html).toContain('data-handle-title="Alpha"');
    expect(html).toContain('data-handle-label="Alpha"');
    expect(html).toContain('data-handle-title="Beta"');
    expect(html).toContain('data-handle-label="Beta"');
  });

  it("applies the per-handle color to the dot", () => {
    const html = render(
      <BaseNodeView
        id="n1"
        data={{}}
        label="Node"
        color="#111"
        sourceHandles={[
          { id: "a", label: "Alpha", color: "#0f0" },
          { id: "b", label: "Beta" },
        ]}
      />
    );

    expect(html).toContain("background-color:#0f0");
    // The handle without an override keeps the node color.
    expect(html).toContain("background-color:#111");
  });
});

describe("multi-output node views", () => {
  it("names the Condition node's true and false branches", () => {
    const html = render(
      <ConditionNodeView id="c1" data={{}} selected={false} />
    );

    expect(html).toContain('data-handle-id="true"');
    expect(html).toContain('data-handle-title="True"');
    expect(html).toContain('data-handle-id="false"');
    expect(html).toContain('data-handle-title="False"');
    expect(html).toContain("--of-handle-positive-color");
    expect(html).toContain("--of-handle-negative-color");
  });

  it("names the TriggerOrTimeout node's trigger and timeout branches", () => {
    const html = render(
      <TriggerOrTimeoutNodeView id="t1" data={{}} selected={false} />
    );

    expect(html).toContain('data-handle-id="trigger"');
    expect(html).toContain('data-handle-title="Trigger"');
    expect(html).toContain('data-handle-id="timeout"');
    expect(html).toContain('data-handle-title="Timeout"');
    expect(html).toContain("--of-handle-positive-color");
    expect(html).toContain("--of-handle-negative-color");
  });
});
