import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext.jsx'

const LoginPage = () => {
    const { t } = useTranslation()
    const { login } = useAuth()
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState(null)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError(null)
        try {
            await login({ email, password })
            navigate('/', { replace: true })
        } catch (err) {
            setError(err.message)
        }
    }

    return (
        <div>
            <h1>{t('auth.loginTitle')}</h1>
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="email">{t('auth.email')}</label>
                    <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div>
                    <label htmlFor="password">{t('auth.password')}</label>
                    <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                {error && <p role="alert">{error}</p>}
                <button type="submit">{t('auth.submitLogin')}</button>
            </form>
            <p>
                {t('auth.noAccount')} <Link to="/register">{t('auth.registerTitle')}</Link>
            </p>
        </div>
    )
}

export default LoginPage
