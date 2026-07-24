const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const createDateError = (code, field, message) => ({code, field, message});

const parseProjectDate = (value, field) => {
    if (value === undefined) {
        return {value: undefined};
    }
    if (value === null || value === "") {
        return {value: null};
    }
    if (
        typeof value !== "string"
        || !DATE_PATTERN.test(value)
    ) {
        return {
            error: createDateError(
                "PROJECT_DATE_FORMAT_INVALID",
                field,
                `${field} must use YYYY-MM-DD format`,
            ),
        };
    }

    const date = new Date(`${value}T00:00:00.000Z`);
    const normalizedDate = date.toISOString().slice(0, 10);

    if (
        Number.isNaN(date.getTime())
        || normalizedDate !== value
    ) {
        return {
            error: createDateError(
                "PROJECT_DATE_INVALID",
                field,
                `${field} must be a valid date`,
            ),
        };
    }

    return {value: date};
};

const buildDateData = (startDate, endDate) => {
    const data = {};

    if (startDate !== undefined) {
        data.startDate = startDate;
    }

    if (endDate !== undefined) {
        data.endDate = endDate;
    }

    return data;
};

export const validateProjectDates = (
    body,
    current = {},
) => {
    const start = parseProjectDate(
        body.startDate,
        "startDate",
    );

    if (start.error) {
        return {error: start.error};
    }

    const end = parseProjectDate(
        body.endDate,
        "endDate",
    );

    if (end.error) {
        return {error: end.error};
    }

    const effectiveStart = start.value === undefined ? current.startDate : start.value;

    const effectiveEnd = end.value === undefined ? current.endDate : end.value;

    if (effectiveStart && effectiveEnd && effectiveEnd < effectiveStart) {
        return {
            error: createDateError(
                "PROJECT_DATE_RANGE_INVALID",
                "endDate",
                "endDate must be on or after startDate",
            ),
        };
    }

    return {
        data: buildDateData(
            start.value,
            end.value,
        ),
    };
};