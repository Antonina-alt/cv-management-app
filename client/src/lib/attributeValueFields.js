const VALUE_FIELDS = ['stringValue', 'numberValue', 'booleanValue', 'dateValue', 'dateFrom', 'dateTo', 'imageUrl', 'selectedOptionId']

export const pickValueFields = (updated) => Object.fromEntries(VALUE_FIELDS.map((key) => [key, updated[key]]))
