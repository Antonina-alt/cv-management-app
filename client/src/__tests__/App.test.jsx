import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import App from '../App.jsx'

describe('App', () => {
    afterEach(() => {
        vi.restoreAllMocks()
        window.history.pushState({}, '', '/')
    })

    it('shows the public home page for an unauthenticated visitor', async () => {
        vi.stubGlobal('fetch', vi.fn(() =>
            Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({ error: { code: 'AUTH_REQUIRED' } }) })
        ))

        render(<App />)

        await waitFor(() => expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument())
    })

    it('redirects an unauthenticated visitor away from /profile to login', async () => {
        vi.stubGlobal('fetch', vi.fn(() =>
            Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({ error: { code: 'AUTH_REQUIRED' } }) })
        ))
        window.history.pushState({}, '', '/profile')

        render(<App />)

        await waitFor(() => expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument())
    })

    it('shows the profile page for an authenticated visitor at /profile', async () => {
        const user = {
            id: '1',
            email: 'a@example.com',
            firstName: 'Ada',
            lastName: 'Lovelace',
            roles: ['CANDIDATE'],
            theme: 'LIGHT',
            language: 'EN',
            version: 1,
        }
        vi.stubGlobal('fetch', vi.fn((url) => {
            if (String(url).startsWith('/api/profile/')) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve({ user, attributeValues: [], projects: [], resumes: [] }),
                })
            }
            return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(user) })
        }))
        window.history.pushState({}, '', '/profile')

        render(<App />)

        await waitFor(() => expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument())
        expect(screen.getByText('a@example.com')).toBeInTheDocument()
    })
})
