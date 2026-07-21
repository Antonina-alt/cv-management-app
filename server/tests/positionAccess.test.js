import { describe, it, expect } from "vitest";
import { evaluateAccessRule, candidateHasPositionAccess } from "../lib/positionAccess.js";

const numberAttr = { type: "NUMBER" };
const dateAttr = { type: "DATE" };
const stringAttr = { type: "STRING" };
const selectAttr = { type: "SELECT" };
const booleanAttr = { type: "BOOLEAN" };

describe("evaluateAccessRule", () => {
    it("EQUALS / NOT_EQUALS on NUMBER", () => {
        const value = { numberValue: 7.5 };
        expect(evaluateAccessRule({ operator: "EQUALS", numberValue: 7.5, attribute: numberAttr }, value)).toBe(true);
        expect(evaluateAccessRule({ operator: "EQUALS", numberValue: 8, attribute: numberAttr }, value)).toBe(false);
        expect(evaluateAccessRule({ operator: "NOT_EQUALS", numberValue: 8, attribute: numberAttr }, value)).toBe(true);
    });

    it("GREATER_THAN / GREATER_THAN_OR_EQUALS / LESS_THAN / LESS_THAN_OR_EQUALS on NUMBER", () => {
        const value = { numberValue: 7.5 };
        expect(evaluateAccessRule({ operator: "GREATER_THAN", numberValue: 7, attribute: numberAttr }, value)).toBe(true);
        expect(evaluateAccessRule({ operator: "GREATER_THAN", numberValue: 7.5, attribute: numberAttr }, value)).toBe(false);
        expect(evaluateAccessRule({ operator: "GREATER_THAN_OR_EQUALS", numberValue: 7.5, attribute: numberAttr }, value)).toBe(true);
        expect(evaluateAccessRule({ operator: "LESS_THAN", numberValue: 8, attribute: numberAttr }, value)).toBe(true);
        expect(evaluateAccessRule({ operator: "LESS_THAN_OR_EQUALS", numberValue: 7.5, attribute: numberAttr }, value)).toBe(true);
    });

    it("comparisons on DATE", () => {
        const value = { dateValue: new Date("2024-06-01") };
        expect(evaluateAccessRule({ operator: "GREATER_THAN", dateValue: new Date("2024-01-01"), attribute: dateAttr }, value)).toBe(true);
        expect(evaluateAccessRule({ operator: "LESS_THAN", dateValue: new Date("2024-01-01"), attribute: dateAttr }, value)).toBe(false);
        expect(evaluateAccessRule({ operator: "EQUALS", dateValue: new Date("2024-06-01"), attribute: dateAttr }, value)).toBe(true);
    });

    it("EQUALS / NOT_EQUALS on STRING", () => {
        const value = { stringValue: "Remote" };
        expect(evaluateAccessRule({ operator: "EQUALS", stringValue: "Remote", attribute: stringAttr }, value)).toBe(true);
        expect(evaluateAccessRule({ operator: "NOT_EQUALS", stringValue: "Onsite", attribute: stringAttr }, value)).toBe(true);
    });

    it("EQUALS / NOT_EQUALS on SELECT compares option ids", () => {
        const value = { selectedOptionId: "opt-1" };
        expect(evaluateAccessRule({ operator: "EQUALS", optionId: "opt-1", attribute: selectAttr }, value)).toBe(true);
        expect(evaluateAccessRule({ operator: "EQUALS", optionId: "opt-2", attribute: selectAttr }, value)).toBe(false);
        expect(evaluateAccessRule({ operator: "NOT_EQUALS", optionId: "opt-2", attribute: selectAttr }, value)).toBe(true);
    });

    it("IS_TRUE / IS_FALSE on BOOLEAN", () => {
        expect(evaluateAccessRule({ operator: "IS_TRUE", attribute: booleanAttr }, { booleanValue: true })).toBe(true);
        expect(evaluateAccessRule({ operator: "IS_TRUE", attribute: booleanAttr }, { booleanValue: false })).toBe(false);
        expect(evaluateAccessRule({ operator: "IS_FALSE", attribute: booleanAttr }, { booleanValue: false })).toBe(true);
        expect(evaluateAccessRule({ operator: "IS_TRUE", attribute: booleanAttr }, undefined)).toBe(false);
    });

    it("fails when the candidate never set a value", () => {
        expect(evaluateAccessRule({ operator: "EQUALS", numberValue: 7, attribute: numberAttr }, undefined)).toBe(false);
        expect(evaluateAccessRule({ operator: "EQUALS", numberValue: 7, attribute: numberAttr }, null)).toBe(false);
    });
});

describe("candidateHasPositionAccess", () => {
    it("grants access to public positions regardless of rules", () => {
        const position = { isPublic: true, accessRules: [{ operator: "EQUALS", numberValue: 100, attribute: numberAttr, attributeId: "a1" }] };
        expect(candidateHasPositionAccess(position, new Map())).toBe(true);
    });

    it("denies access to a restricted position with no rules", () => {
        const position = { isPublic: false, accessRules: [] };
        expect(candidateHasPositionAccess(position, new Map())).toBe(false);
    });

    it("requires every rule to pass (AND semantics)", () => {
        const position = {
            isPublic: false,
            accessRules: [
                { attributeId: "a1", operator: "GREATER_THAN", numberValue: 7, attribute: numberAttr },
                { attributeId: "a2", operator: "IS_TRUE", attribute: booleanAttr },
            ],
        };

        const passingValues = new Map([
            ["a1", { numberValue: 8 }],
            ["a2", { booleanValue: true }],
        ]);
        expect(candidateHasPositionAccess(position, passingValues)).toBe(true);

        const failingValues = new Map([
            ["a1", { numberValue: 8 }],
            ["a2", { booleanValue: false }],
        ]);
        expect(candidateHasPositionAccess(position, failingValues)).toBe(false);
    });
});
