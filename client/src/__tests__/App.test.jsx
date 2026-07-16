import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import App from '../App.jsx'

describe('App', () => {
    afterEach(() => {
        vi.restoreAllMocks()
        window.history.pushState({}, '', '/')
    })

    it('redirects an unauthenticated visitor to the login page', async () => {
        vi.stubGlobal('fetch', vi.fn(() =>
            Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({ message: 'Not authenticated' }) })
        ))

        render(<App />)

        await waitFor(() => expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument())
    })

    it('shows the profile page for an authenticated visitor', async () => {
        const user = { id: '1', email: 'a@example.com', firstName: 'Ada', lastName: 'Lovelace', roles: ['CANDIDATE'] }
        vi.stubGlobal('fetch', vi.fn(() =>
            Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(user) })
        ))

        render(<App />)

        await waitFor(() => expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument())
        expect(screen.getByText('a@example.com')).toBeInTheDocument()
    })
})
