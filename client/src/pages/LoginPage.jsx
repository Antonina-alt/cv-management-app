import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, Col, Container, Form, Row } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import ErrorAlert from '../components/common/ErrorAlert.jsx'
import FieldError from '../components/common/FieldError.jsx'
import { isFieldError } from '../lib/errors.js'
import { useAuth } from '../context/auth-context.js'

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
            setError(err)
        }
    }

    return (
        <Container className="d-flex justify-content-center align-items-center py-5">
            <Row className="w-100 justify-content-center">
                <Col xs={12} sm={9} md={6} lg={4}>
                    <Card className="shadow-sm">
                        <Card.Body className="p-4">
                            <Card.Title as="h1" className="h3 text-center mb-4">{t('auth.loginTitle')}</Card.Title>
                            <Form onSubmit={handleSubmit}>
                                <Form.Group className="mb-3" controlId="email">
                                    <Form.Label>{t('auth.email')}</Form.Label>
                                    <Form.Control
                                        type="email"
                                        isInvalid={isFieldError(error, 'email')}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                    <FieldError error={error} field="email" />
                                </Form.Group>
                                <Form.Group className="mb-3" controlId="password">
                                    <Form.Label>{t('auth.password')}</Form.Label>
                                    <Form.Control
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </Form.Group>
                                <ErrorAlert error={error?.field ? null : error} />
                                <Button type="submit" variant="primary" className="w-100">
                                    {t('auth.submitLogin')}
                                </Button>
                            </Form>
                            <p className="text-center text-muted mt-3 mb-0">
                                {t('auth.noAccount')} <Link to="/register">{t('auth.registerTitle')}</Link>
                            </p>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    )
}

export default LoginPage
