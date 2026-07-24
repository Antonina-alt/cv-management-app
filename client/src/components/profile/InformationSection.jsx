import { useCallback, useMemo, useRef, useState } from 'react'
import { Button, Modal } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import AttributeList from '../attributes/AttributeList.jsx'
import CommonDataTable, { TABLE_MODE } from '../common/CommonDataTable.jsx'
import AttributeValueField from './AttributeValueField.jsx'
import { createAttributeValue, deleteAttributeValue, updateAttributeValue } from '../../api/profile.js'
import { ConflictError } from '../../api/http.js'
import { useIdSelection } from '../../hooks/useIdSelection.js'
import { pickValueFields } from '../../lib/attributeValueFields.js'
import { useObjectSelection } from '../../hooks/useObjectSelection.js'

const AttributeValueCell = ({ value, attribute, onSave }) => {
    const [local, setLocal] = useState(value)

    const handleChange = (fields) => {
        setLocal((previous) => {
            const updated = { ...previous, ...fields }
            onSave(updated)
            return updated
        })
    }

    return <AttributeValueField attribute={attribute} value={local} onChange={handleChange} />
}

const InformationSection = ({ candidateId, initialValues, autosave, onConflict }) => {
    const { t } = useTranslation()
    const [values, setValues] = useState(initialValues)
    const selection = useIdSelection()
    const picker = useObjectSelection()
    const [showPicker, setShowPicker] = useState(false)
    const [banner, setBanner] = useState(null)
    const versionsRef = useRef(new Map(initialValues.map((value) => [value.id, value.version])))

    const existingAttributeIds = values.map((value) => value.attributeId)

    const flushValue = useCallback(async (valueId, updated) => {
        try {
            const saved = await updateAttributeValue(candidateId, valueId, {
                ...pickValueFields(updated),
                version: versionsRef.current.get(valueId),
            })
            versionsRef.current.set(valueId, saved.version)
            setBanner(null)
        } catch (error) {
            if (error instanceof ConflictError) onConflict?.()
            else setBanner(error.message)
        }
    }, [candidateId, onConflict])

    const closePicker = () => {
        setShowPicker(false)
        picker.clear()
    }

    const handleAddAttributes = async () => {
        try {
            const created = await Promise.all(
                picker.items.map((attribute) => createAttributeValue(candidateId, { attributeId: attribute.id })),
            )
            created.forEach((value) => versionsRef.current.set(value.id, value.version))
            setValues((previous) => [...previous, ...created])
            setBanner(null)
            closePicker()
        } catch (error) {
            setBanner(error.message)
            closePicker()
        }
    }

    const handleRemoveSelected = async () => {
        const valuesToRemove = values.filter((value) => selection.ids.includes(value.id))
        try {
            await Promise.all(valuesToRemove.map((value) => (
                deleteAttributeValue(candidateId, value.id, versionsRef.current.get(value.id))
            )))
            valuesToRemove.forEach((value) => versionsRef.current.delete(value.id))
            setValues((previous) => previous.filter((value) => !selection.ids.includes(value.id)))
            selection.setIds([])
            setBanner(null)
        } catch (error) {
            if (error instanceof ConflictError) onConflict?.()
            else setBanner(error.message)
            selection.setIds([])
        }
    }

    const columns = useMemo(() => [
        { data: (row) => row.attribute.name, title: t('profile.info.attribute') },
        { data: (row) => row.attribute.category?.name ?? '', title: t('profile.info.category') },
        {
            data: null,
            title: t('profile.info.value'),
            orderable: false,
            render: (data, row) => (
                <AttributeValueCell
                    value={row}
                    attribute={row.attribute}
                    onSave={(updated) => autosave.schedule(`attr:${row.id}`, () => flushValue(row.id, updated))}
                />
            ),
        },
    ], [autosave, flushValue, t])

    return (
        <div>
            {banner && (
                <div className="alert alert-warning alert-dismissible" role="alert">
                    {banner}
                    <button type="button" className="btn-close" onClick={() => setBanner(null)} />
                </div>
            )}

            <div className="d-flex flex-wrap gap-2 mb-3">
                <Button variant="primary" onClick={() => setShowPicker(true)}>
                    {t('profile.info.add')}
                </Button>
                <Button variant="outline-danger" disabled={selection.ids.length === 0} onClick={handleRemoveSelected}>
                    {t('profile.info.remove')}
                </Button>
            </div>

            <CommonDataTable
                data={values}
                columns={columns}
                emptyMessage={t('profile.info.empty')}
                mode={TABLE_MODE.MULTIPLE}
                selectedIds={selection.ids}
                onToggleRow={(row) => selection.toggle(row.id)}
                onToggleAll={selection.toggleAll}
                getRowLabel={(row) => row.attribute.name}
            />

            <Modal show={showPicker} onHide={closePicker} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>{t('profile.info.pickerTitle')}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <AttributeList
                        selectedIds={picker.items.map((attribute) => attribute.id)}
                        onToggleRow={picker.toggle}
                        onToggleAll={picker.toggleAll}
                        excludeIds={existingAttributeIds}
                        excludeSystem
                    />
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={closePicker}>
                        {t('profile.info.cancel')}
                    </Button>
                    <Button variant="primary" disabled={picker.items.length === 0} onClick={handleAddAttributes}>
                        {t('profile.info.add')}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    )
}

export default InformationSection
