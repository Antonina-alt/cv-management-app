export class ApiError extends Error {
    constructor(message, status, body) {
        super(message)
        this.name = 'ApiError'
        this.status = status
        this.body = body
    }
}

export class ConflictError extends ApiError {
    constructor(message, body) {
        super(message, 409, body)
        this.name = 'ConflictError'
    }
}

const isFormData = (body) => typeof FormData !== 'undefined' && body instanceof FormData
const serializeBody = (body) => body === undefined || isFormData(body) ? body : JSON.stringify(body)

const createHeaders = (body, headers) => body === undefined || isFormData(body)
    ? headers
    : { 'Content-Type': 'application/json', ...headers }

const parseResponse = async (response) => response.status === 204
    ? null
    : response.json().catch(() => null)

const throwRequestError = (response, body) => {
    const message = body?.message ?? `Request failed with status ${response.status}`
    if (response.status === 409) throw new ConflictError(message, body)
    throw new ApiError(message, response.status, body)
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
    const response = await fetch(path, {
        credentials: 'include',
        ...options,
        headers: createHeaders(body, headers),
        body: serializeBody(body),
    })
    const responseBody = await parseResponse(response)
    if (!response.ok) throwRequestError(response, responseBody)
    return responseBody
}

export const get = (path) => apiRequest(path, { method: 'GET' })
export const post = (path, body) => apiRequest(path, { method: 'POST', body })
export const put = (path, body) => apiRequest(path, { method: 'PUT', body })
export const patch = (path, body) => apiRequest(path, { method: 'PATCH', body })
export const remove = (path, body) => apiRequest(path, { method: 'DELETE', body })
