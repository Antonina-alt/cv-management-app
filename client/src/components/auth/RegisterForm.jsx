import { useCallback } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/auth-context.js'
import { useAuthForm } from '../../hooks/useAuthForm.js'
import { isFieldError } from '../../lib/errors.js'
import ErrorAlert from '../common/ErrorAlert.jsx'
import AuthTextField from './AuthTextField.jsx'

const INITIAL_FORM = { firstName: '', lastName: '', email: '', password: '' }

const RegisterForm = () => {
    const { t } = useTranslation()
    const { register } = useAuth()
    const navigate = useNavigate()
    const submit = useCallback(async (form) => {
        await register(form)
        navigate('/', { replace: true })
    }, [navigate, register])
    const { form, error, setField, handleSubmit } = useAuthForm(INITIAL_FORM, submit)
    return (
        <Form onSubmit={handleSubmit}>
            <AuthTextField id="firstName" label={t('auth.firstName')} value={form.firstName} onChange={(value) => setField('firstName', value)} />
            <AuthTextField id="lastName" label={t('auth.lastName')} value={form.lastName} onChange={(value) => setField('lastName', value)} />
            <AuthTextField id="email" label={t('auth.email')} type="email" value={form.email} onChange={(value) => setField('email', value)} error={isFieldError(error, 'email') ? error : null} />
            <AuthTextField id="password" label={t('auth.password')} type="password" value={form.password} onChange={(value) => setField('password', value)} />
            <ErrorAlert error={error?.field ? null : error} />
            <Button type="submit" variant="primary" className="w-100">{t('auth.submitRegister')}</Button>
        </Form>
    )
}

export default RegisterForm
