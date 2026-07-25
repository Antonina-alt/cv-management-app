import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, ConflictError, apiRequest } from './http.js'

const response = (status, body) => ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
})

describe('apiRequest errors', () => {
    afterEach(() => vi.unstubAllGlobals())

    it('creates a version conflict only for VERSION_CONFLICT', async () => {
        vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(response(409, {
            error: { code: 'VERSION_CONFLICT', resource: 'position', position: { id: '1' } },
        }))))

        await expect(apiRequest('/api/test')).rejects.toMatchObject({
            name: 'ConflictError',
            code: 'VERSION_CONFLICT',
            resource: 'position',
        })
    })

    it('keeps other 409 responses as domain errors', async () => {
        vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(response(409, {
            error: { code: 'RESUME_ALREADY_EXISTS' },
        }))))

        try {
            await apiRequest('/api/test')
        } catch (error) {
            expect(error).toBeInstanceOf(ApiError)
            expect(error).not.toBeInstanceOf(ConflictError)
            expect(error.code).toBe('RESUME_ALREADY_EXISTS')
        }
    })

    it('normalizes network failures', async () => {
        vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))))
        await expect(apiRequest('/api/test')).rejects.toMatchObject({ code: 'NETWORK_ERROR', status: 0 })
    })
})
