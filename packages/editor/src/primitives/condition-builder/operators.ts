import type { OperatorOption } from "./types";

/** Default operators matching json-rules-engine built-in operators */
export const defaultOperators: OperatorOption[] = [
  { value: "equal", label: "equals" },
  { value: "notEqual", label: "does not equal" },
  { value: "greaterThan", label: "greater than" },
  { value: "greaterThanInclusive", label: "greater than or equal" },
  { value: "lessThan", label: "less than" },
  { value: "lessThanInclusive", label: "less than or equal" },
  { value: "in", label: "is in" },
  { value: "notIn", label: "is not in" },
  { value: "contains", label: "contains" },
  { value: "doesNotContain", label: "does not contain" },
];
