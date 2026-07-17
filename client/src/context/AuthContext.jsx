import { useCallback, useEffect, useState } from 'react'
import * as authApi from '../api/auth.js'
import { AuthContext } from './auth-context.js'

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    const refresh = useCallback(async () => {
        try {
            const current = await authApi.me()
            setUser(current)
        } catch {
            setUser(null)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        let cancelled = false
        authApi.me()
            .then((current) => { if (!cancelled) setUser(current) })
            .catch(() => { if (!cancelled) setUser(null) })
            .finally(() => { if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
    }, [])

    const login = async (credentials) => {
        const current = await authApi.login(credentials)
        setUser(current)
        return current
    }

    const register = async (data) => {
        const current = await authApi.register(data)
        setUser(current)
        return current
    }

    const logout = async () => {
        await authApi.logout()
        setUser(null)
    }

    const updateUser = (patch) => {
        setUser((prev) => (prev ? { ...prev, ...patch } : prev))
    }

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, refresh, updateUser }}>
            {children}
        </AuthContext.Provider>
    )
}
