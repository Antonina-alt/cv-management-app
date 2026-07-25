const STATUS_CODES = {
    401: 'AUTH_REQUIRED',
    403: 'FORBIDDEN',
    404: 'API_NOT_FOUND',
    500: 'INTERNAL_SERVER_ERROR',
}

const fallbackCode = (status) => STATUS_CODES[status] ?? 'UNKNOWN_ERROR'
const isFormData = (body) => typeof FormData !== 'undefined' && body instanceof FormData
const serializeBody = (body) => body === undefined || isFormData(body) ? body : JSON.stringify(body)

const createHeaders = (body, headers) => body === undefined || isFormData(body)
    ? headers
    : { 'Content-Type': 'application/json', ...headers }

const parseResponse = async (response) => response.status === 204
    ? null
    : response.json().catch(() => null)

const errorPayload = (status, body) => body?.error ?? {
    code: body?.code ?? fallbackCode(status),
    params: body?.params,
    field: body?.field,
}

export class ApiError extends Error {
    constructor(status, payload = {}, body = null) {
        super(payload.code ?? fallbackCode(status))
        this.name = 'ApiError'
        this.status = status
        this.code = payload.code ?? fallbackCode(status)
        this.params = payload.params ?? {}
        this.field = payload.field
        this.resource = payload.resource
        this.body = body
        Object.assign(this, payload)
    }
}

export class ConflictError extends ApiError {
    constructor(payload, body) {
        super(409, payload, body)
        this.name = 'ConflictError'
    }
}

const requestError = (response, body) => {
    const payload = errorPayload(response.status, body)
    return payload.code === 'VERSION_CONFLICT'
        ? new ConflictError(payload, body)
        : new ApiError(response.status, payload, body)
}

const executeRequest = async (path, options) => {
    try {
        return await fetch(path, options)
    } catch (error) {
        if (error instanceof ApiError) throw error
        throw new ApiError(0, { code: 'NETWORK_ERROR' })
    }
}

export const withQuery = (path, values = {}) => {
    const query = new URLSearchParams()
    Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') query.set(key, value)
    })
    const queryString = query.toString()
    return queryString ? `${path}?${queryString}` : path
}

export const apiRequest = async (path, { body, headers, ...options } = {}) => {
    const response = await executeRequest(path, {
        credentials: 'include',
        ...options,
        headers: createHeaders(body, headers),
        body: serializeBody(body),
    })
    const responseBody = await parseResponse(response)
    if (!response.ok) throw requestError(response, responseBody)
    return responseBody
}

export const get = (path) => apiRequest(path, { method: 'GET' })
export const post = (path, body) => apiRequest(path, { method: 'POST', body })
export const put = (path, body) => apiRequest(path, { method: 'PUT', body })
export const patch = (path, body) => apiRequest(path, { method: 'PATCH', body })
export const remove = (path, body) => apiRequest(path, { method: 'DELETE', body })
