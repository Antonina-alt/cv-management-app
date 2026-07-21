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

// Given an Attribute (for its `type` and, for SELECT, its `options`) and a request body,
// pick the one typed column that's relevant and null out the rest.
export const buildValueData = (attribute, body) => {
    const data = { ...EMPTY_VALUE };

    switch (attribute.type) {
        case "STRING":
        case "TEXT":
            data.stringValue = body.stringValue != null ? String(body.stringValue) : null;
            break;
        case "IMAGE":
            data.imageUrl = body.imageUrl != null ? String(body.imageUrl) : null;
            break;
        case "NUMBER":
            if (body.numberValue !== undefined && body.numberValue !== null && body.numberValue !== "") {
                const numberValue = Number(body.numberValue);
                if (Number.isNaN(numberValue)) {
                    return { error: "numberValue must be a number" };
                }
                data.numberValue = numberValue;
            }
            break;
        case "BOOLEAN":
            data.booleanValue = Boolean(body.booleanValue);
            break;
        case "DATE":
            if (body.dateValue) {
                const dateValue = new Date(body.dateValue);
                if (Number.isNaN(dateValue.getTime())) {
                    return { error: "dateValue must be a valid date" };
                }
                data.dateValue = dateValue;
            }
            break;
        case "DATE_RANGE": {
            if (body.dateFrom || body.dateTo) {
                const dateFrom = body.dateFrom ? new Date(body.dateFrom) : null;
                const dateTo = body.dateTo ? new Date(body.dateTo) : null;
                if ((dateFrom && Number.isNaN(dateFrom.getTime())) || (dateTo && Number.isNaN(dateTo.getTime()))) {
                    return { error: "dateFrom/dateTo must be valid dates" };
                }
                data.dateFrom = dateFrom;
                data.dateTo = dateTo;
            }
            break;
        }
        case "SELECT": {
            if (body.selectedOptionId) {
                const option = attribute.options?.find((o) => o.id === body.selectedOptionId);
                if (!option) {
                    return { error: "selectedOptionId must reference one of the attribute's options" };
                }
                data.selectedOptionId = body.selectedOptionId;
            }
            break;
        }
        default:
            return { error: "unsupported attribute type" };
    }

    return { data };
};
