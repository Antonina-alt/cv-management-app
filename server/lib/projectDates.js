const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const dateError = (code, field, message) => ({ code, field, message });

const formatError = (field) => dateError(
    "PROJECT_DATE_FORMAT_INVALID",
    field,
    `${field} must use YYYY-MM-DD format`,
);

const invalidDateError = (field) => dateError(
    "PROJECT_DATE_INVALID",
    field,
    `${field} must be a valid date`,
);

const rangeError = () => dateError(
    "PROJECT_DATE_RANGE_INVALID",
    "endDate",
    "endDate must be on or after startDate",
);

const isValidDateString = (value) => typeof value === "string" && DATE_PATTERN.test(value);

const parseIsoDate = (value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10) === value ? date : null;
};

const parseProjectDate = (value, field) => {
    if (value === undefined) return { value: undefined };
    if (value === null || value === "") return { value: null };
    if (!isValidDateString(value)) return { error: formatError(field) };
    const date = parseIsoDate(value);
    return date ? { value: date } : { error: invalidDateError(field) };
};

const definedDateData = (startDate, endDate) => ({
    ...(startDate !== undefined ? { startDate } : {}),
    ...(endDate !== undefined ? { endDate } : {}),
});

const effectiveDate = (parsed, current) => parsed === undefined ? current : parsed;

export const validateProjectDates = (body, current = {}) => {
    const start = parseProjectDate(body.startDate, "startDate");
    if (start.error) return { error: start.error };
    const end = parseProjectDate(body.endDate, "endDate");
    if (end.error) return { error: end.error };
    const effectiveStart = effectiveDate(start.value, current.startDate);
    const effectiveEnd = effectiveDate(end.value, current.endDate);
    if (effectiveStart && effectiveEnd && effectiveEnd < effectiveStart) return { error: rangeError() };
    return { data: definedDateData(start.value, end.value) };
};
