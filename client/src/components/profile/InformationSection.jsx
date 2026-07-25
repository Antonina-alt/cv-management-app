import { useCallback, useMemo, useRef, useState } from 'react'
import { Button, Modal } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { ConflictError } from '../../api/http.js'
import { createAttributeValue, deleteAttributeValue, updateAttributeValue } from '../../api/profile.js'
import { useSelection } from '../../hooks/useSelection.js'
import { pickValueFields } from '../../lib/attributeValueFields.js'
import AttributeList from '../attributes/AttributeList.jsx'
import CommonDataTable from '../common/CommonDataTable.jsx'
import { TABLE_MODE } from '../../lib/tableMode.js'
import ErrorAlert from '../common/ErrorAlert.jsx'
import Toolbar from '../common/Toolbar.jsx'
import AttributeValueField from './AttributeValueField.jsx'

const AttributeValueCell = ({ value, attribute, onSave }) => {
    const [local, setLocal] = useState(value)
    const change = (fields) => setLocal((current) => {
        const updated = { ...current, ...fields }
        onSave(updated)
        return updated
    })
    return <AttributeValueField attribute={attribute} value={local} onChange={change} />
}

const InformationSection = ({ candidateId, initialValues, autosave, onConflict }) => {
    const { t } = useTranslation()
    const [values, setValues] = useState(initialValues)
    const selection = useSelection()
    const picker = useSelection()
    const [showPicker, setShowPicker] = useState(false)
    const [banner, setBanner] = useState(null)
    const versions = useRef(new Map(initialValues.map(({ id, version }) => [id, version])))
    const closePicker = () => {
        setShowPicker(false)
        picker.clear()
    }
    const flushValue = useCallback(async (valueId, updated) => {
        try {
            const saved = await updateAttributeValue(candidateId, valueId, { ...pickValueFields(updated), version: versions.current.get(valueId) })
            versions.current.set(valueId, saved.version)
            setBanner(null)
        } catch (error) {
            error instanceof ConflictError ? onConflict?.(error) : setBanner(error)
        }
    }, [candidateId, onConflict])
    const addAttributes = async () => {
        try {
            const created = await Promise.all(picker.items.map(({ id }) => createAttributeValue(candidateId, { attributeId: id })))
            created.forEach(({ id, version }) => versions.current.set(id, version))
            setValues((current) => [...current, ...created])
            setBanner(null)
        } catch (error) {
            setBanner(error)
        }
        closePicker()
    }
    const removeValues = async () => {
        try {
            await Promise.all(selection.items.map(({ id }) => deleteAttributeValue(candidateId, id, versions.current.get(id))))
            const removedIds = new Set(selection.ids)
            selection.items.forEach(({ id }) => versions.current.delete(id))
            setValues((current) => current.filter(({ id }) => !removedIds.has(id)))
            setBanner(null)
        } catch (error) {
            error instanceof ConflictError ? onConflict?.(error) : setBanner(error)
        }
        selection.clear()
    }
    const columns = useMemo(() => [
        { data: (row) => row.attribute.name, title: t('profile.info.attribute') },
        { data: (row) => row.attribute.category?.name ?? '', title: t('profile.info.category') },
        { data: null, title: t('profile.info.value'), orderable: false, render: (_, row) => <AttributeValueCell value={row} attribute={row.attribute} onSave={(updated) => autosave.schedule(`attr:${row.id}`, () => flushValue(row.id, updated))} /> },
    ], [autosave, flushValue, t])
    const actions = [
        { key: 'add', label: t('profile.info.add'), variant: 'primary', onClick: () => setShowPicker(true) },
        { key: 'remove', label: t('profile.info.remove'), variant: 'outline-danger', disabled: !selection.items.length, onClick: removeValues },
    ]
    return (
        <div>
            <ErrorAlert error={banner} onClose={() => setBanner(null)} />
            <Toolbar actions={actions} />
            <CommonDataTable data={values} columns={columns} emptyMessage={t('profile.info.empty')} mode={TABLE_MODE.MULTIPLE} selectedIds={selection.ids} onToggleRow={selection.toggle} onToggleAll={selection.toggleAll} getRowLabel={(row) => row.attribute.name} />
            <Modal show={showPicker} onHide={closePicker} size="lg">
                <Modal.Header closeButton><Modal.Title>{t('profile.info.pickerTitle')}</Modal.Title></Modal.Header>
                <Modal.Body><AttributeList selectedIds={picker.ids} onToggleRow={picker.toggle} onToggleAll={picker.toggleAll} excludeIds={values.map(({ attributeId }) => attributeId)} excludeSystem /></Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={closePicker}>{t('profile.info.cancel')}</Button>
                    <Button variant="primary" disabled={!picker.items.length} onClick={addAttributes}>{t('profile.info.add')}</Button>
                </Modal.Footer>
            </Modal>
        </div>
    )
}

export default InformationSection
