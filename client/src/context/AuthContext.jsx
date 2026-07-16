import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import * as authApi from '../api/auth.js'

const AuthContext = createContext(null)

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
        refresh()
    }, [refresh])

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

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
