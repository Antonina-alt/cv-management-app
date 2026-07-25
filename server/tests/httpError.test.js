import { describe, expect, it, vi } from 'vitest'
import { ERROR_CODES } from '../lib/errorCodes.js'
import { conflict, errorHandler } from '../lib/httpError.js'

const response = () => {
    const res = { headersSent: false, status: vi.fn(), json: vi.fn() }
    res.status.mockReturnValue(res)
    return res
}

describe('HTTP error contract', () => {
    it('returns a stable code and structured details', () => {
        let error
        try {
            conflict(ERROR_CODES.VERSION_CONFLICT, { resource: 'position', position: { id: '1' } })
        } catch (caught) {
            error = caught
        }
        const res = response()
        errorHandler(error, {}, res, vi.fn())
        expect(res.status).toHaveBeenCalledWith(409)
        expect(res.json).toHaveBeenCalledWith({
            error: { code: 'VERSION_CONFLICT', resource: 'position', position: { id: '1' } },
        })
    })
})
