import { Form } from 'react-bootstrap'
import FieldError from '../common/FieldError.jsx'

const AuthTextField = ({ id, label, type = 'text', value, onChange, error }) => (
    <Form.Group className="mb-3" controlId={id}>
        <Form.Label>{label}</Form.Label>
        <Form.Control type={type} isInvalid={Boolean(error)} value={value} onChange={(event) => onChange(event.target.value)} required />
        {error && <FieldError error={error} field={id} />}
    </Form.Group>
)

export default AuthTextField
