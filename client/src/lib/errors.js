export const createError = (code, details = {}) => ({ code, ...details })

const errorCode = (error) => error?.code ?? 'UNKNOWN_ERROR'
const isVersionConflict = (error) => errorCode(error) === 'VERSION_CONFLICT'
export const isFieldError = (error, field) => error?.field === field

export const errorMessage = (error, t) => t(`errors.${errorCode(error)}`, {
    ...error?.params,
    defaultValue: t('errors.UNKNOWN_ERROR'),
})

export const errorVariant = (error) => isVersionConflict(error) ? 'warning' : 'danger'
