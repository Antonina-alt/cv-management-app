import { describe, it, expect } from "vitest";
import {
    isValueEmpty,
    buildResumeAttributes,
    buildResumeProjects,
    isResumeComplete,
    filterVisibleResumesByCandidateValues,
} from "../lib/resumeContent.js";

describe("isValueEmpty", () => {
    it("STRING/TEXT are empty without a stringValue", () => {
        expect(isValueEmpty("STRING", null)).toBe(true);
        expect(isValueEmpty("STRING", { stringValue: "" })).toBe(true);
        expect(isValueEmpty("STRING", { stringValue: "Hi" })).toBe(false);
        expect(isValueEmpty("TEXT", { stringValue: "Hi" })).toBe(false);
    });

    it("NUMBER is empty only when null/undefined, not when 0", () => {
        expect(isValueEmpty("NUMBER", { numberValue: null })).toBe(true);
        expect(isValueEmpty("NUMBER", { numberValue: 0 })).toBe(false);
        expect(isValueEmpty("NUMBER", { numberValue: 7.5 })).toBe(false);
    });

    it("DATE / DATE_RANGE / IMAGE / SELECT", () => {
        expect(isValueEmpty("DATE", { dateValue: null })).toBe(true);
        expect(isValueEmpty("DATE", { dateValue: new Date() })).toBe(false);
        expect(isValueEmpty("DATE_RANGE", { dateFrom: null, dateTo: null })).toBe(true);
        expect(isValueEmpty("DATE_RANGE", { dateFrom: new Date(), dateTo: null })).toBe(false);
        expect(isValueEmpty("IMAGE", { imageUrl: null })).toBe(true);
        expect(isValueEmpty("IMAGE", { imageUrl: "http://x/y.png" })).toBe(false);
        expect(isValueEmpty("SELECT", { selectedOptionId: null })).toBe(true);
        expect(isValueEmpty("SELECT", { selectedOptionId: "opt-1" })).toBe(false);
    });

    it("BOOLEAN counts explicit true/false as filled, only null/missing as empty", () => {
        expect(isValueEmpty("BOOLEAN", null)).toBe(true);
        expect(isValueEmpty("BOOLEAN", { booleanValue: null })).toBe(true);
        expect(isValueEmpty("BOOLEAN", { booleanValue: false })).toBe(false);
        expect(isValueEmpty("BOOLEAN", { booleanValue: true })).toBe(false);
    });
});

describe("buildResumeAttributes", () => {
    const stringAttr = { id: "a1", type: "STRING", systemKey: null };
    const systemAttr = { id: "a2", type: "STRING", systemKey: "FIRST_NAME" };
    const numberAttr = { id: "a3", type: "NUMBER", systemKey: null };

    const position = {
        attributes: [
            { attributeId: "a1", attribute: stringAttr },
            { attributeId: "a2", attribute: systemAttr },
            { attributeId: "a3", attribute: numberAttr },
        ],
    };

    it("skips system attributes and merges values, flagging emptiness", () => {
        const valuesByAttributeId = new Map([
            ["a1", { id: "v1", version: 1, stringValue: "Hello" }],
        ]);

        const result = buildResumeAttributes(position, valuesByAttributeId);

        expect(result.map((a) => a.attributeId)).toEqual(["a1", "a3"]);
        expect(result[0].isEmpty).toBe(false);
        expect(result[0].valueId).toBe("v1");
        expect(result[1].isEmpty).toBe(true);
        expect(result[1].valueId).toBeNull();
    });
});

describe("buildResumeProjects", () => {
    const projectWithTag = (id, tagIds) => ({ id, tags: tagIds.map((tagId) => ({ tagId })) });

    it("includes all projects when there is no tag filter, capped at maxProjects", () => {
        const position = { projectTagFilters: [], maxProjects: 2 };
        const projects = [projectWithTag("p1", []), projectWithTag("p2", []), projectWithTag("p3", [])];
        expect(buildResumeProjects(position, projects).map((p) => p.id)).toEqual(["p1", "p2"]);
    });

    it("filters by tag when tag filters are set", () => {
        const position = { projectTagFilters: [{ tagId: "t1" }], maxProjects: 5 };
        const projects = [projectWithTag("p1", ["t1"]), projectWithTag("p2", ["t2"]), projectWithTag("p3", ["t1", "t2"])];
        expect(buildResumeProjects(position, projects).map((p) => p.id)).toEqual(["p1", "p3"]);
    });
});

describe("isResumeComplete", () => {
    it("is true only when every attribute is filled", () => {
        expect(isResumeComplete([{ isEmpty: false }, { isEmpty: false }])).toBe(true);
        expect(isResumeComplete([{ isEmpty: false }, { isEmpty: true }])).toBe(false);
        expect(isResumeComplete([])).toBe(true);
    });
});

describe("filterVisibleResumesByCandidateValues", () => {
    it("hides resumes for candidates who no longer satisfy the position's access rules", () => {
        const numberAttr = { type: "NUMBER" };
        const position = {
            isPublic: false,
            accessRules: [{ attributeId: "a1", operator: "GREATER_THAN", numberValue: 7, attribute: numberAttr }],
        };
        const resumes = [{ id: "r1", candidateId: "c1" }, { id: "r2", candidateId: "c2" }];
        const valuesByCandidateId = new Map([
            ["c1", new Map([["a1", { numberValue: 8 }]])],
            ["c2", new Map([["a1", { numberValue: 3 }]])],
        ]);

        expect(filterVisibleResumesByCandidateValues(position, resumes, valuesByCandidateId).map((r) => r.id)).toEqual(["r1"]);
    });

    it("keeps everything visible for public positions", () => {
        const position = { isPublic: true, accessRules: [] };
        const resumes = [{ id: "r1", candidateId: "c1" }];
        expect(filterVisibleResumesByCandidateValues(position, resumes, new Map())).toHaveLength(1);
    });
});
