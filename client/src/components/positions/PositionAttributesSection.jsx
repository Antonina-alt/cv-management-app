import { useMemo, useState } from 'react'
import { Button, Modal } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { ConflictError } from '../../api/http.js'
import { useSelection } from '../../hooks/useSelection.js'
import { TABLE_MODE } from '../../lib/tableMode.js'
import AttributeList from '../attributes/AttributeList.jsx'
import AttributeTypeBadge from '../attributes/AttributeTypeBadge.jsx'
import CommonDataTable from '../common/CommonDataTable.jsx'
import ErrorAlert from '../common/ErrorAlert.jsx'
import Toolbar from '../common/Toolbar.jsx'

const sectionTableOptions = { paging: false, info: false, ordering: false }
const getPositionAttributeId = (item) => item.attributeId

const PositionAttributesSection = ({ attributes, onSave, disabled }) => {
    const { t } = useTranslation()
    const selection = useSelection(getPositionAttributeId)
    const picker = useSelection()
    const [showPicker, setShowPicker] = useState(false)
    const [error, setError] = useState(null)
    const existingIds = attributes.map(({ attributeId }) => attributeId)
    const closePicker = () => {
        setShowPicker(false)
        setError(null)
        picker.clear()
    }
    const save = async (attributeIds, onSuccess) => {
        try {
            await onSave(attributeIds)
            setError(null)
            onSuccess()
        } catch (requestError) {
            if (requestError instanceof ConflictError) return closePicker()
            setError(requestError)
        }
    }
    const add = () => save([...existingIds, ...picker.ids], closePicker)
    const remove = () => save(existingIds.filter((id) => !selection.ids.includes(id)), selection.clear)
    const columns = useMemo(() => [
        { data: (row) => row.attribute.name, title: t('attributes.table.name') },
        { data: (row) => row.attribute.category?.name ?? '', title: t('attributes.table.category') },
        { data: (row) => row.attribute.type, title: t('attributes.table.type'), render: (_, row) => <AttributeTypeBadge type={row.attribute.type} /> },
    ], [t])
    const actions = [
        { key: 'add', label: t('positions.attributesSection.add'), variant: 'primary', size: 'sm', onClick: () => setShowPicker(true) },
        { key: 'remove', label: t('positions.attributesSection.remove'), variant: 'outline-danger', size: 'sm', disabled: !selection.items.length, onClick: remove },
    ]
    return (
        <div>
            {!showPicker && <ErrorAlert error={error} onClose={() => setError(null)} />}
            {!disabled && <Toolbar actions={actions} />}
            <CommonDataTable data={attributes} columns={columns} emptyMessage={t('positions.attributesSection.empty')} mode={disabled ? TABLE_MODE.READ_ONLY : TABLE_MODE.MULTIPLE} selectedIds={selection.ids} onToggleRow={selection.toggle} onToggleAll={selection.toggleAll} getRowId={getPositionAttributeId} getRowLabel={(row) => row.attribute.name} options={sectionTableOptions} />
            <Modal show={showPicker} onHide={closePicker} size="lg">
                <Modal.Header closeButton><Modal.Title>{t('positions.attributesSection.pickerTitle')}</Modal.Title></Modal.Header>
                <Modal.Body><ErrorAlert error={error} /><AttributeList selectedIds={picker.ids} onToggleRow={picker.toggle} onToggleAll={picker.toggleAll} excludeIds={existingIds} /></Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={closePicker}>{t('positions.form.cancel')}</Button>
                    <Button variant="primary" disabled={!picker.items.length} onClick={add}>{t('positions.attributesSection.add')}</Button>
                </Modal.Footer>
            </Modal>
        </div>
    )
}

export default PositionAttributesSection
