import type { Conditions } from "@omega-flow/types";
import { evaluateConditions } from "../../src/nodes/conditionEvaluator";

describe("evaluateConditions", () => {
  describe("empty / edge cases", () => {
    it("returns false for undefined conditions", () => {
      expect(evaluateConditions(undefined, {})).toBe(false);
    });

    it("returns false for empty groups (any of nothing)", () => {
      expect(evaluateConditions({ groups: [] }, {})).toBe(false);
    });

    it("returns true for empty `all` group (every of nothing)", () => {
      const conditions: Conditions = {
        groups: [{ operator: "all", conditions: [] }],
      };
      expect(evaluateConditions(conditions, {})).toBe(true);
    });

    it("returns false for empty `any` group (some of nothing)", () => {
      const conditions: Conditions = {
        groups: [{ operator: "any", conditions: [] }],
      };
      expect(evaluateConditions(conditions, {})).toBe(false);
    });
  });

  describe("operators", () => {
    const facts = {
      age: 30,
      name: "alice",
      tags: ["a", "b", "c"],
      user: { plan: "premium", score: 80 },
    };

    it("equal / notEqual", () => {
      expect(
        evaluateConditions(
          { groups: [{ operator: "all", conditions: [{ fact: "age", operator: "equal", value: 30 }] }] },
          facts
        )
      ).toBe(true);
      expect(
        evaluateConditions(
          { groups: [{ operator: "all", conditions: [{ fact: "age", operator: "notEqual", value: 30 }] }] },
          facts
        )
      ).toBe(false);
    });

    it("greaterThan / greaterThanInclusive / lessThan / lessThanInclusive", () => {
      const gt = (op: string, v: number) =>
        evaluateConditions(
          { groups: [{ operator: "all", conditions: [{ fact: "age", operator: op, value: v }] }] },
          facts
        );
      expect(gt("greaterThan", 29)).toBe(true);
      expect(gt("greaterThan", 30)).toBe(false);
      expect(gt("greaterThanInclusive", 30)).toBe(true);
      expect(gt("lessThan", 31)).toBe(true);
      expect(gt("lessThan", 30)).toBe(false);
      expect(gt("lessThanInclusive", 30)).toBe(true);
    });

    it("in / notIn", () => {
      expect(
        evaluateConditions(
          { groups: [{ operator: "all", conditions: [{ fact: "name", operator: "in", value: ["alice", "bob"] }] }] },
          facts
        )
      ).toBe(true);
      expect(
        evaluateConditions(
          { groups: [{ operator: "all", conditions: [{ fact: "name", operator: "notIn", value: ["bob"] }] }] },
          facts
        )
      ).toBe(true);
    });

    it("contains / doesNotContain — array fact", () => {
      expect(
        evaluateConditions(
          { groups: [{ operator: "all", conditions: [{ fact: "tags", operator: "contains", value: "b" }] }] },
          facts
        )
      ).toBe(true);
      expect(
        evaluateConditions(
          { groups: [{ operator: "all", conditions: [{ fact: "tags", operator: "doesNotContain", value: "z" }] }] },
          facts
        )
      ).toBe(true);
    });

    it("contains / doesNotContain — string fact", () => {
      expect(
        evaluateConditions(
          { groups: [{ operator: "all", conditions: [{ fact: "name", operator: "contains", value: "lic" }] }] },
          facts
        )
      ).toBe(true);
      expect(
        evaluateConditions(
          { groups: [{ operator: "all", conditions: [{ fact: "name", operator: "doesNotContain", value: "x" }] }] },
          facts
        )
      ).toBe(true);
    });

    it("dotted facts traverse nested objects", () => {
      expect(
        evaluateConditions(
          { groups: [{ operator: "all", conditions: [{ fact: "user.plan", operator: "equal", value: "premium" }] }] },
          facts
        )
      ).toBe(true);
      expect(
        evaluateConditions(
          { groups: [{ operator: "all", conditions: [{ fact: "user.score", operator: "greaterThan", value: 50 }] }] },
          facts
        )
      ).toBe(true);
      expect(
        evaluateConditions(
          { groups: [{ operator: "all", conditions: [{ fact: "user.missing", operator: "equal", value: undefined }] }] },
          facts
        )
      ).toBe(true);
    });

    it("unknown operator returns false", () => {
      expect(
        evaluateConditions(
          { groups: [{ operator: "all", conditions: [{ fact: "age", operator: "wat", value: 30 }] }] },
          facts
        )
      ).toBe(false);
    });
  });

  describe("group composition", () => {
    const facts = { a: 1, b: 2, c: 3 };

    it("AND group — all must match", () => {
      const conditions: Conditions = {
        groups: [
          {
            operator: "all",
            conditions: [
              { fact: "a", operator: "equal", value: 1 },
              { fact: "b", operator: "equal", value: 2 },
            ],
          },
        ],
      };
      expect(evaluateConditions(conditions, facts)).toBe(true);
      expect(evaluateConditions(conditions, { ...facts, b: 99 })).toBe(false);
    });

    it("OR group — any may match", () => {
      const conditions: Conditions = {
        groups: [
          {
            operator: "any",
            conditions: [
              { fact: "a", operator: "equal", value: 99 },
              { fact: "b", operator: "equal", value: 2 },
            ],
          },
        ],
      };
      expect(evaluateConditions(conditions, facts)).toBe(true);
      expect(evaluateConditions(conditions, { a: 0, b: 0, c: 0 })).toBe(false);
    });

    it("multiple groups are OR'd together", () => {
      const conditions: Conditions = {
        groups: [
          {
            operator: "all",
            conditions: [
              { fact: "a", operator: "equal", value: 99 },
              { fact: "b", operator: "equal", value: 99 },
            ],
          },
          {
            operator: "all",
            conditions: [{ fact: "c", operator: "equal", value: 3 }],
          },
        ],
      };
      // First group fails, second group passes → overall true
      expect(evaluateConditions(conditions, facts)).toBe(true);
    });
  });
});
