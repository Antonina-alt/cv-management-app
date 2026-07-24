import { describe, expect, it } from "vitest";
import { validateProjectDates } from "../lib/projectDates.js";

describe("validateProjectDates", () => {
    it("rejects dates outside the calendar", () => {
        const result = validateProjectDates({ startDate: "2026-02-31" });
        expect(result.error.code).toBe("PROJECT_DATE_INVALID");
        expect(result.error.field).toBe("startDate");
    });

    it("rejects an end date before the start date", () => {
        const result = validateProjectDates({
            startDate: "2026-02-02",
            endDate: "2026-02-01",
        });
        expect(result.error.code).toBe("PROJECT_DATE_RANGE_INVALID");
    });

    it("uses current values when a patch omits one date", () => {
        const result = validateProjectDates(
            { endDate: "2026-01-05" },
            { startDate: new Date("2026-01-10") },
        );
        expect(result.error.code).toBe("PROJECT_DATE_RANGE_INVALID");
    });
});
