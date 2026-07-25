import { useTranslation } from 'react-i18next'
import Toolbar from '../common/Toolbar.jsx'

const AttributesToolbar = ({ selection, hasSystem, onCreate, onEdit, onDelete }) => {
    const { t } = useTranslation()
    const actions = [
        { key: 'create', label: t('attributes.toolbar.create'), variant: 'primary', onClick: onCreate },
        { key: 'edit', label: t('attributes.toolbar.edit'), variant: 'outline-primary', disabled: !selection.single, onClick: onEdit },
        { key: 'delete', label: t('attributes.toolbar.delete'), variant: 'outline-danger', disabled: !selection.items.length || hasSystem, title: hasSystem ? t('attributes.systemNoDelete') : undefined, onClick: onDelete },
    ]
    return <Toolbar actions={actions} />
}

export default AttributesToolbar
