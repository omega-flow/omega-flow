// Components
export {
  WorkflowEditor,
  NodesPanel,
  DetailPanel,
  OptionsPanel,
  ControlPanel,
} from "./components";

// Context
export {
  WorkflowEditorProvider,
  useWorkflowEditorContext,
} from "./context";

// Hooks
export {
  useWorkflowEditor,
  useNodes,
  useEdges,
  useNodeRegistry,
  useDragAndDrop,
  useSelectedNode,
} from "./hooks";

// Node system
export { defaultNodeTypes } from "./nodes";
export {
  // Views
  BaseNodeView,
  TriggerNodeView,
  ActionNodeView,
  ConditionNodeView,
  ExitNodeView,
  WaitNodeView,
  TriggerOrTimeoutNodeView,
  // Details
  TriggerNodeDetail,
  ActionNodeDetail,
  ConditionNodeDetail,
  ExitNodeDetail,
  WaitNodeDetail,
  TriggerOrTimeoutNodeDetail,
} from "./nodes";

// Primitives (for building custom node details)
export {
  Field,
  TextField,
  NumberField,
  SelectField,
  CheckboxField,
  TextAreaField,
  DurationField,
  JsonField,
  FieldGroup,
} from "./primitives";

// Types - Context
export type {
  WorkflowEditorContextValue,
  WorkflowEditorState,
  WorkflowEditorActions,
  WorkflowEditorProps,
  NodesPanelProps,
  DetailPanelProps,
  OptionsPanelProps,
  ControlPanelProps,
  NodeTypeDefinition,
  NodeViewProps,
  NodeDetailProps,
  HandleDefinition,
} from "./context/types";

// Types - Node views
export type { BaseNodeViewProps } from "./nodes/views/BaseNodeView";

// Types - Primitives
export type {
  FieldProps,
  TextFieldProps,
  NumberFieldProps,
  SelectFieldProps,
  SelectOption,
  CheckboxFieldProps,
  TextAreaFieldProps,
  DurationFieldProps,
  JsonFieldProps,
  FieldGroupProps,
} from "./primitives";

// Theming utilities
export { themeVars, cssVar } from "./styles";

// Localization
export {
  useTranslation,
  TranslationProvider,
  createTranslationFunction,
  defaultTranslations,
} from "./i18n";
export type {
  TranslationFunction,
  TranslationDictionary,
  TranslationProviderProps,
} from "./i18n";
