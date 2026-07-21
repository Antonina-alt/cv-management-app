// Mirrors server/lib/resumeContent.js's isValueEmpty, adapted for the client's in-progress edit
// state (form inputs hand back numberValue as a string, not a number).
export const isAttributeValueEmpty = (type, value) => {
    switch (type) {
        case 'STRING':
        case 'TEXT':
            return !value.stringValue
        case 'IMAGE':
            return !value.imageUrl
        case 'NUMBER':
            return value.numberValue === null || value.numberValue === undefined || value.numberValue === ''
        case 'DATE':
            return !value.dateValue
        case 'DATE_RANGE':
            return !value.dateFrom && !value.dateTo
        case 'BOOLEAN':
            return value.booleanValue === null || value.booleanValue === undefined
        case 'SELECT':
            return !value.selectedOptionId
        default:
            return true
    }
}
