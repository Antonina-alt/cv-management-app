import { Button, Modal } from 'react-bootstrap'

const ConfirmationModal = ({ show, title, body, cancelLabel, confirmLabel, onCancel, onConfirm, variant = 'danger' }) => (
    <Modal show={show} onHide={onCancel}>
        <Modal.Header closeButton><Modal.Title>{title}</Modal.Title></Modal.Header>
        <Modal.Body>{body}</Modal.Body>
        <Modal.Footer>
            <Button variant="secondary" onClick={onCancel}>{cancelLabel}</Button>
            <Button variant={variant} onClick={onConfirm}>{confirmLabel}</Button>
        </Modal.Footer>
    </Modal>
)

export default ConfirmationModal
