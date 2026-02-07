# Custom Nodes for Editor

This guide explains how to create custom node types for the Omega Flow visual editor.

::: tip Complete Custom Node Implementation
A complete custom node implementation requires both:
1. **Editor-side**: NodeTypeDefinition (this guide) - handles visual representation
2. **Engine-side**: NodeModel class (see [Custom Nodes for Engine](/guide/engine-custom-nodes)) - handles execution logic

Both parts use the same `type` identifier to connect them.
:::

## Overview

Each node type in the editor consists of:
1. **NodeTypeDefinition** - Metadata and configuration
2. **ViewComponent** - Renders the node on the canvas
3. **DetailComponent** - Renders the properties panel

## NodeTypeDefinition

The `NodeTypeDefinition` interface defines a complete node type:

```typescript
interface NodeTypeDefinition {
  // Unique identifier (e.g., "MyCustomNode")
  type: string;

  // Display name in the nodes panel
  label: string;

  // Optional description/tooltip
  description?: string;

  // Optional icon component
  Icon?: ComponentType<{ size?: number }>;

  // Initial data when node is created
  defaultData: Record<string, unknown>;

  // Component rendered on the canvas
  ViewComponent: ComponentType<NodeViewProps>;

  // Component rendered in the detail panel
  DetailComponent: ComponentType<NodeDetailProps>;
}
```

Connection handles (input/output ports) are defined in the `ViewComponent` using `BaseNodeView`. See [Step 3](#step-3-create-the-view-component) for details.

## Creating a Custom Node

Let's create a custom "SendEmail" node step by step.

### Step 1: Define the Node Data

First, define the data structure for your node:

```typescript
interface SendEmailData {
  to: string;
  subject: string;
  body: string;
  template?: string;
}
```

### Step 2: Create the Icon Component

```tsx
function SendEmailIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
    </svg>
  );
}
```

### Step 3: Create the View Component

The view component renders on the canvas. Use `BaseNodeView` for consistent styling:

```tsx
import { BaseNodeView, type NodeViewProps } from "@omega-flow/editor";

const SEND_EMAIL_COLOR = "#E91E63";

function SendEmailNodeView({ id, data, selected }: NodeViewProps) {
  const nodeData = data as SendEmailData;

  return (
    <BaseNodeView
      id={id}
      data={data as Record<string, unknown>}
      selected={selected}
      label="Send Email"
      color={SEND_EMAIL_COLOR}
      icon={<SendEmailIcon size={16} />}
      sourceHandles={[{ id: "output", label: "Next" }]}
      targetHandles={[{ id: "input", label: "In" }]}
    >
      {nodeData.to ? (
        <span>To: {nodeData.to}</span>
      ) : (
        <span style={{ opacity: 0.5 }}>No recipient set</span>
      )}
    </BaseNodeView>
  );
}
```

### Step 4: Create the Detail Component

The detail component renders in the properties panel. Use primitives for form fields:

```tsx
import {
  TextField,
  TextAreaField,
  FieldGroup,
  type NodeDetailProps,
} from "@omega-flow/editor";

function SendEmailNodeDetail({ node, onChange }: NodeDetailProps) {
  const data = node.data as SendEmailData;

  return (
    <div>
      <TextField
        label="To"
        value={data.to || ""}
        onChange={(value) => onChange({ ...data, to: value })}
        placeholder="recipient@example.com"
      />

      <TextField
        label="Subject"
        value={data.subject || ""}
        onChange={(value) => onChange({ ...data, subject: value })}
        placeholder="Email subject"
      />

      <TextAreaField
        label="Body"
        value={data.body || ""}
        onChange={(value) => onChange({ ...data, body: value })}
        rows={4}
        placeholder="Email body content..."
      />

      <FieldGroup label="Advanced" collapsible defaultCollapsed>
        <TextField
          label="Template ID"
          value={data.template || ""}
          onChange={(value) => onChange({ ...data, template: value })}
          placeholder="Optional template ID"
          hint="Use a template instead of body content"
        />
      </FieldGroup>
    </div>
  );
}
```

### Step 5: Create the Node Definition

```tsx
import type { NodeTypeDefinition } from "@omega-flow/editor";

const sendEmailNodeType: NodeTypeDefinition = {
  type: "SendEmail",
  label: "Send Email",
  description: "Sends an email to a recipient",
  Icon: SendEmailIcon,
  defaultData: {
    to: "",
    subject: "",
    body: "",
    template: "",
  },
  ViewComponent: SendEmailNodeView,
  DetailComponent: SendEmailNodeDetail,
};
```

### Step 6: Register the Node Type

Pass your custom node types to `WorkflowEditor`:

```tsx
import { WorkflowEditor, defaultNodeTypes } from "@omega-flow/editor";

// Combine default nodes with custom nodes
const allNodeTypes = [...defaultNodeTypes, sendEmailNodeType];

function App() {
  return (
    <WorkflowEditor nodeTypes={allNodeTypes}>
      <EditorCanvas />
    </WorkflowEditor>
  );
}
```

## Complete Example

Here's the full custom node in one file:

```tsx
import type { NodeTypeDefinition, NodeViewProps, NodeDetailProps } from "@omega-flow/editor";
import { BaseNodeView, TextField, TextAreaField, FieldGroup } from "@omega-flow/editor";

// Data interface
interface SendEmailData {
  to: string;
  subject: string;
  body: string;
  template?: string;
}

// Constants
const SEND_EMAIL_COLOR = "#E91E63";

// Icon component
function SendEmailIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
    </svg>
  );
}

// View component (canvas)
function SendEmailNodeView({ id, data, selected }: NodeViewProps) {
  const nodeData = data as SendEmailData;

  return (
    <BaseNodeView
      id={id}
      data={data as Record<string, unknown>}
      selected={selected}
      label="Send Email"
      color={SEND_EMAIL_COLOR}
      icon={<SendEmailIcon size={16} />}
      sourceHandles={[{ id: "output", label: "Next" }]}
      targetHandles={[{ id: "input", label: "In" }]}
    >
      {nodeData.to ? (
        <span>To: {nodeData.to}</span>
      ) : (
        <span style={{ opacity: 0.5 }}>No recipient set</span>
      )}
    </BaseNodeView>
  );
}

// Detail component (properties panel)
function SendEmailNodeDetail({ node, onChange }: NodeDetailProps) {
  const data = node.data as SendEmailData;

  return (
    <div>
      <TextField
        label="To"
        value={data.to || ""}
        onChange={(value) => onChange({ ...data, to: value })}
        placeholder="recipient@example.com"
      />
      <TextField
        label="Subject"
        value={data.subject || ""}
        onChange={(value) => onChange({ ...data, subject: value })}
        placeholder="Email subject"
      />
      <TextAreaField
        label="Body"
        value={data.body || ""}
        onChange={(value) => onChange({ ...data, body: value })}
        rows={4}
        placeholder="Email body content..."
      />
      <FieldGroup label="Advanced" collapsible defaultCollapsed>
        <TextField
          label="Template ID"
          value={data.template || ""}
          onChange={(value) => onChange({ ...data, template: value })}
          hint="Use a template instead of body content"
        />
      </FieldGroup>
    </div>
  );
}

// Node type definition
export const sendEmailNodeType: NodeTypeDefinition = {
  type: "SendEmail",
  label: "Send Email",
  description: "Sends an email to a recipient",
  Icon: SendEmailIcon,
  defaultData: {
    to: "",
    subject: "",
    body: "",
    template: "",
  },
  ViewComponent: SendEmailNodeView,
  DetailComponent: SendEmailNodeDetail,
};
```

## Multiple Output Handles

For nodes that need branching (like conditions), define multiple source handles in the ViewComponent:

```tsx
function BranchNodeView({ id, data, selected }: NodeViewProps) {
  return (
    <BaseNodeView
      id={id}
      data={data as Record<string, unknown>}
      selected={selected}
      label="Branch"
      color="#FF9800"
      sourceHandles={[
        { id: "yes", label: "Yes" },
        { id: "no", label: "No" },
        { id: "error", label: "Error" },
      ]}
      targetHandles={[{ id: "input", label: "In" }]}
    >
      {/* Node content */}
    </BaseNodeView>
  );
}
```

## Nodes Without Inputs (Start Nodes)

For nodes that start a workflow (like Trigger), omit target handles:

```tsx
function StartNodeView({ id, data, selected }: NodeViewProps) {
  return (
    <BaseNodeView
      id={id}
      data={data as Record<string, unknown>}
      selected={selected}
      label="Start"
      color="#4CAF50"
      sourceHandles={[{ id: "output", label: "Next" }]}
      targetHandles={[]}  // No inputs
    >
      {/* Node content */}
    </BaseNodeView>
  );
}
```

## Nodes Without Outputs (End Nodes)

For nodes that terminate a workflow (like Exit), omit source handles:

```tsx
function EndNodeView({ id, data, selected }: NodeViewProps) {
  return (
    <BaseNodeView
      id={id}
      data={data as Record<string, unknown>}
      selected={selected}
      label="End"
      color="#F44336"
      sourceHandles={[]}  // No outputs
      targetHandles={[{ id: "input", label: "In" }]}
    >
      {/* Node content */}
    </BaseNodeView>
  );
}
```

## Using Built-in Views and Details

You can extend or reuse built-in components:

```tsx
import {
  TriggerNodeView,
  TriggerNodeDetail,
  ActionNodeView,
  ActionNodeDetail,
  ConditionNodeView,
  ConditionNodeDetail,
  WaitNodeView,
  WaitNodeDetail,
  ExitNodeView,
  ExitNodeDetail,
  TriggerOrTimeoutNodeView,
  TriggerOrTimeoutNodeDetail,
} from "@omega-flow/editor";
```

## Available Primitives

Use these primitives for building detail components:

| Primitive | Description |
|-----------|-------------|
| `TextField` | Single-line text input |
| `NumberField` | Numeric input with min/max/step |
| `SelectField` | Dropdown select |
| `CheckboxField` | Boolean toggle |
| `TextAreaField` | Multi-line text input |
| `DurationField` | Duration with unit selection (ms/s/min/h) |
| `JsonField` | JSON editor with validation |
| `FieldGroup` | Groups fields with optional collapse |
| `Field` | Base wrapper for custom fields |

See the [Primitives API](/api/primitives) for details.

## Best Practices

1. **Use TypeScript** - Define interfaces for your node data
2. **Consistent colors** - Use distinct colors for different node types
3. **Clear icons** - Use simple, recognizable icons
4. **Meaningful defaults** - Set sensible default values
5. **Helpful hints** - Add hint text to fields for guidance
6. **Validation** - Validate data in the detail component
7. **Collapsible groups** - Group advanced options to reduce clutter
8. **Use `useTranslation`** - Use the `useTranslation()` hook for all user-facing strings so your nodes support localization. See [Localization](/guide/localization) for details.

## Next Steps

- Create the [engine-side custom node](/guide/engine-custom-nodes) for execution logic
- Explore [Primitives API](/api/primitives) for all form fields
- See [Types Reference](/api/types) for all TypeScript types
- Check the [Hooks API](/api/hooks) for programmatic control
- Read the [Localization Guide](/guide/localization) for translating custom nodes
