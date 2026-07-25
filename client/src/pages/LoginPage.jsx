import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AuthCard from '../components/auth/AuthCard.jsx'
import LoginForm from '../components/auth/LoginForm.jsx'

const LoginPage = () => {
    const { t } = useTranslation()
    const footer = <>{t('auth.noAccount')} <Link to="/register">{t('auth.registerTitle')}</Link></>
    return <AuthCard title={t('auth.loginTitle')} footer={footer}><LoginForm /></AuthCard>
}

export default LoginPage
