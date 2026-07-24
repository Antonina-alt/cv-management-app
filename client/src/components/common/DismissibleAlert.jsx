import { Alert } from 'react-bootstrap'

const DismissibleAlert = ({ children, onClose = undefined, variant = 'warning', className = undefined }) => {
    if (!children) return null
    return (
        <Alert variant={variant} dismissible={Boolean(onClose)} onClose={onClose} className={className}>
            {children}
        </Alert>
    )
}

export default DismissibleAlert
