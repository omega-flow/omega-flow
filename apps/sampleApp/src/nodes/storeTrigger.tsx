import {
  BaseNodeView,
  FieldGroup,
  SelectField,
  type NodeDetailProps,
  type NodeTypeDefinition,
  type NodeViewProps,
  type SelectOption,
} from "@omega-flow/editor";

const STORE_TRIGGER_TYPE = "StoreTrigger";
const STORE_TRIGGER_COLOR = "#00B894";

const STORE_ACTIONS: SelectOption[] = [
  { value: "store.product.viewed", label: "Product viewed" },
  { value: "store.product.added_to_cart", label: "Product added to cart" },
  { value: "store.cart.abandoned", label: "Cart abandoned" },
  { value: "store.checkout.started", label: "Checkout started" },
  { value: "store.order.placed", label: "Order placed" },
  { value: "store.order.paid", label: "Order paid" },
  { value: "store.order.refunded", label: "Order refunded" },
  { value: "store.product.reviewed", label: "Product reviewed" },
];

interface StoreTriggerData {
  params?: {
    action?: string;
  };
}

function StoreTriggerIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={STORE_TRIGGER_COLOR}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 9h18l-1.6 9.2a2 2 0 0 1-2 1.8H6.6a2 2 0 0 1-2-1.8L3 9Z" />
      <path d="M8 9V6a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function StoreTriggerNodeView({ id, data, selected }: NodeViewProps) {
  const nodeData = data as StoreTriggerData;
  const action = nodeData.params?.action;
  const matchedLabel = STORE_ACTIONS.find((o) => o.value === action)?.label;

  return (
    <BaseNodeView
      id={id}
      data={data as Record<string, unknown>}
      selected={selected}
      label="Store Trigger"
      color={STORE_TRIGGER_COLOR}
      icon={<StoreTriggerIcon size={16} />}
      sourceHandles={[{ id: "output" }]}
      targetHandles={[]}
    >
      {matchedLabel ? (
        matchedLabel
      ) : (
        <em style={{ opacity: 0.6 }}>No action selected</em>
      )}
    </BaseNodeView>
  );
}

function StoreTriggerNodeDetail({ node, onChange }: NodeDetailProps) {
  const data = node.data as StoreTriggerData;

  const handleActionChange = (action: string) => {
    onChange({
      ...data,
      params: { ...data.params, action },
    });
  };

  return (
    <FieldGroup label="Store Trigger">
      <SelectField
        label="Store action"
        value={data.params?.action ?? ""}
        options={STORE_ACTIONS}
        onChange={handleActionChange}
        placeholder="Select an action..."
        hint="Workflow starts when this store event arrives"
      />
    </FieldGroup>
  );
}

export const storeTriggerNodeType: NodeTypeDefinition = {
  type: STORE_TRIGGER_TYPE,
  label: "Store Trigger",
  description: "Starts the workflow on a specific store action",
  Icon: StoreTriggerIcon,
  defaultData: { params: { action: "" } },
  ViewComponent: StoreTriggerNodeView,
  DetailComponent: StoreTriggerNodeDetail,
};
