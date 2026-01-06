# Primitives

The `@omega-flow/editor` package provides reusable form field components for building custom node detail panels.

## Overview

All primitives are designed to work within node detail components and follow consistent styling patterns.

```tsx
import {
  Field,
  TextField,
  NumberField,
  SelectField,
  CheckboxField,
  TextAreaField,
  DurationField,
  JsonField,
  FieldGroup,
} from "@omega-flow/editor";
```

---

## Field

Base wrapper component for form fields.

### Props

```typescript
interface FieldProps {
  label: string;
  children: React.ReactNode;
  error?: string;
  hint?: string;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `label` | `string` | Field label |
| `children` | `ReactNode` | Field input |
| `error` | `string` | Error message (red) |
| `hint` | `string` | Hint text (gray, hidden when error shown) |

### Usage

Use `Field` when building custom input components:

```tsx
import { Field } from "@omega-flow/editor";

function CustomField({ label, value, onChange }) {
  return (
    <Field label={label} hint="Custom input">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}
```

---

## TextField

Single-line text input.

### Props

```typescript
interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  hint?: string;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `label` | `string` | Field label |
| `value` | `string` | Current value |
| `onChange` | `(value: string) => void` | Change handler |
| `placeholder` | `string` | Placeholder text |
| `disabled` | `boolean` | Disable input |
| `error` | `string` | Error message |
| `hint` | `string` | Hint text |

### Usage

```tsx
import { TextField } from "@omega-flow/editor";

function MyNodeDetail({ node, onChange }) {
  const data = node.data;

  return (
    <TextField
      label="Event Type"
      value={data.event || ""}
      onChange={(value) => onChange({ ...data, event: value })}
      placeholder="e.g., user.signup"
      hint="The event that triggers this node"
    />
  );
}
```

---

## NumberField

Numeric input with min/max/step validation.

### Props

```typescript
interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  error?: string;
  hint?: string;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `label` | `string` | Field label |
| `value` | `number` | Current value |
| `onChange` | `(value: number) => void` | Change handler |
| `min` | `number` | Minimum value |
| `max` | `number` | Maximum value |
| `step` | `number` | Step increment |
| `disabled` | `boolean` | Disable input |
| `error` | `string` | Error message |
| `hint` | `string` | Hint text |

### Usage

```tsx
import { NumberField } from "@omega-flow/editor";

function MyNodeDetail({ node, onChange }) {
  const data = node.data;

  return (
    <NumberField
      label="Retry Count"
      value={data.retries || 3}
      onChange={(value) => onChange({ ...data, retries: value })}
      min={0}
      max={10}
      step={1}
      hint="Number of retry attempts"
    />
  );
}
```

---

## SelectField

Dropdown select with options.

### Props

```typescript
interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  hint?: string;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `label` | `string` | Field label |
| `value` | `string` | Selected value |
| `options` | `SelectOption[]` | Available options |
| `onChange` | `(value: string) => void` | Change handler |
| `placeholder` | `string` | Placeholder text |
| `disabled` | `boolean` | Disable select |
| `error` | `string` | Error message |
| `hint` | `string` | Hint text |

### Usage

```tsx
import { SelectField } from "@omega-flow/editor";

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

function MyNodeDetail({ node, onChange }) {
  const data = node.data;

  return (
    <SelectField
      label="Priority"
      value={data.priority || "medium"}
      options={priorityOptions}
      onChange={(value) => onChange({ ...data, priority: value })}
      hint="Task priority level"
    />
  );
}
```

---

## CheckboxField

Boolean toggle checkbox.

### Props

```typescript
interface CheckboxFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `label` | `string` | Field label (clickable) |
| `checked` | `boolean` | Current state |
| `onChange` | `(checked: boolean) => void` | Change handler |
| `disabled` | `boolean` | Disable checkbox |

### Usage

```tsx
import { CheckboxField } from "@omega-flow/editor";

function MyNodeDetail({ node, onChange }) {
  const data = node.data;

  return (
    <CheckboxField
      label="Send notification"
      checked={data.notify || false}
      onChange={(checked) => onChange({ ...data, notify: checked })}
    />
  );
}
```

---

## TextAreaField

Multi-line text input.

### Props

```typescript
interface TextAreaFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  hint?: string;
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | - | Field label |
| `value` | `string` | - | Current value |
| `onChange` | `(value: string) => void` | - | Change handler |
| `rows` | `number` | `4` | Number of visible rows |
| `placeholder` | `string` | - | Placeholder text |
| `disabled` | `boolean` | - | Disable input |
| `error` | `string` | - | Error message |
| `hint` | `string` | - | Hint text |

### Usage

```tsx
import { TextAreaField } from "@omega-flow/editor";

function MyNodeDetail({ node, onChange }) {
  const data = node.data;

  return (
    <TextAreaField
      label="Description"
      value={data.description || ""}
      onChange={(value) => onChange({ ...data, description: value })}
      rows={4}
      placeholder="Enter a description..."
    />
  );
}
```

---

## DurationField

Duration input with unit selection (ms, s, min, h).

### Props

```typescript
interface DurationFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  error?: string;
  hint?: string;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `label` | `string` | Field label |
| `value` | `number` | Duration in milliseconds |
| `onChange` | `(value: number) => void` | Change handler (ms) |
| `disabled` | `boolean` | Disable input |
| `error` | `string` | Error message |
| `hint` | `string` | Hint text |

### Available Units

| Unit | Display | Multiplier |
|------|---------|------------|
| ms | milliseconds | 1 |
| s | seconds | 1,000 |
| min | minutes | 60,000 |
| h | hours | 3,600,000 |

### Usage

```tsx
import { DurationField } from "@omega-flow/editor";

function MyNodeDetail({ node, onChange }) {
  const data = node.data;

  return (
    <DurationField
      label="Timeout"
      value={data.params?.duration || 60000}
      onChange={(value) =>
        onChange({
          ...data,
          params: { ...data.params, duration: value },
        })
      }
      hint="How long to wait before timing out"
    />
  );
}
```

The component automatically:
- Converts stored milliseconds to the most appropriate unit
- Updates the value in milliseconds when user changes input
- Shows "1min" for 60000ms, "2h" for 7200000ms, etc.

---

## JsonField

JSON editor with syntax validation.

### Props

```typescript
interface JsonFieldProps {
  label: string;
  value: unknown;
  onChange: (value: unknown) => void;
  rows?: number;
  disabled?: boolean;
  error?: string;
  hint?: string;
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | - | Field label |
| `value` | `unknown` | - | JSON value |
| `onChange` | `(value: unknown) => void` | - | Change handler |
| `rows` | `number` | `6` | Number of visible rows |
| `disabled` | `boolean` | - | Disable input |
| `error` | `string` | - | Error message |
| `hint` | `string` | - | Hint text |

### Features

- Textarea with monospace font
- Auto-formats JSON with 2-space indentation
- Real-time JSON validation
- Shows "Invalid JSON" error on parse failure
- Syncs with external value changes

### Usage

```tsx
import { JsonField } from "@omega-flow/editor";

function MyNodeDetail({ node, onChange }) {
  const data = node.data;

  return (
    <JsonField
      label="Conditions"
      value={data.conditions || { all: [] }}
      onChange={(value) => onChange({ ...data, conditions: value })}
      rows={8}
      hint="JSON Rules Engine conditions"
    />
  );
}
```

### Example Value

```json
{
  "all": [
    {
      "fact": "user.age",
      "operator": "greaterThan",
      "value": 18
    }
  ]
}
```

---

## FieldGroup

Groups related fields with optional collapse support.

### Props

```typescript
interface FieldGroupProps {
  label?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | - | Group header label |
| `children` | `ReactNode` | - | Child fields |
| `collapsible` | `boolean` | `false` | Enable collapse toggle |
| `defaultCollapsed` | `boolean` | `false` | Initial collapsed state |

### Usage

```tsx
import { FieldGroup, TextField, NumberField } from "@omega-flow/editor";

function MyNodeDetail({ node, onChange }) {
  const data = node.data;

  return (
    <div>
      <TextField
        label="Action"
        value={data.action || ""}
        onChange={(value) => onChange({ ...data, action: value })}
      />

      <FieldGroup label="Advanced Options" collapsible defaultCollapsed>
        <NumberField
          label="Timeout"
          value={data.timeout || 30}
          onChange={(value) => onChange({ ...data, timeout: value })}
        />
        <NumberField
          label="Retries"
          value={data.retries || 3}
          onChange={(value) => onChange({ ...data, retries: value })}
        />
      </FieldGroup>
    </div>
  );
}
```

The collapsible group shows an animated arrow indicator and hides/shows its children when clicked.

---

## Complete Example

Here's a node detail component using multiple primitives:

```tsx
import {
  TextField,
  NumberField,
  SelectField,
  CheckboxField,
  TextAreaField,
  DurationField,
  JsonField,
  FieldGroup,
  type NodeDetailProps,
} from "@omega-flow/editor";

interface MyNodeData {
  name: string;
  action: string;
  priority: string;
  timeout: number;
  retries: number;
  notify: boolean;
  description: string;
  params: Record<string, unknown>;
}

function MyNodeDetail({ node, onChange }: NodeDetailProps) {
  const data = node.data as MyNodeData;

  return (
    <div>
      <TextField
        label="Name"
        value={data.name || ""}
        onChange={(value) => onChange({ ...data, name: value })}
        placeholder="Node name"
      />

      <SelectField
        label="Action"
        value={data.action || ""}
        options={[
          { value: "send_email", label: "Send Email" },
          { value: "send_sms", label: "Send SMS" },
          { value: "webhook", label: "Call Webhook" },
        ]}
        onChange={(value) => onChange({ ...data, action: value })}
      />

      <SelectField
        label="Priority"
        value={data.priority || "medium"}
        options={[
          { value: "low", label: "Low" },
          { value: "medium", label: "Medium" },
          { value: "high", label: "High" },
        ]}
        onChange={(value) => onChange({ ...data, priority: value })}
      />

      <TextAreaField
        label="Description"
        value={data.description || ""}
        onChange={(value) => onChange({ ...data, description: value })}
        rows={3}
      />

      <FieldGroup label="Execution Settings" collapsible>
        <DurationField
          label="Timeout"
          value={data.timeout || 30000}
          onChange={(value) => onChange({ ...data, timeout: value })}
        />

        <NumberField
          label="Retries"
          value={data.retries || 3}
          onChange={(value) => onChange({ ...data, retries: value })}
          min={0}
          max={10}
        />

        <CheckboxField
          label="Send notification on failure"
          checked={data.notify || false}
          onChange={(checked) => onChange({ ...data, notify: checked })}
        />
      </FieldGroup>

      <FieldGroup label="Parameters" collapsible defaultCollapsed>
        <JsonField
          label="Custom Parameters"
          value={data.params || {}}
          onChange={(value) => onChange({ ...data, params: value })}
          hint="Additional parameters as JSON"
        />
      </FieldGroup>
    </div>
  );
}
```

---

## Styling

All primitives use consistent inline styles:
- Gray borders that turn blue on focus
- Red borders and text for errors
- System font with appropriate sizing
- Proper spacing and padding

To customize styling, you can:
1. Wrap primitives in styled containers
2. Use CSS classes on parent elements
3. Build custom fields using the `Field` base component
