import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import App from '../App.jsx'

describe('App', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('renders and shows API status from /api/health', async () => {
        vi.stubGlobal('fetch', vi.fn(() =>
            Promise.resolve({ json: () => Promise.resolve({ status: 'ok' }) })
        ))

        render(<App />)

        expect(screen.getByText('React App')).toBeInTheDocument()
        await waitFor(() => expect(screen.getByText(/API status: ok/)).toBeInTheDocument())
    })
})
