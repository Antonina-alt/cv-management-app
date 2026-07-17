import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext.jsx'

const RegisterPage = () => {
    const { t } = useTranslation()
    const { register } = useAuth()
    const navigate = useNavigate()
    const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' })
    const [error, setError] = useState(null)

    const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value })

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError(null)
        try {
            await register(form)
            navigate('/', { replace: true })
        } catch (err) {
            setError(err.message)
        }
    }

    return (
        <div>
            <h1>{t('auth.registerTitle')}</h1>
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="firstName">{t('auth.firstName')}</label>
                    <input id="firstName" value={form.firstName} onChange={handleChange('firstName')} required />
                </div>
                <div>
                    <label htmlFor="lastName">{t('auth.lastName')}</label>
                    <input id="lastName" value={form.lastName} onChange={handleChange('lastName')} required />
                </div>
                <div>
                    <label htmlFor="email">{t('auth.email')}</label>
                    <input id="email" type="email" value={form.email} onChange={handleChange('email')} required />
                </div>
                <div>
                    <label htmlFor="password">{t('auth.password')}</label>
                    <input id="password" type="password" value={form.password} onChange={handleChange('password')} required />
                </div>
                {error && <p role="alert">{error}</p>}
                <button type="submit">{t('auth.submitRegister')}</button>
            </form>
            <p>
                {t('auth.haveAccount')} <Link to="/login">{t('auth.loginTitle')}</Link>
            </p>
        </div>
    )
}

export default RegisterPage
