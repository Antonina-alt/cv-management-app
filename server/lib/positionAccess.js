export const ACCESS_OPERATORS_BY_TYPE = {
    STRING: ["EQUALS", "NOT_EQUALS"],
    TEXT: ["EQUALS", "NOT_EQUALS"],
    NUMBER: ["EQUALS", "NOT_EQUALS", "GREATER_THAN", "GREATER_THAN_OR_EQUALS", "LESS_THAN", "LESS_THAN_OR_EQUALS"],
    DATE: ["EQUALS", "NOT_EQUALS", "GREATER_THAN", "GREATER_THAN_OR_EQUALS", "LESS_THAN", "LESS_THAN_OR_EQUALS"],
    BOOLEAN: ["IS_TRUE", "IS_FALSE"],
    SELECT: ["EQUALS", "NOT_EQUALS"],
};

const EMPTY_RULE_VALUE = {
    stringValue: null,
    numberValue: null,
    dateValue: null,
    optionId: null,
};

const validateRuleString = (body) => (body.stringValue ? { stringValue: String(body.stringValue) } : { error: "stringValue is required" });

const validateRuleNumber = (body) => {
    if (body.numberValue === undefined || body.numberValue === null || body.numberValue === "") return { error: "numberValue is required" };
    const numberValue = Number(body.numberValue);
    return Number.isNaN(numberValue) ? { error: "numberValue must be a number" } : { numberValue };
};

const validateRuleDate = (body) => {
    if (!body.dateValue) return { error: "dateValue is required" };
    const dateValue = new Date(body.dateValue);
    return Number.isNaN(dateValue.getTime()) ? { error: "dateValue must be a valid date" } : { dateValue };
};

const validateRuleSelect = (attribute, body) => {
    const option = attribute.options?.find((o) => o.id === body.optionId);
    return option ? { optionId: body.optionId } : { error: "optionId must reference one of the attribute's options" };
};

const RULE_VALUE_VALIDATORS = {
    STRING: (attribute, body) => validateRuleString(body),
    TEXT: (attribute, body) => validateRuleString(body),
    NUMBER: (attribute, body) => validateRuleNumber(body),
    DATE: (attribute, body) => validateRuleDate(body),
    SELECT: (attribute, body) => validateRuleSelect(attribute, body),
    BOOLEAN: () => ({}),
};

export const buildAccessRuleData = (attribute, operator, body) => {
    const allowedOperators = ACCESS_OPERATORS_BY_TYPE[attribute.type];
    if (!allowedOperators) return { error: `access rules are not supported for ${attribute.type} attributes` };
    if (!allowedOperators.includes(operator)) return { error: `operator ${operator} is not valid for ${attribute.type} attributes` };

    const validator = RULE_VALUE_VALIDATORS[attribute.type];
    if (!validator) return { error: "unsupported attribute type" };

    const { error, ...fields } = validator(attribute, body);
    return error ? { error } : { data: { ...EMPTY_RULE_VALUE, ...fields } };
};

const ACTUAL_EXPECTED_BY_TYPE = {
    SELECT: (value, rule) => [value.selectedOptionId ?? null, rule.optionId ?? null],
    NUMBER: (value, rule) => [
        value.numberValue == null ? null : Number(value.numberValue),
        rule.numberValue == null ? null : Number(rule.numberValue),
    ],
    DATE: (value, rule) => [
        value.dateValue ? new Date(value.dateValue).getTime() : null,
        rule.dateValue ? new Date(rule.dateValue).getTime() : null,
    ],
};

const defaultActualExpected = (value, rule) => [value.stringValue ?? null, rule.stringValue ?? null];

const resolveComparisonValues = (rule, candidateValue) => {
    const resolver = ACTUAL_EXPECTED_BY_TYPE[rule.attribute.type] ?? defaultActualExpected;
    return resolver(candidateValue, rule);
};

const COMPARATORS = {
    EQUALS: (a, b) => a === b,
    NOT_EQUALS: (a, b) => a !== b,
    GREATER_THAN: (a, b) => a > b,
    GREATER_THAN_OR_EQUALS: (a, b) => a >= b,
    LESS_THAN: (a, b) => a < b,
    LESS_THAN_OR_EQUALS: (a, b) => a <= b,
};

export const evaluateAccessRule = (rule, candidateValue) => {
    if (rule.operator === "IS_TRUE") return candidateValue?.booleanValue === true;
    if (rule.operator === "IS_FALSE") return candidateValue?.booleanValue === false;
    if (!candidateValue) return false;

    const [actual, expected] = resolveComparisonValues(rule, candidateValue);
    if (actual === null || expected === null) return false;

    const compare = COMPARATORS[rule.operator];
    return compare ? compare(actual, expected) : false;
};

export const candidateHasPositionAccess = (position, valuesByAttributeId) => {
    if (position.isPublic) return true;
    if (!position.accessRules?.length) return false;
    return position.accessRules.every((rule) => evaluateAccessRule(rule, valuesByAttributeId.get(rule.attributeId)));
};
