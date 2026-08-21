import {
  resolveTemplate,
  resolveValue,
  resolveDeep,
} from "../../src/nodes/templateResolver";

describe("resolveTemplate", () => {
  const scope = {
    trigger: {
      payload: {
        products: [{ product_id: 456 }],
        code: "ABC",
        nested: { flag: true },
      },
    },
  };

  it("resolves a full-string placeholder", () => {
    expect(resolveTemplate("{{trigger.payload.code}}", scope)).toBe("ABC");
  });

  it("resolves embedded placeholders with surrounding text", () => {
    expect(
      resolveTemplate(
        "product:{{trigger.payload.products[0].product_id}}",
        scope
      )
    ).toBe("product:456");
  });

  it("resolves multiple placeholders", () => {
    expect(
      resolveTemplate(
        "{{trigger.payload.code}}-{{trigger.payload.products[0].product_id}}",
        scope
      )
    ).toBe("ABC-456");
  });

  it("stringifies booleans and numbers", () => {
    expect(resolveTemplate("{{trigger.payload.nested.flag}}", scope)).toBe(
      "true"
    );
  });

  it("allows whitespace inside the braces", () => {
    expect(resolveTemplate("{{ trigger.payload.code }}", scope)).toBe("ABC");
  });

  it("returns the string unchanged when it has no placeholders", () => {
    expect(resolveTemplate("product:456", scope)).toBe("product:456");
  });

  it("returns undefined for missing paths", () => {
    expect(resolveTemplate("{{trigger.payload.missing}}", scope)).toBeUndefined();
    expect(
      resolveTemplate("prefix-{{trigger.payload.missing.deeper}}", scope)
    ).toBeUndefined();
  });

  it("returns undefined when the value is not a scalar", () => {
    expect(resolveTemplate("{{trigger.payload}}", scope)).toBeUndefined();
    expect(
      resolveTemplate("{{trigger.payload.products}}", scope)
    ).toBeUndefined();
  });

  it("returns undefined for an empty path", () => {
    expect(resolveTemplate("{{}}", scope)).toBe("{{}}");
    expect(resolveTemplate("{{ }}", scope)).toBeUndefined();
  });

  it("resolves out-of-range indices to undefined", () => {
    expect(
      resolveTemplate("{{trigger.payload.products[3].product_id}}", scope)
    ).toBeUndefined();
  });
});

describe("resolveValue", () => {
  const scope = {
    event: { price: 42, active: true, items: [1, 2] },
    state: { fetch: { result: { sku: "X1" } } },
  };

  it("keeps the type of an exact-placeholder string", () => {
    expect(resolveValue("{{event.price}}", scope)).toBe(42);
    expect(resolveValue("{{event.active}}", scope)).toBe(true);
    expect(resolveValue("{{event.items}}", scope)).toEqual([1, 2]);
    expect(resolveValue("{{state.fetch.result}}", scope)).toEqual({
      sku: "X1",
    });
  });

  it("resolves an exact placeholder with whitespace", () => {
    expect(resolveValue("{{ event.price }}", scope)).toBe(42);
  });

  it("returns undefined for a missing exact-placeholder path", () => {
    expect(resolveValue("{{event.missing}}", scope)).toBeUndefined();
  });

  it("stringifies embedded placeholders", () => {
    expect(resolveValue("price:{{event.price}}", scope)).toBe("price:42");
  });

  it("returns undefined when an embedded placeholder is missing", () => {
    expect(resolveValue("price:{{event.missing}}", scope)).toBeUndefined();
  });

  it("passes through non-strings and plain strings", () => {
    expect(resolveValue(5, scope)).toBe(5);
    expect(resolveValue(null, scope)).toBeNull();
    expect(resolveValue("plain", scope)).toBe("plain");
  });
});

describe("resolveDeep", () => {
  const scope = {
    event: { sku: "X1", price: 42 },
    trigger: { user_id: 7 },
  };

  it("resolves strings nested in objects and arrays", () => {
    expect(
      resolveDeep(
        {
          sku: "{{event.sku}}",
          price: "{{event.price}}",
          label: "sku-{{event.sku}}",
          tags: ["{{trigger.user_id}}", "static"],
          nested: { deep: "{{event.price}}" },
          untouched: 9,
        },
        scope
      )
    ).toEqual({
      sku: "X1",
      price: 42,
      label: "sku-X1",
      tags: [7, "static"],
      nested: { deep: 42 },
      untouched: 9,
    });
  });

  it("passes through scalars", () => {
    expect(resolveDeep(5, scope)).toBe(5);
    expect(resolveDeep(null, scope)).toBeNull();
  });
});
