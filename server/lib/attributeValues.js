const EMPTY_VALUE = {
    stringValue: null,
    numberValue: null,
    booleanValue: null,
    dateValue: null,
    dateFrom: null,
    dateTo: null,
    imageUrl: null,
    selectedOptionId: null,
};

const optionalString = (value, field) => value == null
    ? {}
    : { [field]: String(value) };

const validateString = (body) => optionalString(body.stringValue, "stringValue");
const validateImage = (body) => optionalString(body.imageUrl, "imageUrl");

const validateBoolean = (body) => {
    if (body.booleanValue == null || body.booleanValue === "") return {};
    if (typeof body.booleanValue !== "boolean") return { error: "booleanValue must be a boolean" };
    return { booleanValue: body.booleanValue };
};

const validateNumber = (body) => {
    if (body.numberValue == null || body.numberValue === "") return {};
    const numberValue = Number(body.numberValue);
    return Number.isNaN(numberValue) ? { error: "numberValue must be a number" } : { numberValue };
};

const parseDate = (value, field) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? { error: `${field} must be a valid date` } : { [field]: date };
};

const validateDate = (body) => body.dateValue ? parseDate(body.dateValue, "dateValue") : {};

const validateDateRange = (body) => {
    const from = body.dateFrom ? parseDate(body.dateFrom, "dateFrom") : {};
    if (from.error) return from;
    const to = body.dateTo ? parseDate(body.dateTo, "dateTo") : {};
    if (to.error) return to;
    if (from.dateFrom && to.dateTo && to.dateTo < from.dateFrom) return { error: "dateTo must be on or after dateFrom" };
    return { ...from, ...to };
};

const validateSelect = (attribute, body) => {
    if (!body.selectedOptionId) return {};
    const exists = attribute.options?.some(({ id }) => id === body.selectedOptionId);
    return exists ? { selectedOptionId: body.selectedOptionId } : { error: "selectedOptionId must reference one of the attribute's options" };
};

const VALIDATORS = {
    STRING: (attribute, body) => validateString(body),
    TEXT: (attribute, body) => validateString(body),
    IMAGE: (attribute, body) => validateImage(body),
    NUMBER: (attribute, body) => validateNumber(body),
    BOOLEAN: (attribute, body) => validateBoolean(body),
    DATE: (attribute, body) => validateDate(body),
    DATE_RANGE: (attribute, body) => validateDateRange(body),
    SELECT: validateSelect,
};

export const buildValueData = (attribute, body) => {
    const validator = VALIDATORS[attribute.type];
    if (!validator) return { error: "unsupported attribute type" };
    const { error, ...fields } = validator(attribute, body);
    return error ? { error } : { data: { ...EMPTY_VALUE, ...fields } };
};
