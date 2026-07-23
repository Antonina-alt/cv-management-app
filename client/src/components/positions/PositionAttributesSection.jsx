import { useState } from 'react'
import { Button, Modal, Table } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import AttributeList from '../attributes/AttributeList.jsx'
import AttributeTypeBadge from '../attributes/AttributeTypeBadge.jsx'
import { useIdSelection } from '../../hooks/useIdSelection.js'
import { useObjectSelection } from '../../hooks/useObjectSelection.js'

const PositionAttributesSection = ({ attributes, onSave, disabled }) => {
    const { t } = useTranslation()
    const selection = useIdSelection()
    const picker = useObjectSelection()
    const [showPicker, setShowPicker] = useState(false)

    const existingIds = attributes.map((a) => a.attributeId)

    const closePicker = () => {
        setShowPicker(false)
        picker.clear()
    }

    const handleAdd = async () => {
        const nextIds = [...existingIds, ...picker.items.map((a) => a.id)]
        await onSave(nextIds)
        closePicker()
    }

    const handleRemove = async () => {
        const nextIds = existingIds.filter((id) => !selection.ids.includes(id))
        await onSave(nextIds)
        selection.setIds([])
    }

    return (
        <div>
            {!disabled && (
                <div className="d-flex gap-2 mb-3">
                    <Button variant="primary" size="sm" onClick={() => setShowPicker(true)}>
                        {t('positions.attributesSection.add')}
                    </Button>
                    <Button variant="outline-danger" size="sm" disabled={selection.ids.length === 0} onClick={handleRemove}>
                        {t('positions.attributesSection.remove')}
                    </Button>
                </div>
            )}

            {attributes.length === 0 ? (
                <p className="text-muted">{t('positions.attributesSection.empty')}</p>
            ) : (
                <Table hover responsive>
                    <thead>
                        <tr>
                            {!disabled && <th />}
                            <th>{t('attributes.table.name')}</th>
                            <th>{t('attributes.table.category')}</th>
                            <th>{t('attributes.table.type')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {attributes.map((link) => (
                            <tr
                                key={link.attributeId}
                                className={!disabled && selection.ids.includes(link.attributeId) ? 'table-active' : ''}
                                style={disabled ? undefined : { cursor: 'pointer' }}
                                onClick={disabled ? undefined : () => selection.toggle(link.attributeId)}
                            >
                                {!disabled && (
                                    <td onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            className="form-check-input"
                                            checked={selection.ids.includes(link.attributeId)}
                                            onChange={() => selection.toggle(link.attributeId)}
                                        />
                                    </td>
                                )}
                                <td>{link.attribute.name}</td>
                                <td>{link.attribute.category?.name}</td>
                                <td><AttributeTypeBadge type={link.attribute.type} /></td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            )}

            <Modal show={showPicker} onHide={closePicker} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>{t('positions.attributesSection.pickerTitle')}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <AttributeList
                        selectedIds={picker.items.map((a) => a.id)}
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
