import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AuthCard from '../components/auth/AuthCard.jsx'
import RegisterForm from '../components/auth/RegisterForm.jsx'

const RegisterPage = () => {
    const { t } = useTranslation()
    const footer = <>{t('auth.haveAccount')} <Link to="/login">{t('auth.loginTitle')}</Link></>
    return <AuthCard title={t('auth.registerTitle')} footer={footer}><RegisterForm /></AuthCard>
}

export default RegisterPage
