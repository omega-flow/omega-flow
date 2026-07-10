import { resolveTemplate } from "../../src/nodes/templateResolver";

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
