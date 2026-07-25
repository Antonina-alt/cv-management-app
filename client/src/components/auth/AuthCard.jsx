import { Card, Col, Container, Row } from 'react-bootstrap'

const AuthCard = ({ title, children, footer }) => (
    <Container className="d-flex justify-content-center align-items-center py-5">
        <Row className="w-100 justify-content-center">
            <Col xs={12} sm={9} md={6} lg={4}>
                <Card className="shadow-sm">
                    <Card.Body className="p-4">
                        <Card.Title as="h1" className="h3 text-center mb-4">{title}</Card.Title>
                        {children}
                        <p className="text-center text-muted mt-3 mb-0">{footer}</p>
                    </Card.Body>
                </Card>
            </Col>
        </Row>
    </Container>
)

export default AuthCard
