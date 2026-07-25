import { useTranslation } from 'react-i18next'
import { errorMessage, errorVariant } from '../../lib/errors.js'
import DismissibleAlert from './DismissibleAlert.jsx'

const ErrorAlert = ({ error, onClose, className }) => {
    const { t } = useTranslation()
    if (!error) return null
    return (
        <DismissibleAlert variant={errorVariant(error)} onClose={onClose} className={className}>
            {errorMessage(error, t)}
        </DismissibleAlert>
    )
}

export default ErrorAlert
