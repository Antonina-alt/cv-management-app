const ACCESS_OPERATORS_BY_TYPE = {
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

const requiredString = (value, field) => value
    ? { [field]: String(value) }
    : { error: `${field} is required` };

const validateRuleString = (body) => requiredString(body.stringValue, "stringValue");

const validateRuleNumber = (body) => {
    if (body.numberValue == null || body.numberValue === "") return { error: "numberValue is required" };
    const numberValue = Number(body.numberValue);
    return Number.isNaN(numberValue) ? { error: "numberValue must be a number" } : { numberValue };
};

const validateRuleDate = (body) => {
    if (!body.dateValue) return { error: "dateValue is required" };
    const dateValue = new Date(body.dateValue);
    return Number.isNaN(dateValue.getTime()) ? { error: "dateValue must be a valid date" } : { dateValue };
};

const validateRuleSelect = (attribute, body) => {
    const exists = attribute.options?.some(({ id }) => id === body.optionId);
    return exists ? { optionId: body.optionId } : { error: "optionId must reference one of the attribute's options" };
};

const RULE_VALIDATORS = {
    STRING: (attribute, body) => validateRuleString(body),
    TEXT: (attribute, body) => validateRuleString(body),
    NUMBER: (attribute, body) => validateRuleNumber(body),
    DATE: (attribute, body) => validateRuleDate(body),
    SELECT: validateRuleSelect,
    BOOLEAN: () => ({}),
};

const validateOperator = (type, operator) => {
    const operators = ACCESS_OPERATORS_BY_TYPE[type];
    if (!operators) return `access rules are not supported for ${type} attributes`;
    return operators.includes(operator) ? null : `operator ${operator} is not valid for ${type} attributes`;
};

export const buildAccessRuleData = (attribute, operator, body) => {
    const operatorError = validateOperator(attribute.type, operator);
    if (operatorError) return { error: operatorError };
    const validator = RULE_VALIDATORS[attribute.type];
    if (!validator) return { error: "unsupported attribute type" };
    const { error, ...fields } = validator(attribute, body);
    return error ? { error } : { data: { ...EMPTY_RULE_VALUE, ...fields } };
};

const toNumber = (value) => value == null ? null : Number(value);
const toTime = (value) => value ? new Date(value).getTime() : null;

const VALUE_RESOLVERS = {
    SELECT: (value, rule) => [value.selectedOptionId ?? null, rule.optionId ?? null],
    NUMBER: (value, rule) => [toNumber(value.numberValue), toNumber(rule.numberValue)],
    DATE: (value, rule) => [toTime(value.dateValue), toTime(rule.dateValue)],
};

const resolveValues = (rule, value) => {
    const resolver = VALUE_RESOLVERS[rule.attribute.type];
    return resolver ? resolver(value, rule) : [value.stringValue ?? null, rule.stringValue ?? null];
};

const COMPARATORS = {
    EQUALS: (actual, expected) => actual === expected,
    NOT_EQUALS: (actual, expected) => actual !== expected,
    GREATER_THAN: (actual, expected) => actual > expected,
    GREATER_THAN_OR_EQUALS: (actual, expected) => actual >= expected,
    LESS_THAN: (actual, expected) => actual < expected,
    LESS_THAN_OR_EQUALS: (actual, expected) => actual <= expected,
};

const evaluateBooleanRule = (operator, value) => {
    if (operator === "IS_TRUE") return value?.booleanValue === true;
    if (operator === "IS_FALSE") return value?.booleanValue === false;
    return null;
};

export const evaluateAccessRule = (rule, candidateValue) => {
    const booleanResult = evaluateBooleanRule(rule.operator, candidateValue);
    if (booleanResult !== null) return booleanResult;
    if (!candidateValue) return false;
    const [actual, expected] = resolveValues(rule, candidateValue);
    if (actual === null || expected === null) return false;
    return COMPARATORS[rule.operator]?.(actual, expected) ?? false;
};

export const candidateHasPositionAccess = (position, values) => {
    if (position.isPublic) return true;
    if (!position.accessRules?.length) return false;
    return position.accessRules.every((rule) => evaluateAccessRule(rule, values.get(rule.attributeId)));
};
