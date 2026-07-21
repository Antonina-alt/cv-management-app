// Which AccessOperator values make sense for each AttributeType. IMAGE/DATE_RANGE are
// excluded — there's no sensible single-value comparison for them.
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

// Given an Attribute (for its `type` and, for SELECT, its `options`), an operator, and the
// request body, validate the operator against the type and pick the one relevant value column.
export const buildAccessRuleData = (attribute, operator, body) => {
    const allowedOperators = ACCESS_OPERATORS_BY_TYPE[attribute.type];
    if (!allowedOperators) {
        return { error: `access rules are not supported for ${attribute.type} attributes` };
    }
    if (!allowedOperators.includes(operator)) {
        return { error: `operator ${operator} is not valid for ${attribute.type} attributes` };
    }

    const data = { ...EMPTY_RULE_VALUE };

    switch (attribute.type) {
        case "STRING":
        case "TEXT":
            if (!body.stringValue) {
                return { error: "stringValue is required" };
            }
            data.stringValue = String(body.stringValue);
            break;
        case "NUMBER": {
            if (body.numberValue === undefined || body.numberValue === null || body.numberValue === "") {
                return { error: "numberValue is required" };
            }
            const numberValue = Number(body.numberValue);
            if (Number.isNaN(numberValue)) {
                return { error: "numberValue must be a number" };
            }
            data.numberValue = numberValue;
            break;
        }
        case "DATE": {
            if (!body.dateValue) {
                return { error: "dateValue is required" };
            }
            const dateValue = new Date(body.dateValue);
            if (Number.isNaN(dateValue.getTime())) {
                return { error: "dateValue must be a valid date" };
            }
            data.dateValue = dateValue;
            break;
        }
        case "SELECT": {
            const option = attribute.options?.find((o) => o.id === body.optionId);
            if (!option) {
                return { error: "optionId must reference one of the attribute's options" };
            }
            data.optionId = body.optionId;
            break;
        }
        case "BOOLEAN":
            // IS_TRUE/IS_FALSE carry the meaning entirely in the operator; no stored value.
            break;
        default:
            return { error: "unsupported attribute type" };
    }

    return { data };
};

// Pure comparison of one PositionAccessRule (with `attribute` included, for its `.type`)
// against a candidate's CandidateAttributeValue for that same attribute (or null/undefined
// if the candidate never set one).
export const evaluateAccessRule = (rule, candidateValue) => {
    if (rule.operator === "IS_TRUE") return candidateValue?.booleanValue === true;
    if (rule.operator === "IS_FALSE") return candidateValue?.booleanValue === false;

    if (!candidateValue) return false;

    const type = rule.attribute.type;
    let actual;
    let expected;

    if (type === "SELECT") {
        actual = candidateValue.selectedOptionId ?? null;
        expected = rule.optionId ?? null;
    } else if (type === "NUMBER") {
        actual = candidateValue.numberValue == null ? null : Number(candidateValue.numberValue);
        expected = rule.numberValue == null ? null : Number(rule.numberValue);
    } else if (type === "DATE") {
        actual = candidateValue.dateValue ? new Date(candidateValue.dateValue).getTime() : null;
        expected = rule.dateValue ? new Date(rule.dateValue).getTime() : null;
    } else {
        actual = candidateValue.stringValue ?? null;
        expected = rule.stringValue ?? null;
    }

    if (actual === null || expected === null) return false;

    switch (rule.operator) {
        case "EQUALS":
            return actual === expected;
        case "NOT_EQUALS":
            return actual !== expected;
        case "GREATER_THAN":
            return actual > expected;
        case "GREATER_THAN_OR_EQUALS":
            return actual >= expected;
        case "LESS_THAN":
            return actual < expected;
        case "LESS_THAN_OR_EQUALS":
            return actual <= expected;
        default:
            return false;
    }
};

// A candidate has access to a position if it's public, or if every access rule passes
// (AND semantics) against their attribute values, keyed by attributeId.
export const candidateHasPositionAccess = (position, valuesByAttributeId) => {
    if (position.isPublic) return true;
    if (!position.accessRules?.length) return false;
    return position.accessRules.every((rule) => evaluateAccessRule(rule, valuesByAttributeId.get(rule.attributeId)));
};
