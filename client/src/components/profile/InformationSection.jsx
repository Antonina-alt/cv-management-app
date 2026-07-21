import { useState } from 'react'
import { Button, Modal, Table } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import AttributeList from '../attributes/AttributeList.jsx'
import AttributeValueField from './AttributeValueField.jsx'
import { createAttributeValue, deleteAttributeValue, updateAttributeValue } from '../../api/profile.js'
import { ConflictError } from '../../api/http.js'

const InformationSection = ({ candidateId, initialValues, autosave, onConflict }) => {
    const { t } = useTranslation()
    const [values, setValues] = useState(initialValues)
    const [selectedIds, setSelectedIds] = useState([])
    const [pickerAttrs, setPickerAttrs] = useState([])
    const [showPicker, setShowPicker] = useState(false)
    const [banner, setBanner] = useState(null)

    const existingAttributeIds = values.map((v) => v.attributeId)

    const flushValue = async (updated) => {
        try {
            const saved = await updateAttributeValue(candidateId, updated.id, {
                stringValue: updated.stringValue,
                numberValue: updated.numberValue,
                booleanValue: updated.booleanValue,
                dateValue: updated.dateValue,
                dateFrom: updated.dateFrom,
                dateTo: updated.dateTo,
                imageUrl: updated.imageUrl,
                selectedOptionId: updated.selectedOptionId,
                version: updated.version,
            })
            setValues((prev) => prev.map((v) => (v.id === saved.id ? saved : v)))
            setBanner(null)
        } catch (err) {
            if (err instanceof ConflictError) {
                onConflict?.()
            } else {
                setBanner(err.message)
            }
        }
    }

    const handleFieldChange = (value, fields) => {
        const updated = { ...value, ...fields }
        setValues((prev) => prev.map((v) => (v.id === value.id ? updated : v)))
        autosave.schedule(`attr:${value.id}`, () => flushValue(updated))
    }

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

    const handleAddAttributes = async () => {
        try {
            const created = await Promise.all(
                pickerAttrs.map((attr) => createAttributeValue(candidateId, { attributeId: attr.id })),
            )
            setValues((prev) => [...prev, ...created])
            setBanner(null)
            closePicker()
        } catch (err) {
            setBanner(err.message)
            closePicker()
        }
    }

    const handleRemoveSelected = async () => {
        const toRemove = values.filter((v) => selectedIds.includes(v.id))
        try {
            await Promise.all(toRemove.map((v) => deleteAttributeValue(candidateId, v.id, v.version)))
            setValues((prev) => prev.filter((v) => !selectedIds.includes(v.id)))
            setSelectedIds([])
            setBanner(null)
        } catch (err) {
            if (err instanceof ConflictError) {
                onConflict?.()
            } else {
                setBanner(err.message)
            }
            setSelectedIds([])
        }
    }

    const toggleRow = (id) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
    }

    return (
        <div>
            {banner && (
                <div className="alert alert-warning alert-dismissible" role="alert">
                    {banner}
                    <button type="button" className="btn-close" onClick={() => setBanner(null)} />
                </div>
            )}

            <div className="d-flex gap-2 mb-3">
                <Button variant="primary" onClick={() => setShowPicker(true)}>
                    {t('profile.info.add')}
                </Button>
                <Button variant="outline-danger" disabled={selectedIds.length === 0} onClick={handleRemoveSelected}>
                    {t('profile.info.remove')}
                </Button>
            </div>

            {values.length === 0 ? (
                <p className="text-muted">{t('profile.info.empty')}</p>
            ) : (
                <Table hover responsive>
                    <thead>
                        <tr>
                            <th style={{ width: 32 }} />
                            <th>{t('profile.info.attribute')}</th>
                            <th>{t('profile.info.category')}</th>
                            <th>{t('profile.info.value')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {values.map((value) => (
                            <tr key={value.id}>
                                <td>
                                    <input
                                        type="checkbox"
                                        className="form-check-input"
                                        checked={selectedIds.includes(value.id)}
                                        onChange={() => toggleRow(value.id)}
                                        aria-label={value.attribute.name}
                                    />
                                </td>
                                <td>{value.attribute.name}</td>
                                <td>{value.attribute.category?.name}</td>
                                <td>
                                    <AttributeValueField
                                        attribute={value.attribute}
                                        value={value}
                                        onChange={(fields) => handleFieldChange(value, fields)}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            )}

            <Modal show={showPicker} onHide={closePicker} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>{t('profile.info.pickerTitle')}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <AttributeList
                        selectedIds={pickerAttrs.map((a) => a.id)}
                        onToggleRow={togglePickerAttr}
                        onToggleAll={togglePickerAll}
                        excludeIds={existingAttributeIds}
                        excludeSystem
                    />
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={closePicker}>
                        {t('profile.info.cancel')}
                    </Button>
                    <Button variant="primary" disabled={pickerAttrs.length === 0} onClick={handleAddAttributes}>
                        {t('profile.info.add')}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    )
}

export default InformationSection
