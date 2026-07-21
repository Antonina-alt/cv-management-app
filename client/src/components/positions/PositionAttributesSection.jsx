import { useState } from 'react'
import { Button, Modal, Table } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import AttributeList from '../attributes/AttributeList.jsx'
import AttributeTypeBadge from '../attributes/AttributeTypeBadge.jsx'

// Manages a position's PositionAttribute links: table + Add/Remove toolbar (no row buttons),
// the "add" modal reuses AttributeList in picker mode exactly like InformationSection.jsx does
// for candidate profiles.
const PositionAttributesSection = ({ attributes, onSave, disabled }) => {
    const { t } = useTranslation()
    const [selectedIds, setSelectedIds] = useState([])
    const [showPicker, setShowPicker] = useState(false)
    const [pickerAttrs, setPickerAttrs] = useState([])

    const existingIds = attributes.map((a) => a.attributeId)

    const togglePickerAttr = (attr) => {
        setPickerAttrs((prev) => (
            prev.some((a) => a.id === attr.id) ? prev.filter((a) => a.id !== attr.id) : [...prev, attr]
        ))
    }

    const togglePickerAll = (attrs, selectAll) => {
        setPickerAttrs((prev) => {
            if (selectAll) {
                const existing = new Set(prev.map((a) => a.id))
                return [...prev, ...attrs.filter((a) => !existing.has(a.id))]
            }
            const removed = new Set(attrs.map((a) => a.id))
            return prev.filter((a) => !removed.has(a.id))
        })
    }

    const closePicker = () => {
        setShowPicker(false)
        setPickerAttrs([])
    }

    const handleAdd = async () => {
        const nextIds = [...existingIds, ...pickerAttrs.map((a) => a.id)]
        await onSave(nextIds)
        closePicker()
    }

    const handleRemove = async () => {
        const nextIds = existingIds.filter((id) => !selectedIds.includes(id))
        await onSave(nextIds)
        setSelectedIds([])
    }

    const toggleSelected = (attributeId) => {
        setSelectedIds((prev) => (prev.includes(attributeId) ? prev.filter((id) => id !== attributeId) : [...prev, attributeId]))
    }

    return (
        <div>
            <div className="d-flex gap-2 mb-3">
                <Button variant="primary" size="sm" disabled={disabled} onClick={() => setShowPicker(true)}>
                    {t('positions.attributesSection.add')}
                </Button>
                <Button
                    variant="outline-danger"
                    size="sm"
                    disabled={disabled || selectedIds.length === 0}
                    onClick={handleRemove}
                >
                    {t('positions.attributesSection.remove')}
                </Button>
            </div>

            {attributes.length === 0 ? (
                <p className="text-muted">{t('positions.attributesSection.empty')}</p>
            ) : (
                <Table hover responsive>
                    <thead>
                        <tr>
                            <th />
                            <th>{t('attributes.table.name')}</th>
                            <th>{t('attributes.table.category')}</th>
                            <th>{t('attributes.table.type')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {attributes.map((link) => (
                            <tr
                                key={link.attributeId}
                                className={selectedIds.includes(link.attributeId) ? 'table-active' : ''}
                                style={{ cursor: 'pointer' }}
                                onClick={() => toggleSelected(link.attributeId)}
                            >
                                <td onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="checkbox"
                                        className="form-check-input"
                                        checked={selectedIds.includes(link.attributeId)}
                                        onChange={() => toggleSelected(link.attributeId)}
                                    />
                                </td>
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
                        selectedIds={pickerAttrs.map((a) => a.id)}
                        onToggleRow={togglePickerAttr}
                        onToggleAll={togglePickerAll}
                        excludeIds={existingIds}
                    />
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={closePicker}>
                        {t('positions.form.cancel')}
                    </Button>
                    <Button variant="primary" disabled={pickerAttrs.length === 0} onClick={handleAdd}>
                        {t('positions.attributesSection.add')}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    )
}

export default PositionAttributesSection
