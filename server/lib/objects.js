export const mapDefinedFields = (body, fieldTransforms) => Object.fromEntries(
    Object.entries(fieldTransforms)
        .filter(([field]) => body[field] !== undefined)
        .map(([field, transform]) => [field, transform(body[field])]),
);

export const hasOwnFields = (value) => Object.keys(value).length > 0;
