import { useState } from 'react'
import { Container, Form, Nav, Navbar } from 'react-bootstrap'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/auth-context.js'
import { usePreferences } from '../../context/preferences-context.js'
import ErrorAlert from '../common/ErrorAlert.jsx'
import HeaderControls from './HeaderControls.jsx'
import { getNavItems } from './navConfig.js'

const AppLayout = () => {
    const { t } = useTranslation()
    const { user, logout, error: authError, clearError: clearAuthError } = useAuth()
    const { theme, setTheme, language, setLanguage, error: preferenceError, clearError: clearPreferenceError } = usePreferences()
    const navigate = useNavigate()
    const [query, setQuery] = useState('')
    const [layoutError, setLayoutError] = useState(null)
    const search = (event) => {
        event.preventDefault()
        const normalized = query.trim()
        if (normalized) navigate(`/search?q=${encodeURIComponent(normalized)}`)
    }
    const signOut = async () => {
        try {
            await logout()
            navigate('/login', { replace: true })
        } catch (error) {
            setLayoutError(error)
        }
    }
    return (
        <>
            <Navbar expand="lg" bg="body" data-bs-theme={theme} className="border-bottom mb-3">
                <Container fluid>
                    <Navbar.Brand as={Link} to="/">cv-app</Navbar.Brand>
                    <Navbar.Toggle aria-controls="main-nav" aria-label={t('header.toggleNav')} />
                    <Navbar.Collapse id="main-nav">
                        <Nav className="me-auto">{getNavItems(user).map(({ to, labelKey }) => <Nav.Link key={to} as={NavLink} to={to} end={to === '/'}>{t(labelKey)}</Nav.Link>)}</Nav>
                        <Form className="d-flex me-3 my-2 my-lg-0" role="search" onSubmit={search}>
                            <Form.Control type="search" aria-label={t('header.searchLabel')} placeholder={t('header.searchPlaceholder')} value={query} onChange={(event) => setQuery(event.target.value)} />
                        </Form>
                        <HeaderControls user={user} theme={theme} language={language} onThemeChange={setTheme} onLanguageChange={setLanguage} onLogout={signOut} t={t} />
                    </Navbar.Collapse>
                </Container>
            </Navbar>
            <Container as="main">
                <ErrorAlert error={authError} onClose={clearAuthError} />
                <ErrorAlert error={preferenceError} onClose={clearPreferenceError} />
                <ErrorAlert error={layoutError} onClose={() => setLayoutError(null)} />
                <Outlet />
            </Container>
        </>
    )
}

export default AppLayout
