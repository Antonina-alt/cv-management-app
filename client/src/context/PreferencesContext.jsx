import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import i18n from '../i18n.js'
import { useAuth } from './AuthContext.jsx'
import * as authApi from '../api/auth.js'

const THEME_KEY = 'cvapp-theme'
const LANGUAGE_KEY = 'cvapp-language'

const PreferencesContext = createContext(null)

const normalizeTheme = (theme) => (theme === 'DARK' ? 'dark' : 'light')
const normalizeLanguage = (language) => (language === 'RU' ? 'ru' : 'en')

export const PreferencesProvider = ({ children }) => {
    const { user, updateUser } = useAuth()
    const [guestTheme, setGuestTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'light')
    const [guestLanguage, setGuestLanguage] = useState(() => localStorage.getItem(LANGUAGE_KEY) || 'en')

    const theme = user ? normalizeTheme(user.theme) : guestTheme
    const language = user ? normalizeLanguage(user.language) : guestLanguage

    useEffect(() => {
        document.documentElement.setAttribute('data-bs-theme', theme)
    }, [theme])

    useEffect(() => {
        i18n.changeLanguage(language)
        document.documentElement.setAttribute('lang', language)
    }, [language])

    const setTheme = useCallback(async (next) => {
        if (!user) {
            localStorage.setItem(THEME_KEY, next)
            setGuestTheme(next)
            return
        }
        try {
            const updated = await authApi.updateMe({ theme: next.toUpperCase(), version: user.version })
            updateUser(updated)
        } catch {
            // stale version or transient error: next toggle will use the latest known state
        }
    }, [user, updateUser])

    const setLanguage = useCallback(async (next) => {
        if (!user) {
            localStorage.setItem(LANGUAGE_KEY, next)
            setGuestLanguage(next)
            return
        }
        try {
            const updated = await authApi.updateMe({ language: next.toUpperCase(), version: user.version })
            updateUser(updated)
        } catch {
            // stale version or transient error: next toggle will use the latest known state
        }
    }, [user, updateUser])

    return (
        <PreferencesContext.Provider value={{ theme, language, setTheme, setLanguage }}>
            {children}
        </PreferencesContext.Provider>
    )
}

export const usePreferences = () => useContext(PreferencesContext)
