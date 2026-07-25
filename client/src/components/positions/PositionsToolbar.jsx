import { useTranslation } from 'react-i18next'
import Toolbar from '../common/Toolbar.jsx'

const PositionsToolbar = ({ selection, onCreate, onOpen, onDuplicate, onDelete }) => {
    const { t } = useTranslation()
    const actions = [
        { key: 'create', label: t('positions.toolbar.create'), variant: 'primary', onClick: onCreate },
        { key: 'open', label: t('positions.toolbar.open'), variant: 'outline-primary', disabled: !selection.single, onClick: onOpen },
        { key: 'duplicate', label: t('positions.toolbar.duplicate'), variant: 'outline-primary', disabled: !selection.items.length, onClick: onDuplicate },
        { key: 'delete', label: t('positions.toolbar.delete'), variant: 'outline-danger', disabled: !selection.items.length, onClick: onDelete },
    ]
    return <Toolbar actions={actions} />
}

export default PositionsToolbar
