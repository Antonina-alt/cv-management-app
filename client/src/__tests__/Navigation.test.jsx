import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import App from '../App.jsx'

const baseUser = {
    id: '1',
    email: 'a@example.com',
    firstName: 'Ada',
    lastName: 'Lovelace',
    theme: 'LIGHT',
    language: 'EN',
    version: 1,
}

const stubUser = (user) => {
    vi.stubGlobal('fetch', vi.fn(() =>
        Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(user) })
    ))
}

const stubGuest = () => {
    vi.stubGlobal('fetch', vi.fn(() =>
        Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({ error: { code: 'AUTH_REQUIRED' } }) })
    ))
}

describe('role-based navigation', () => {
    afterEach(() => {
        vi.restoreAllMocks()
        window.history.pushState({}, '', '/')
    })

    it('shows guest nav items only', async () => {
        stubGuest()
        render(<App />)

        await waitFor(() => expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument())
        expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Positions' })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Register' })).toBeInTheDocument()
        expect(screen.queryByRole('link', { name: 'My Profile' })).not.toBeInTheDocument()
        expect(screen.queryByRole('link', { name: 'Attribute Library' })).not.toBeInTheDocument()
        expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument()
    })

    it('shows candidate nav items', async () => {
        stubUser({ ...baseUser, roles: ['CANDIDATE'] })
        render(<App />)

        await waitFor(() => expect(screen.getByRole('link', { name: 'My Profile' })).toBeInTheDocument())
        expect(screen.queryByRole('link', { name: 'Attribute Library' })).not.toBeInTheDocument()
        expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument()
        expect(screen.queryByRole('link', { name: 'Log in' })).not.toBeInTheDocument()
    })

    it('shows recruiter nav items', async () => {
        stubUser({ ...baseUser, roles: ['RECRUITER'] })
        render(<App />)

        await waitFor(() => expect(screen.getByRole('link', { name: 'Attribute Library' })).toBeInTheDocument())
        expect(screen.getByRole('link', { name: 'My Profile' })).toBeInTheDocument()
        expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument()
    })

    it('shows admin nav items', async () => {
        stubUser({ ...baseUser, roles: ['ADMIN'] })
        render(<App />)

        await waitFor(() => expect(screen.getByRole('link', { name: 'Admin' })).toBeInTheDocument())
        expect(screen.getByRole('link', { name: 'My Profile' })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Attribute Library' })).toBeInTheDocument()
    })
})
