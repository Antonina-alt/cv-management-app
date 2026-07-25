import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { errorMessage, isFieldError } from '../../lib/errors.js'

const FieldError = ({ error, field }) => {
    const { t } = useTranslation()
    if (!isFieldError(error, field)) return null
    return <Form.Control.Feedback type="invalid" className="d-block">{errorMessage(error, t)}</Form.Control.Feedback>
}

export default FieldError
