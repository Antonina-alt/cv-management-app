import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, Col, Container, Form, Row } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import ErrorAlert from '../components/common/ErrorAlert.jsx'
import FieldError from '../components/common/FieldError.jsx'
import { isFieldError } from '../lib/errors.js'
import { useAuth } from '../context/auth-context.js'

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
            setError(err)
        }
    }

    return (
        <Container className="d-flex justify-content-center align-items-center py-5">
            <Row className="w-100 justify-content-center">
                <Col xs={12} sm={9} md={6} lg={4}>
                    <Card className="shadow-sm">
                        <Card.Body className="p-4">
                            <Card.Title as="h1" className="h3 text-center mb-4">{t('auth.registerTitle')}</Card.Title>
                            <Form onSubmit={handleSubmit}>
                                <Form.Group className="mb-3" controlId="firstName">
                                    <Form.Label>{t('auth.firstName')}</Form.Label>
                                    <Form.Control value={form.firstName} onChange={handleChange('firstName')} required />
                                </Form.Group>
                                <Form.Group className="mb-3" controlId="lastName">
                                    <Form.Label>{t('auth.lastName')}</Form.Label>
                                    <Form.Control value={form.lastName} onChange={handleChange('lastName')} required />
                                </Form.Group>
                                <Form.Group className="mb-3" controlId="email">
                                    <Form.Label>{t('auth.email')}</Form.Label>
                                    <Form.Control
                                        type="email"
                                        isInvalid={isFieldError(error, 'email')}
                                        value={form.email}
                                        onChange={handleChange('email')}
                                        required
                                    />
                                    <FieldError error={error} field="email" />
                                </Form.Group>
                                <Form.Group className="mb-3" controlId="password">
                                    <Form.Label>{t('auth.password')}</Form.Label>
                                    <Form.Control
                                        type="password"
                                        value={form.password}
                                        onChange={handleChange('password')}
                                        required
                                    />
                                </Form.Group>
                                <ErrorAlert error={error?.field ? null : error} />
                                <Button type="submit" variant="primary" className="w-100">
                                    {t('auth.submitRegister')}
                                </Button>
                            </Form>
                            <p className="text-center text-muted mt-3 mb-0">
                                {t('auth.haveAccount')} <Link to="/login">{t('auth.loginTitle')}</Link>
                            </p>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    )
}

export default RegisterPage
