import { Button, Form, Modal } from 'react-bootstrap'
import DismissibleAlert from './DismissibleAlert.jsx'

const FormModal = ({ show, onClose, onSubmit, title, error = null, cancelLabel, submitLabel, submitDisabled = false, size = undefined, children }) => (
    <Modal show={show} onHide={onClose} size={size}>
        <Form onSubmit={onSubmit}>
            <Modal.Header closeButton><Modal.Title>{title}</Modal.Title></Modal.Header>
            <Modal.Body>
                <DismissibleAlert variant="danger">{error}</DismissibleAlert>
                {children}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onClose} type="button">{cancelLabel}</Button>
                <Button variant="primary" type="submit" disabled={submitDisabled}>{submitLabel}</Button>
            </Modal.Footer>
        </Form>
    </Modal>
)

export default FormModal
