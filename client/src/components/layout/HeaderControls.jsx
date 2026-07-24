import { Button, ButtonGroup, Dropdown, Nav } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { formatName } from '../../lib/formatName.js'

const ThemeToggle = ({ theme, onChange, t }) => (
    <Button variant="outline-secondary" size="sm" aria-label={t('header.toggleTheme')} onClick={() => onChange(theme === 'dark' ? 'light' : 'dark')}>
        {theme === 'dark' ? '☀️' : '🌙'}
    </Button>
)

const LanguageToggle = ({ language, onChange, t }) => (
    <ButtonGroup size="sm" aria-label={t('header.toggleLanguage')}>
        {['en', 'ru'].map((item) => <Button key={item} variant={language === item ? 'secondary' : 'outline-secondary'} onClick={() => onChange(item)}>{item.toUpperCase()}</Button>)}
    </ButtonGroup>
)

const HeaderControls = ({ user, theme, language, onThemeChange, onLanguageChange, onLogout, t }) => (
    <div className="d-flex align-items-center gap-2 mb-2 mb-lg-0">
        <ThemeToggle theme={theme} onChange={onThemeChange} t={t} />
        <LanguageToggle language={language} onChange={onLanguageChange} t={t} />
        {user ? (
            <Dropdown align="end">
                <Dropdown.Toggle variant="outline-secondary" size="sm">{formatName(user)}</Dropdown.Toggle>
                <Dropdown.Menu><Dropdown.Item as="button" onClick={onLogout}>{t('header.logout')}</Dropdown.Item></Dropdown.Menu>
            </Dropdown>
        ) : (
            <Nav><Nav.Link as={Link} to="/login">{t('header.login')}</Nav.Link><Nav.Link as={Link} to="/register">{t('header.register')}</Nav.Link></Nav>
        )}
    </div>
)

export default HeaderControls
