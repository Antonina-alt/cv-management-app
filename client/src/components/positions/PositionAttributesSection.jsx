import { useMemo, useState } from 'react'
import { Button, Modal } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import AttributeList from '../attributes/AttributeList.jsx'
import AttributeTypeBadge from '../attributes/AttributeTypeBadge.jsx'
import CommonDataTable, { TABLE_MODE } from '../common/CommonDataTable.jsx'
import { useIdSelection } from '../../hooks/useIdSelection.js'
import { useObjectSelection } from '../../hooks/useObjectSelection.js'

const sectionTableOptions = { paging: false, info: false, ordering: false }

const PositionAttributesSection = ({ attributes, onSave, disabled }) => {
    const { t } = useTranslation()
    const selection = useIdSelection()
    const picker = useObjectSelection()
    const [showPicker, setShowPicker] = useState(false)

    const existingIds = attributes.map((item) => item.attributeId)

    const closePicker = () => {
        setShowPicker(false)
        picker.clear()
    }

    const handleAdd = async () => {
        const nextIds = [...existingIds, ...picker.items.map((attribute) => attribute.id)]
        await onSave(nextIds)
        closePicker()
    }

    const handleRemove = async () => {
        const nextIds = existingIds.filter((id) => !selection.ids.includes(id))
        await onSave(nextIds)
        selection.setIds([])
    }

    const columns = useMemo(() => [
        { data: (row) => row.attribute.name, title: t('attributes.table.name') },
        { data: (row) => row.attribute.category?.name ?? '', title: t('attributes.table.category') },
        {
            data: (row) => row.attribute.type,
            title: t('attributes.table.type'),
            render: (data, row) => <AttributeTypeBadge type={row.attribute.type} />,
        },
    ], [t])

    const handleToggleAll = (rows, checked) => {
        selection.toggleAll(rows.map((row) => ({ id: row.attributeId })), checked)
    }

    return (
        <div>
            {!disabled && (
                <div className="d-flex flex-wrap gap-2 mb-3">
                    <Button variant="primary" size="sm" onClick={() => setShowPicker(true)}>
                        {t('positions.attributesSection.add')}
                    </Button>
                    <Button variant="outline-danger" size="sm" disabled={selection.ids.length === 0} onClick={handleRemove}>
                        {t('positions.attributesSection.remove')}
                    </Button>
                </div>
            )}

            <CommonDataTable
                data={attributes}
                columns={columns}
                emptyMessage={t('positions.attributesSection.empty')}
                mode={disabled ? TABLE_MODE.READ_ONLY : TABLE_MODE.MULTIPLE}
                selectedIds={selection.ids}
                onToggleRow={(row) => selection.toggle(row.attributeId)}
                onToggleAll={handleToggleAll}
                getRowId={(row) => row.attributeId}
                getRowLabel={(row) => row.attribute.name}
                options={sectionTableOptions}
            />

            <Modal show={showPicker} onHide={closePicker} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>{t('positions.attributesSection.pickerTitle')}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <AttributeList
                        selectedIds={picker.items.map((attribute) => attribute.id)}
                        onToggleRow={picker.toggle}
                        onToggleAll={picker.toggleAll}
                        excludeIds={existingIds}
                    />
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={closePicker}>
                        {t('positions.form.cancel')}
                    </Button>
                    <Button variant="primary" disabled={picker.items.length === 0} onClick={handleAdd}>
                        {t('positions.attributesSection.add')}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    )
}

export default PositionAttributesSection
