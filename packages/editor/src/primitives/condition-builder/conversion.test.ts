import { fromEngineFormat, toEngineFormat } from "./conversion";
import type { ConditionBuilderValue } from "./types";

describe("fromEngineFormat", () => {
  it("returns default empty group for null/undefined", () => {
    expect(fromEngineFormat(null as unknown as Record<string, unknown>)).toEqual({
      groups: [{ operator: "all", conditions: [] }],
    });
    expect(fromEngineFormat(undefined as unknown as Record<string, unknown>)).toEqual({
      groups: [{ operator: "all", conditions: [] }],
    });
  });

  it("returns default empty group for empty object", () => {
    expect(fromEngineFormat({})).toEqual({
      groups: [{ operator: "all", conditions: [] }],
    });
  });

  it("returns default empty group for empty arrays", () => {
    expect(fromEngineFormat({ all: [] })).toEqual({
      groups: [{ operator: "all", conditions: [] }],
    });
    expect(fromEngineFormat({ any: [] })).toEqual({
      groups: [{ operator: "all", conditions: [] }],
    });
  });

  it("parses top-level all with leaf conditions", () => {
    const input = {
      all: [
        { fact: "age", operator: "greaterThan", value: 18 },
        { fact: "plan", operator: "equal", value: "premium" },
      ],
    };
    expect(fromEngineFormat(input)).toEqual({
      groups: [
        {
          operator: "all",
          conditions: [
            { fact: "age", operator: "greaterThan", value: 18 },
            { fact: "plan", operator: "equal", value: "premium" },
          ],
        },
      ],
    });
  });

  it("parses top-level any with nested all groups", () => {
    const input = {
      any: [
        {
          all: [
            { fact: "age", operator: "greaterThan", value: 18 },
            { fact: "plan", operator: "equal", value: "premium" },
          ],
        },
        {
          all: [{ fact: "vip", operator: "equal", value: true }],
        },
      ],
    };
    expect(fromEngineFormat(input)).toEqual({
      groups: [
        {
          operator: "all",
          conditions: [
            { fact: "age", operator: "greaterThan", value: 18 },
            { fact: "plan", operator: "equal", value: "premium" },
          ],
        },
        {
          operator: "all",
          conditions: [{ fact: "vip", operator: "equal", value: true }],
        },
      ],
    });
  });

  it("parses top-level any with mixed all/any groups", () => {
    const input = {
      any: [
        {
          all: [{ fact: "age", operator: "greaterThan", value: 18 }],
        },
        {
          any: [{ fact: "role", operator: "equal", value: "admin" }],
        },
      ],
    };
    expect(fromEngineFormat(input)).toEqual({
      groups: [
        {
          operator: "all",
          conditions: [{ fact: "age", operator: "greaterThan", value: 18 }],
        },
        {
          operator: "any",
          conditions: [{ fact: "role", operator: "equal", value: "admin" }],
        },
      ],
    });
  });

  it("wraps standalone leaf conditions in any into individual groups", () => {
    const input = {
      any: [
        { fact: "status", operator: "equal", value: "active" },
        { fact: "role", operator: "equal", value: "admin" },
      ],
    };
    const result = fromEngineFormat(input);
    expect(result.groups).toHaveLength(2);
    expect(result.groups[0]).toEqual({
      operator: "all",
      conditions: [{ fact: "status", operator: "equal", value: "active" }],
    });
    expect(result.groups[1]).toEqual({
      operator: "all",
      conditions: [{ fact: "role", operator: "equal", value: "admin" }],
    });
  });

  it("filters out non-leaf items from condition arrays", () => {
    const input = {
      all: [
        { fact: "age", operator: "greaterThan", value: 18 },
        "not a condition",
        42,
        null,
        { fact: "name", operator: "equal", value: "test" },
      ],
    };
    expect(fromEngineFormat(input)).toEqual({
      groups: [
        {
          operator: "all",
          conditions: [
            { fact: "age", operator: "greaterThan", value: 18 },
            { fact: "name", operator: "equal", value: "test" },
          ],
        },
      ],
    });
  });

  it("handles conditions with value of 0, false, or empty string", () => {
    const input = {
      all: [
        { fact: "count", operator: "equal", value: 0 },
        { fact: "active", operator: "equal", value: false },
        { fact: "name", operator: "equal", value: "" },
      ],
    };
    const result = fromEngineFormat(input);
    expect(result.groups[0].conditions).toEqual([
      { fact: "count", operator: "equal", value: 0 },
      { fact: "active", operator: "equal", value: false },
      { fact: "name", operator: "equal", value: "" },
    ]);
  });
});

describe("fromEngineFormat — path joining", () => {
  it("joins fact + path into dotted name", () => {
    const input = {
      all: [
        { fact: "user", operator: "equal", value: "microsoft", path: "$.company" },
      ],
    };
    const result = fromEngineFormat(input);
    expect(result.groups[0].conditions).toEqual([
      { fact: "user.company", operator: "equal", value: "microsoft" },
    ]);
  });

  it("joins deeply nested path", () => {
    const input = {
      all: [
        { fact: "account", operator: "greaterThan", value: 100, path: "$.billing.total" },
      ],
    };
    const result = fromEngineFormat(input);
    expect(result.groups[0].conditions).toEqual([
      { fact: "account.billing.total", operator: "greaterThan", value: 100 },
    ]);
  });

  it("handles path without $. prefix", () => {
    const input = {
      all: [
        { fact: "user", operator: "equal", value: 30, path: "age" },
      ],
    };
    const result = fromEngineFormat(input);
    expect(result.groups[0].conditions).toEqual([
      { fact: "user.age", operator: "equal", value: 30 },
    ]);
  });

  it("leaves simple facts without path unchanged", () => {
    const input = {
      all: [
        { fact: "temperature", operator: "greaterThan", value: 100 },
      ],
    };
    const result = fromEngineFormat(input);
    expect(result.groups[0].conditions).toEqual([
      { fact: "temperature", operator: "greaterThan", value: 100 },
    ]);
  });

  it("handles mixed rules with and without path", () => {
    const input = {
      all: [
        { fact: "account-info", operator: "equal", value: "microsoft", path: "$.company" },
        { fact: "status", operator: "equal", value: "active" },
        { fact: "account-info", operator: "contains", value: "2016-12-25", path: "$.ptoDaysTaken" },
      ],
    };
    const result = fromEngineFormat(input);
    expect(result.groups[0].conditions).toEqual([
      { fact: "account-info.company", operator: "equal", value: "microsoft" },
      { fact: "status", operator: "equal", value: "active" },
      { fact: "account-info.ptoDaysTaken", operator: "contains", value: "2016-12-25" },
    ]);
  });
});

describe("toEngineFormat", () => {
  it("returns empty any for no groups", () => {
    expect(toEngineFormat({ groups: [] })).toEqual({ any: [] });
  });

  it("outputs simple facts without path", () => {
    const input: ConditionBuilderValue = {
      groups: [
        {
          operator: "all",
          conditions: [
            { fact: "age", operator: "greaterThan", value: 18 },
            { fact: "plan", operator: "equal", value: "premium" },
          ],
        },
      ],
    };
    expect(toEngineFormat(input)).toEqual({
      all: [
        { fact: "age", operator: "greaterThan", value: 18 },
        { fact: "plan", operator: "equal", value: "premium" },
      ],
    });
  });

  it("splits dotted fact into fact + path", () => {
    const input: ConditionBuilderValue = {
      groups: [
        {
          operator: "all",
          conditions: [
            { fact: "user.age", operator: "greaterThan", value: 18 },
          ],
        },
      ],
    };
    expect(toEngineFormat(input)).toEqual({
      all: [
        { fact: "user", operator: "greaterThan", value: 18, path: "$.age" },
      ],
    });
  });

  it("splits deeply nested dotted fact", () => {
    const input: ConditionBuilderValue = {
      groups: [
        {
          operator: "all",
          conditions: [
            { fact: "account.billing.total", operator: "lessThan", value: 500 },
          ],
        },
      ],
    };
    expect(toEngineFormat(input)).toEqual({
      all: [
        { fact: "account", operator: "lessThan", value: 500, path: "$.billing.total" },
      ],
    });
  });

  it("outputs single any group without wrapping", () => {
    const input: ConditionBuilderValue = {
      groups: [
        {
          operator: "any",
          conditions: [
            { fact: "role", operator: "equal", value: "admin" },
          ],
        },
      ],
    };
    expect(toEngineFormat(input)).toEqual({
      any: [{ fact: "role", operator: "equal", value: "admin" }],
    });
  });

  it("wraps multiple groups in top-level any", () => {
    const input: ConditionBuilderValue = {
      groups: [
        {
          operator: "all",
          conditions: [
            { fact: "age", operator: "greaterThan", value: 18 },
          ],
        },
        {
          operator: "any",
          conditions: [
            { fact: "role", operator: "equal", value: "admin" },
          ],
        },
      ],
    };
    expect(toEngineFormat(input)).toEqual({
      any: [
        {
          all: [{ fact: "age", operator: "greaterThan", value: 18 }],
        },
        {
          any: [{ fact: "role", operator: "equal", value: "admin" }],
        },
      ],
    });
  });

  it("outputs single group with empty conditions", () => {
    const input: ConditionBuilderValue = {
      groups: [{ operator: "all", conditions: [] }],
    };
    expect(toEngineFormat(input)).toEqual({ all: [] });
  });

  it("preserves all value types (number, boolean, string, null)", () => {
    const input: ConditionBuilderValue = {
      groups: [
        {
          operator: "all",
          conditions: [
            { fact: "count", operator: "equal", value: 0 },
            { fact: "active", operator: "equal", value: false },
            { fact: "name", operator: "equal", value: "test" },
            { fact: "ref", operator: "equal", value: null },
          ],
        },
      ],
    };
    const result = toEngineFormat(input);
    expect(result).toEqual({
      all: [
        { fact: "count", operator: "equal", value: 0 },
        { fact: "active", operator: "equal", value: false },
        { fact: "name", operator: "equal", value: "test" },
        { fact: "ref", operator: "equal", value: null },
      ],
    });
  });
});

describe("round-trip: fromEngineFormat -> toEngineFormat", () => {
  it("preserves simple all conditions", () => {
    const original = {
      all: [
        { fact: "age", operator: "greaterThan", value: 18 },
        { fact: "plan", operator: "equal", value: "premium" },
      ],
    };
    const result = toEngineFormat(fromEngineFormat(original));
    expect(result).toEqual(original);
  });

  it("preserves any with nested all groups", () => {
    const original = {
      any: [
        {
          all: [
            { fact: "age", operator: "greaterThan", value: 18 },
            { fact: "plan", operator: "equal", value: "premium" },
          ],
        },
        {
          all: [{ fact: "vip", operator: "equal", value: true }],
        },
      ],
    };
    const result = toEngineFormat(fromEngineFormat(original));
    expect(result).toEqual(original);
  });

  it("preserves any with mixed all/any groups", () => {
    const original = {
      any: [
        {
          all: [{ fact: "age", operator: "greaterThan", value: 18 }],
        },
        {
          any: [{ fact: "role", operator: "equal", value: "admin" }],
        },
      ],
    };
    const result = toEngineFormat(fromEngineFormat(original));
    expect(result).toEqual(original);
  });

  it("preserves conditions with path through round-trip", () => {
    const original = {
      any: [
        {
          all: [
            { fact: "account", operator: "equal", value: "microsoft", path: "$.company" },
            { fact: "account", operator: "in", value: ["active", "paid-leave"], path: "$.status" },
          ],
        },
        {
          all: [
            { fact: "order", operator: "greaterThan", value: 50, path: "$.total.amount" },
          ],
        },
      ],
    };
    const result = toEngineFormat(fromEngineFormat(original));
    expect(result).toEqual(original);
  });

  it("preserves mixed simple and path-based facts through round-trip", () => {
    const original = {
      all: [
        { fact: "temperature", operator: "greaterThan", value: 100 },
        { fact: "sensor", operator: "equal", value: "online", path: "$.status" },
      ],
    };
    const result = toEngineFormat(fromEngineFormat(original));
    expect(result).toEqual(original);
  });
});
