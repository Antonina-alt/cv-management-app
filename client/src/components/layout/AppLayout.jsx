import { useEffect, useRef, useState } from 'react'
import { Container, Nav, Navbar, Form } from 'react-bootstrap'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/auth-context.js'
import { usePreferences } from '../../context/preferences-context.js'
import { getNavItems } from './navConfig.js'

const AppLayout = () => {
    const { t } = useTranslation()
    const { user, logout } = useAuth()
    const { theme, setTheme, language, setLanguage } = usePreferences()
    const navigate = useNavigate()
    const [query, setQuery] = useState('')
    const [userMenuOpen, setUserMenuOpen] = useState(false)
    const userMenuRef = useRef(null)

    const navItems = getNavItems(user)

    useEffect(() => {
        if (!userMenuOpen) return undefined

        const handleClickOutside = (e) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
                setUserMenuOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [userMenuOpen])

    const handleSearchSubmit = (e) => {
        e.preventDefault()
        navigate(`/search?q=${encodeURIComponent(query)}`)
    }

    const handleLogout = async () => {
        setUserMenuOpen(false)
        await logout()
        navigate('/login', { replace: true })
    }

    return (
        <>
            <Navbar expand="lg" bg="body" data-bs-theme={theme} className="border-bottom mb-3">
                <Container fluid>
                    <Navbar.Brand as={Link} to="/">cv-app</Navbar.Brand>
                    <Navbar.Toggle aria-controls="main-nav" aria-label={t('header.toggleNav')} />
                    <Navbar.Collapse id="main-nav">
                        <Nav className="me-auto">
                            {navItems.map((item) => (
                                <Nav.Link key={item.to} as={NavLink} to={item.to} end={item.to === '/'}>
                                    {t(item.labelKey)}
                                </Nav.Link>
                            ))}
                        </Nav>

                        <Form className="d-flex me-3 mt-2 mt-lg-0" role="search" onSubmit={handleSearchSubmit}>
                            <Form.Control
                                type="search"
                                aria-label={t('header.searchLabel')}
                                placeholder={t('header.searchPlaceholder')}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                        </Form>

                        <div className="d-flex align-items-center gap-2 mb-2 mb-lg-0">
                            <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm"
                                aria-label={t('header.toggleTheme')}
                                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            >
                                {theme === 'dark' ? '☀️' : '🌙'}
                            </button>

                            <div className="btn-group" role="group" aria-label={t('header.toggleTheme')}>
                                <button
                                    type="button"
                                    className={`btn btn-sm ${language === 'en' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                                    onClick={() => setLanguage('en')}
                                >
                                    EN
                                </button>
                                <button
                                    type="button"
                                    className={`btn btn-sm ${language === 'ru' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                                    onClick={() => setLanguage('ru')}
                                >
                                    RU
                                </button>
                            </div>

                            {user ? (
                                <div className="dropdown position-relative" ref={userMenuRef}>
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary btn-sm dropdown-toggle"
                                        id="user-menu"
                                        aria-expanded={userMenuOpen}
                                        onClick={() => setUserMenuOpen((open) => !open)}
                                    >
                                        {user.firstName} {user.lastName}
                                    </button>
                                    <ul
                                        className={`dropdown-menu dropdown-menu-end${userMenuOpen ? ' show' : ''}`}
                                        aria-labelledby="user-menu"
                                    >
                                        <li>
                                            <button type="button" className="dropdown-item" onClick={handleLogout}>
                                                {t('header.logout')}
                                            </button>
                                        </li>
                                    </ul>
                                </div>
                            ) : (
                                <>
                                    <Nav.Link as={Link} to="/login">{t('header.login')}</Nav.Link>
                                    <Nav.Link as={Link} to="/register">{t('header.register')}</Nav.Link>
                                </>
                            )}
                        </div>
                    </Navbar.Collapse>
                </Container>
            </Navbar>

            <Container as="main">
                <Outlet />
            </Container>
        </>
    )
}

export default AppLayout
