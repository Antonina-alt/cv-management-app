import { describe, expect, it } from "vitest";
import { buildValueData } from "../lib/attributeValues.js";
import {ERROR_CODES} from "../lib/errorCodes.js";

describe("buildValueData", () => {
    it("keeps an omitted boolean value empty", () => {
        const result = buildValueData({ type: "BOOLEAN" }, {});
        expect(result.data.booleanValue).toBeNull();
    });

    it("keeps false as an explicitly filled boolean value", () => {
        const result = buildValueData({ type: "BOOLEAN" }, { booleanValue: false });
        expect(result.data.booleanValue).toBe(false);
    });

    it("rejects an inverted date range", () => {
        const result = buildValueData({ type: "DATE_RANGE" }, {
            dateFrom: "2026-05-02",
            dateTo: "2026-05-01",
        });
        expect(result.error).toEqual({
            code: ERROR_CODES.ATTRIBUTE_VALUE_DATE_RANGE_INVALID,
            field: "dateTo",
        });
    });
});
