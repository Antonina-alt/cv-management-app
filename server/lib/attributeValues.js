import { ERROR_CODES } from "./errorCodes.js";

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

const optionalString = (value, field) => value == null ? {} : { [field]: String(value) };
const validationError = (code, field) => ({ error: { code, field } });
const validateString = (body) => optionalString(body.stringValue, "stringValue");
const validateImage = (body) => optionalString(body.imageUrl, "imageUrl");

const validateBoolean = (body) => {
    if (body.booleanValue == null || body.booleanValue === "") return {};
    if (typeof body.booleanValue !== "boolean") return validationError(ERROR_CODES.ATTRIBUTE_VALUE_BOOLEAN_INVALID, "booleanValue");
    return { booleanValue: body.booleanValue };
};

const validateNumber = (body) => {
    if (body.numberValue == null || body.numberValue === "") return {};
    const numberValue = Number(body.numberValue);
    return Number.isNaN(numberValue) ? validationError(ERROR_CODES.ATTRIBUTE_VALUE_NUMBER_INVALID, "numberValue") : { numberValue };
};

const parseDate = (value, field) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? validationError(ERROR_CODES.ATTRIBUTE_VALUE_DATE_INVALID, field) : { [field]: date };
};

const validateDate = (body) => body.dateValue ? parseDate(body.dateValue, "dateValue") : {};

const validateDateRange = (body) => {
    const from = body.dateFrom ? parseDate(body.dateFrom, "dateFrom") : {};
    if (from.error) return from;
    const to = body.dateTo ? parseDate(body.dateTo, "dateTo") : {};
    if (to.error) return to;
    if (from.dateFrom && to.dateTo && to.dateTo < from.dateFrom) return validationError(ERROR_CODES.ATTRIBUTE_VALUE_DATE_RANGE_INVALID, "dateTo");
    return { ...from, ...to };
};

const validateSelect = (attribute, body) => {
    if (!body.selectedOptionId) return {};
    const exists = attribute.options?.some(({ id }) => id === body.selectedOptionId);
    return exists ? { selectedOptionId: body.selectedOptionId } : validationError(ERROR_CODES.ATTRIBUTE_VALUE_OPTION_INVALID, "selectedOptionId");
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
    if (!validator) return validationError(ERROR_CODES.ATTRIBUTE_TYPE_UNSUPPORTED, "type");
    const { error, ...fields } = validator(attribute, body);
    return error ? { error } : { data: { ...EMPTY_VALUE, ...fields } };
};
