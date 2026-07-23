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

const validateString = (body) => ({ stringValue: body.stringValue != null ? String(body.stringValue) : null });

const validateImage = (body) => ({ imageUrl: body.imageUrl != null ? String(body.imageUrl) : null });

const validateBoolean = (body) => ({ booleanValue: Boolean(body.booleanValue) });

const validateNumber = (body) => {
    if (body.numberValue === undefined || body.numberValue === null || body.numberValue === "") return {};
    const numberValue = Number(body.numberValue);
    return Number.isNaN(numberValue) ? { error: "numberValue must be a number" } : { numberValue };
};

const validateDate = (body) => {
    if (!body.dateValue) return {};
    const dateValue = new Date(body.dateValue);
    return Number.isNaN(dateValue.getTime()) ? { error: "dateValue must be a valid date" } : { dateValue };
};

const validateDateRange = (body) => {
    if (!body.dateFrom && !body.dateTo) return {};
    const dateFrom = body.dateFrom ? new Date(body.dateFrom) : null;
    const dateTo = body.dateTo ? new Date(body.dateTo) : null;
    const invalid = (dateFrom && Number.isNaN(dateFrom.getTime())) || (dateTo && Number.isNaN(dateTo.getTime()));
    return invalid ? { error: "dateFrom/dateTo must be valid dates" } : { dateFrom, dateTo };
};

const validateSelect = (attribute, body) => {
    if (!body.selectedOptionId) return {};
    const option = attribute.options?.find((o) => o.id === body.selectedOptionId);
    return option ? { selectedOptionId: body.selectedOptionId } : { error: "selectedOptionId must reference one of the attribute's options" };
};

const VALIDATORS = {
    STRING: (attribute, body) => validateString(body),
    TEXT: (attribute, body) => validateString(body),
    IMAGE: (attribute, body) => validateImage(body),
    NUMBER: (attribute, body) => validateNumber(body),
    BOOLEAN: (attribute, body) => validateBoolean(body),
    DATE: (attribute, body) => validateDate(body),
    DATE_RANGE: (attribute, body) => validateDateRange(body),
    SELECT: (attribute, body) => validateSelect(attribute, body),
};

export const buildValueData = (attribute, body) => {
    const validator = VALIDATORS[attribute.type];
    if (!validator) return { error: "unsupported attribute type" };

    const { error, ...fields } = validator(attribute, body);
    return error ? { error } : { data: { ...EMPTY_VALUE, ...fields } };
};
