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
  it("labels each output of a multi-output node", () => {
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

    expect(html).toContain("Alpha");
    expect(html).toContain("Beta");
    // Labels sit at the same offsets as the handles they belong to.
    expect(html).toContain("left:33.33333333333333%");
    expect(html).toContain("left:66.66666666666666%");
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

  it("applies the per-handle color to both the dot and its label", () => {
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

    // Dot color for the handle that overrides it, plus its label text color.
    expect(html.match(/#0f0/g)?.length).toBe(2);
    // The handle without an override keeps the node color.
    expect(html).toContain("background-color:#111");
  });

  it("does not render a label row for a single-output node", () => {
    const html = render(
      <BaseNodeView
        id="n1"
        data={{}}
        label="Node"
        color="#111"
        sourceHandles={[{ id: "output", label: "Output" }]}
        targetHandles={[{ id: "input", label: "Input" }]}
      />
    );

    // The label is still available on hover, but no caption is painted.
    expect(html).toContain('data-handle-title="Output"');
    expect(html).not.toContain(">Output<");
    expect(html).not.toContain(">Input<");
  });

  it("omits the label row when a multi-output node supplies no labels", () => {
    const html = render(
      <BaseNodeView
        id="n1"
        data={{}}
        label="Node"
        color="#111"
        sourceHandles={[{ id: "a" }, { id: "b" }]}
      />
    );

    expect(html).not.toContain("<span style");
  });
});

describe("multi-output node views", () => {
  it("distinguishes the Condition node's true and false branches", () => {
    const html = render(
      <ConditionNodeView id="c1" data={{}} selected={false} />
    );

    expect(html).toContain("True");
    expect(html).toContain("False");
    expect(html).toContain("--of-handle-positive-color");
    expect(html).toContain("--of-handle-negative-color");
  });

  it("distinguishes the TriggerOrTimeout node's trigger and timeout branches", () => {
    const html = render(
      <TriggerOrTimeoutNodeView id="t1" data={{}} selected={false} />
    );

    expect(html).toContain("Trigger");
    expect(html).toContain("Timeout");
    expect(html).toContain("--of-handle-positive-color");
    expect(html).toContain("--of-handle-negative-color");
  });
});
