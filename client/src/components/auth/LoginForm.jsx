import { useCallback } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/auth-context.js'
import { useAuthForm } from '../../hooks/useAuthForm.js'
import { isFieldError } from '../../lib/errors.js'
import ErrorAlert from '../common/ErrorAlert.jsx'
import AuthTextField from './AuthTextField.jsx'

const INITIAL_FORM = { email: '', password: '' }

const LoginForm = () => {
    const { t } = useTranslation()
    const { login } = useAuth()
    const navigate = useNavigate()
    const submit = useCallback(async (form) => {
        await login(form)
        navigate('/', { replace: true })
    }, [login, navigate])
    const { form, error, setField, handleSubmit } = useAuthForm(INITIAL_FORM, submit)
    return (
        <Form onSubmit={handleSubmit}>
            <AuthTextField id="email" label={t('auth.email')} type="email" value={form.email} onChange={(value) => setField('email', value)} error={isFieldError(error, 'email') ? error : null} />
            <AuthTextField id="password" label={t('auth.password')} type="password" value={form.password} onChange={(value) => setField('password', value)} />
            <ErrorAlert error={error?.field ? null : error} />
            <Button type="submit" variant="primary" className="w-100">{t('auth.submitLogin')}</Button>
        </Form>
    )
}

export default LoginForm
