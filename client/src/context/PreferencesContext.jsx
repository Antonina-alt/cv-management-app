import { useCallback, useEffect, useState } from 'react'
import i18n from '../i18n.js'
import { useAuth } from './auth-context.js'
import * as authApi from '../api/auth.js'
import { PreferencesContext } from './preferences-context.js'

const THEME_KEY = 'cvapp-theme'
const LANGUAGE_KEY = 'cvapp-language'

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

    const savePreference = useCallback(async (changes) => {
        try {
            const updated = await authApi.updateMe({
                ...changes,
                version: user.version,
            })
            updateUser(updated)
        } catch (error) {
            console.error('Failed to save preferences', error)
        }
    }, [user, updateUser])

    const setTheme = useCallback(async (next) => {
        if (!user) {
            localStorage.setItem(THEME_KEY, next)
            setGuestTheme(next)
            return
        }
        await savePreference({ theme: next.toUpperCase() })
    }, [user, savePreference])

    const setLanguage = useCallback(async (next) => {
        if (!user) {
            localStorage.setItem(LANGUAGE_KEY, next)
            setGuestLanguage(next)
            return
        }

        await savePreference({ language: next.toUpperCase() })
    }, [user, savePreference])

    return (
        <PreferencesContext.Provider value={{ theme, language, setTheme, setLanguage }}>
            {children}
        </PreferencesContext.Provider>
    )
}
