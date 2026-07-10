import type { TranslationDictionary } from "./types";

/**
 * Default English translations for all editor UI strings.
 *
 * Keys use a dot-separated hierarchy:
 * - `panels.*` — Panel titles and UI
 * - `nodes.*` — Node views (canvas labels, empty states)
 * - `nodeDetails.*` — Node detail editors (field labels, hints)
 * - `fields.*` — Shared field/primitive strings
 */
export const defaultTranslations: TranslationDictionary = {
  // ── Control Panel ──────────────────────────────────────────
  "panels.control.title": "Workflow",
  "panels.control.nameLabel": "Name",
  "panels.control.namePlaceholder": "Workflow name",
  "panels.control.saving": "Saving...",
  "panels.control.savedSuccessfully": "Saved successfully",
  "panels.control.failedToSave": "Failed to save",
  "panels.control.unsavedChanges": "Unsaved changes",

  // ── Detail Panel ───────────────────────────────────────────
  "panels.detail.title": "Properties",
  "panels.detail.emptyMessage": "Select a node to edit its properties",
  "panels.detail.delete": "Delete",
  "panels.detail.deleteTitle": "Delete node",

  // ── Nodes Panel ────────────────────────────────────────────
  "panels.nodes.title": "Nodes",

  // ── Options Panel ──────────────────────────────────────────
  "panels.options.title": "Options",
  "panels.options.frequencyGroup": "Frequency",
  "panels.options.frequencyTypeLabel": "Type",
  "panels.options.frequencyTypeHint": "How often this workflow can run for a subject",
  "panels.options.frequencyOneTime": "One time",
  "panels.options.frequencyEveryRematch": "Every rematch",
  "panels.options.intervalLabel": "Interval",
  "panels.options.intervalHint": "Minimum time between runs",

  // ── Node Views (canvas) ────────────────────────────────────
  "nodes.trigger.label": "Trigger",
  "nodes.trigger.noEvent": "No event set",

  "nodes.action.label": "Action",
  "nodes.action.noAction": "No action set",

  "nodes.condition.label": "Condition",
  "nodes.condition.noRules": "No rules",
  "nodes.condition.ruleCount": "{{count}} rules",
  "nodes.condition.ruleCountSingular": "1 rule",
  "nodes.condition.handleTrue": "True",
  "nodes.condition.handleFalse": "False",

  "nodes.wait.label": "Wait",
  "nodes.wait.noDuration": "No duration set",

  "nodes.triggerOrTimeout.label": "Trigger or Timeout",
  "nodes.triggerOrTimeout.notConfigured": "Not configured",
  "nodes.triggerOrTimeout.eventFallback": "event",
  "nodes.triggerOrTimeout.orDuration": "or {{duration}}",
  "nodes.triggerOrTimeout.handleTrigger": "Trigger",
  "nodes.triggerOrTimeout.handleTimeout": "Timeout",

  "nodes.exit.label": "Exit",
  "nodes.exit.endWorkflow": "End workflow",

  // ── Node Details (property editors) ────────────────────────
  "nodeDetails.trigger.group": "Trigger Configuration",
  "nodeDetails.trigger.eventLabel": "Event Type",
  "nodeDetails.trigger.eventPlaceholder": "e.g., user.signup, order.placed",
  "nodeDetails.trigger.eventHint": "The event type that will start this workflow",

  "nodeDetails.action.group": "Action Configuration",
  "nodeDetails.action.nameLabel": "Action Name",
  "nodeDetails.action.namePlaceholder": "e.g., sendEmail, createTask",
  "nodeDetails.action.nameHint": "The action to perform when this node is reached",
  "nodeDetails.action.paramsLabel": "Parameters",
  "nodeDetails.action.paramsHint": "JSON object with action parameters",

  "nodeDetails.condition.group": "Condition Configuration",
  "nodeDetails.condition.conditionsLabel": "Conditions",
  "nodeDetails.condition.conditionsHint":
    "JSON rules engine format. Use 'all' or 'any' arrays with conditions like: { fact: 'amount', operator: 'greaterThan', value: 100 }",

  "nodeDetails.wait.group": "Wait Configuration",
  "nodeDetails.wait.durationLabel": "Duration",
  "nodeDetails.wait.durationHint": "How long to pause before continuing to the next node",

  "nodeDetails.triggerOrTimeout.group": "Trigger or Timeout Configuration",
  "nodeDetails.triggerOrTimeout.eventLabel": "Event Type",
  "nodeDetails.triggerOrTimeout.eventPlaceholder": "e.g., payment.received",
  "nodeDetails.triggerOrTimeout.eventHint": "The event type to wait for",
  "nodeDetails.triggerOrTimeout.durationLabel": "Timeout Duration",
  "nodeDetails.triggerOrTimeout.durationHint": "Max time to wait before timing out",

  "nodeDetails.exit.message": "This is where the workflow ends.",

  // Cross-subject match (event subscription) — shared by Trigger and
  // TriggerOrTimeout detail panels.
  "nodeDetails.match.toggleLabel": "Event from different subject",
  "nodeDetails.match.subjectIdLabel": "Match subject id",
  "nodeDetails.match.subjectIdPlaceholder":
    "e.g., product:{{trigger.payload.products[0].product_id}}",
  "nodeDetails.match.subjectIdHint":
    "Full typed subject id of the source event to wait for. {{path}} templates resolve from the trigger event when the workflow reaches this node.",
  "nodeDetails.match.wildcardHint":
    "Empty = match this event from ANY subject. Every matching event is delivered to each waiting workflow — use with care on frequent events.",
  "nodeDetails.match.startNodeWarning":
    "A start trigger cannot listen for events from another subject — this setting is ignored until the node has an incoming connection. Turn it off or connect the node mid-flow.",

  // ── Default node type definitions (labels & descriptions) ──
  "nodeTypes.trigger.label": "Trigger",
  "nodeTypes.trigger.description": "Starts the workflow when a specific event occurs",
  "nodeTypes.action.label": "Action",
  "nodeTypes.action.description": "Performs an action and continues to the next node",
  "nodeTypes.condition.label": "Condition",
  "nodeTypes.condition.description": "Branches the workflow based on conditions",
  "nodeTypes.wait.label": "Wait",
  "nodeTypes.wait.description": "Pauses the workflow for a specified duration",
  "nodeTypes.triggerOrTimeout.label": "Trigger or Timeout",
  "nodeTypes.triggerOrTimeout.description": "Waits for an event or times out after a duration",
  "nodeTypes.exit.label": "Exit",
  "nodeTypes.exit.description": "Ends the workflow",

  // ── Primitives / fields ────────────────────────────────────
  "fields.json.invalidJson": "Invalid JSON",
  "fields.duration.days": "d",
  "fields.duration.hours": "h",
  "fields.duration.minutes": "m",

  // ── Condition Builder ────────────────────────────────────
  "conditionBuilder.dialogTitle": "Condition Builder",
  "conditionBuilder.topLevelLabel": "Match ANY of the following groups:",
  "conditionBuilder.matchLabel": "Match",
  "conditionBuilder.addGroup": "Add group",
  "conditionBuilder.addCondition": "Add condition",
  "conditionBuilder.removeGroup": "Remove",
  "conditionBuilder.removeCondition": "Remove condition",
  "conditionBuilder.selectProperty": "Select property...",
  "conditionBuilder.selectOperator": "Select operator...",
  "conditionBuilder.factPlaceholder": "fact name",
  "conditionBuilder.valuePlaceholder": "value",
  "conditionBuilder.emptyGroup": "No conditions yet. Add one below.",
  "conditionBuilder.noConditions": "No conditions configured",
  "conditionBuilder.ruleCountSingular": "1 condition",
  "conditionBuilder.ruleCount": "{{count}} conditions",
  "conditionBuilder.editButton": "Edit",
  "conditionBuilder.apply": "Apply",
  "conditionBuilder.cancel": "Cancel",

  // ── Guided mode ────────────────────────────────────────────
  "guided.addNode": "Add node",
  "guided.chooseTrigger": "Choose a trigger",
  "guided.insertNode": "Insert node here",
  "guided.chooser.title": "Add node",
  "guided.chooser.triggerTitle": "Choose a trigger",
  "guided.chooser.empty": "No node types available",
  "guided.chooser.cancel": "Cancel",
};
