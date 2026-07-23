import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Modal } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import DataTable from 'datatables.net-react'
import DT from 'datatables.net-bs5'
import 'datatables.net-bs5/css/dataTables.bootstrap5.css'
import AttributeList from '../attributes/AttributeList.jsx'
import AttributeValueField from './AttributeValueField.jsx'
import { createAttributeValue, deleteAttributeValue, updateAttributeValue } from '../../api/profile.js'
import { ConflictError } from '../../api/http.js'
import { useIdSelection } from '../../hooks/useIdSelection.js'
import { wireCheckboxCell } from '../../lib/dataTableCheckbox.js'
import { pickValueFields } from '../../lib/attributeValueFields.js'
import { useObjectSelection } from '../../hooks/useObjectSelection.js'

// eslint-disable-next-line react-hooks/rules-of-hooks -- DataTables static registration, not a React hook
DataTable.use(DT)

const AttributeValueCell = ({ value, attribute, onSave }) => {
    const [local, setLocal] = useState(value)

    const handleChange = (fields) => {
        setLocal((prev) => {
            const updated = { ...prev, ...fields }
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
    const dtRef = useRef(null)
    const headerCheckboxRef = useRef(null)
    const onToggleRowRef = useRef(null)
    const onToggleAllRef = useRef(null)
    const valuesRef = useRef(values)
    const versionsRef = useRef(new Map(initialValues.map((v) => [v.id, v.version])))

    const existingAttributeIds = values.map((v) => v.attributeId)

    useEffect(() => {
        onToggleRowRef.current = (row) => selection.toggle(row.id)
        onToggleAllRef.current = selection.toggleAll
        valuesRef.current = values
    })

    const flushValue = async (valueId, updated) => {
        try {
            const saved = await updateAttributeValue(candidateId, valueId, {
                ...pickValueFields(updated),
                version: versionsRef.current.get(valueId),
            })
            versionsRef.current.set(valueId, saved.version)
            setBanner(null)
        } catch (err) {
            if (err instanceof ConflictError) onConflict?.()
            else setBanner(err.message)
        }
    }

    const closePicker = () => {
        setShowPicker(false)
        picker.clear()
    }

    const handleAddAttributes = async () => {
        try {
            const created = await Promise.all(
                picker.items.map((attr) => createAttributeValue(candidateId, { attributeId: attr.id })),
            )
            created.forEach((v) => versionsRef.current.set(v.id, v.version))
            setValues((prev) => [...prev, ...created])
            setBanner(null)
            closePicker()
        } catch (err) {
            setBanner(err.message)
            closePicker()
        }
    }

    const handleRemoveSelected = async () => {
        const toRemove = values.filter((v) => selection.ids.includes(v.id))
        try {
            await Promise.all(toRemove.map((v) => deleteAttributeValue(candidateId, v.id, versionsRef.current.get(v.id))))
            toRemove.forEach((v) => versionsRef.current.delete(v.id))
            setValues((prev) => prev.filter((v) => !selection.ids.includes(v.id)))
            selection.setIds([])
            setBanner(null)
        } catch (err) {
            if (err instanceof ConflictError) onConflict?.()
            else setBanner(err.message)
            selection.setIds([])
        }
    }

    const columns = useMemo(() => [
        { data: null, title: '', orderable: false, className: 'dt-checkbox-column', width: '1%' },
        { data: (row) => row.attribute.name, title: t('profile.info.attribute') },
        { data: (row) => row.attribute.category?.name ?? '', title: t('profile.info.category') },
        { data: null, title: t('profile.info.value'), orderable: false },
    ], [t])

    const slots = useMemo(() => ({
        3: (data, row) => (
            <AttributeValueCell
                value={row}
                attribute={row.attribute}
                onSave={(updated) => autosave.schedule(`attr:${row.id}`, () => flushValue(row.id, updated))}
            />
        ),
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [autosave])

    const options = useMemo(() => ({
        searching: false,
        autoWidth: false,
        language: { emptyTable: t('profile.info.empty') },
        createdRow: (row, data) => {
            wireCheckboxCell(row.cells[0], data.attribute.name, () => onToggleRowRef.current?.(data))
        },
        initComplete: function initComplete() {
            const headerCell = this.api().table().header().querySelector('th')
            wireCheckboxCell(headerCell, t('attributes.selectAll'), (checked) => onToggleAllRef.current?.(valuesRef.current, checked))
            headerCheckboxRef.current = headerCell.querySelector('input')
        },
    }), [t])

    useEffect(() => {
        const api = dtRef.current?.dt()
        if (!api) return
        api.rows().every(function syncSelected() {
            const node = this.node()
            if (!node) return
            const isSelected = selection.ids.includes(this.data().id)
            node.classList.toggle('table-active', isSelected)
            const checkbox = node.querySelector('input[type="checkbox"]')
            if (checkbox) checkbox.checked = isSelected
        })

        const headerCheckbox = headerCheckboxRef.current
        if (headerCheckbox) {
            const selectedCount = values.filter((v) => selection.ids.includes(v.id)).length
            headerCheckbox.checked = values.length > 0 && selectedCount === values.length
            headerCheckbox.indeterminate = selectedCount > 0 && selectedCount < values.length
        }
    }, [selection.ids, values])

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
                <Button variant="outline-danger" disabled={selection.ids.length === 0} onClick={handleRemoveSelected}>
                    {t('profile.info.remove')}
                </Button>
            </div>

            <DataTable
                ref={dtRef}
                data={values}
                columns={columns}
                slots={slots}
                options={options}
                className="table table-hover"
            />

            <Modal show={showPicker} onHide={closePicker} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>{t('profile.info.pickerTitle')}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <AttributeList
                        selectedIds={picker.items.map((a) => a.id)}
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
