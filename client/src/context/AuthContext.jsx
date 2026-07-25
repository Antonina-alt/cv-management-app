import { useCallback, useEffect, useState } from 'react'
import * as authApi from '../api/auth.js'
import { AuthContext } from './auth-context.js'

const isExpectedGuest = (error) => error?.code === 'AUTH_REQUIRED'

const loadAuthState = async () => {
    try {
        return { user: await authApi.me(), error: null }
    } catch (error) {
        return { user: null, error: isExpectedGuest(error) ? null : error }
    }
}

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const applyAuthState = useCallback((state) => {
        setUser(state.user)
        setError(state.error)
    }, [])

    const acceptUser = useCallback((current) => {
        applyAuthState({ user: current, error: null })
        return current
    }, [applyAuthState])

    const refresh = useCallback(async () => {
        setLoading(true)
        const state = await loadAuthState()
        applyAuthState(state)
        setLoading(false)
        return state.user
    }, [applyAuthState])

    useEffect(() => {
        let active = true

        loadAuthState().then((state) => {
            if (!active) return

            applyAuthState(state)
            setLoading(false)
        })

        return () => {
            active = false
        }
    }, [applyAuthState])

    const login = async (credentials) => {return acceptUser(await authApi.login(credentials))}

    const register = async (data) => {return acceptUser(await authApi.register(data))}

    const logout = async () => {
        await authApi.logout()
        applyAuthState({ user: null, error: null })
    }

    const updateUser = (patch) => {
        setUser((current) => current
            ? { ...current, ...patch }
            : current)
    }

    const clearError = useCallback(() => {setError(null)}, [])

    const value = {user, loading, error, login, register, logout, refresh, updateUser, clearError,}

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}