import { useCallback, useEffect, useState } from 'react'
import { ConflictError } from '../api/http.js'
import * as authApi from '../api/auth.js'
import i18n from '../i18n.js'
import { createError } from '../lib/errors.js'
import { useAuth } from './auth-context.js'
import { PreferencesContext } from './preferences-context.js'

const THEME_KEY = 'cvapp-theme'
const LANGUAGE_KEY = 'cvapp-language'

const normalizeTheme = (theme) => theme === 'DARK' ? 'dark' : 'light'
const normalizeLanguage = (language) => language === 'RU' ? 'ru' : 'en'
const readPreference = (key, fallback) => {
    try {
        return localStorage.getItem(key) || fallback
    } catch {
        return fallback
    }
}

export const PreferencesProvider = ({ children }) => {
    const { user, updateUser } = useAuth()
    const [guestTheme, setGuestTheme] = useState(() => readPreference(THEME_KEY, 'light'))
    const [guestLanguage, setGuestLanguage] = useState(() => readPreference(LANGUAGE_KEY, 'en'))
    const [error, setError] = useState(null)
    const theme = user ? normalizeTheme(user.theme) : guestTheme
    const language = user ? normalizeLanguage(user.language) : guestLanguage

    useEffect(() => {
        document.documentElement.setAttribute('data-bs-theme', theme)
    }, [theme])

    useEffect(() => {
        i18n.changeLanguage(language)
        document.documentElement.setAttribute('lang', language)
    }, [language])

    const persistPreference = useCallback((changes, version) => authApi.updateMe({ ...changes, version }), [])

    const savePreference = useCallback(async (changes) => {
        setError(null)
        try {
            const updated = await persistPreference(changes, user.version)
            updateUser(updated)
        } catch (requestError) {
            if (!(requestError instanceof ConflictError) || !requestError.user) return setError(requestError)
            updateUser(requestError.user)
            try {
                updateUser(await persistPreference(changes, requestError.user.version))
            } catch (retryError) {
                setError(retryError)
            }
        }
    }, [persistPreference, updateUser, user])

    const saveGuestPreference = useCallback((key, value, setter) => {
        try {
            localStorage.setItem(key, value)
            setter(value)
            setError(null)
        } catch {
            setError(createError('PREFERENCE_SAVE_FAILED'))
        }
    }, [])

    const setTheme = useCallback((next) => user
        ? savePreference({ theme: next.toUpperCase() })
        : saveGuestPreference(THEME_KEY, next, setGuestTheme), [saveGuestPreference, savePreference, user])

    const setLanguage = useCallback((next) => user
        ? savePreference({ language: next.toUpperCase() })
        : saveGuestPreference(LANGUAGE_KEY, next, setGuestLanguage), [saveGuestPreference, savePreference, user])

    const clearError = useCallback(() => setError(null), [])

    return (
        <PreferencesContext.Provider value={{ theme, language, setTheme, setLanguage, error, clearError }}>
            {children}
        </PreferencesContext.Provider>
    )
}
