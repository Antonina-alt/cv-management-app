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

// eslint-disable-next-line react-hooks/rules-of-hooks -- DataTables static registration, not a React hook
DataTable.use(DT)

// Owns its own edit state, initialised once from the row it was mounted with. This keeps
// keystrokes from touching InformationSection's `values` (and therefore the DataTable's `data`
// prop) on every change — that array only changes on add/remove, so typing never triggers a
// full table redraw/refocus.
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
    const [selectedIds, setSelectedIds] = useState([])
    const [pickerAttrs, setPickerAttrs] = useState([])
    const [showPicker, setShowPicker] = useState(false)
    const [banner, setBanner] = useState(null)
    const dtRef = useRef(null)
    const headerCheckboxRef = useRef(null)
    const onToggleRowRef = useRef(null)
    const onToggleAllRef = useRef(null)
    const valuesRef = useRef(values)
    const versionsRef = useRef(new Map(initialValues.map((v) => [v.id, v.version])))

    const existingAttributeIds = values.map((v) => v.attributeId)

    const toggleRow = (id) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
    }

    const toggleAll = (rows, selectAll) => {
        setSelectedIds((prev) => {
            if (selectAll) {
                const existing = new Set(prev)
                return [...prev, ...rows.map((v) => v.id).filter((id) => !existing.has(id))]
            }
            const removed = new Set(rows.map((v) => v.id))
            return prev.filter((id) => !removed.has(id))
        })
    }

    useEffect(() => {
        onToggleRowRef.current = (row) => toggleRow(row.id)
        onToggleAllRef.current = toggleAll
        valuesRef.current = values
    })

    const flushValue = async (valueId, updated) => {
        try {
            const saved = await updateAttributeValue(candidateId, valueId, {
                stringValue: updated.stringValue,
                numberValue: updated.numberValue,
                booleanValue: updated.booleanValue,
                dateValue: updated.dateValue,
                dateFrom: updated.dateFrom,
                dateTo: updated.dateTo,
                imageUrl: updated.imageUrl,
                selectedOptionId: updated.selectedOptionId,
                version: versionsRef.current.get(valueId),
            })
            versionsRef.current.set(valueId, saved.version)
            setBanner(null)
        } catch (err) {
            if (err instanceof ConflictError) {
                onConflict?.()
            } else {
                setBanner(err.message)
            }
        }
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
        const toRemove = values.filter((v) => selectedIds.includes(v.id))
        try {
            await Promise.all(toRemove.map((v) => deleteAttributeValue(candidateId, v.id, versionsRef.current.get(v.id))))
            toRemove.forEach((v) => versionsRef.current.delete(v.id))
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
            const checkboxCell = row.cells[0]
            checkboxCell.style.width = '1px'
            checkboxCell.style.whiteSpace = 'nowrap'
            const checkbox = document.createElement('input')
            checkbox.type = 'checkbox'
            checkbox.className = 'form-check-input'
            checkbox.setAttribute('aria-label', data.attribute.name)
            checkbox.onclick = (e) => {
                e.stopPropagation()
                onToggleRowRef.current?.(data)
            }
            checkboxCell.replaceChildren(checkbox)
        },
        initComplete: function initComplete() {
            const headerCell = this.api().table().header().querySelector('th')
            headerCell.style.width = '1px'
            headerCell.style.whiteSpace = 'nowrap'
            const checkbox = document.createElement('input')
            checkbox.type = 'checkbox'
            checkbox.className = 'form-check-input'
            checkbox.setAttribute('aria-label', t('attributes.selectAll'))
            checkbox.onclick = (e) => {
                e.stopPropagation()
                onToggleAllRef.current?.(valuesRef.current, e.target.checked)
            }
            headerCell.replaceChildren(checkbox)
            headerCheckboxRef.current = checkbox
        },
    }), [t])

    useEffect(() => {
        const api = dtRef.current?.dt()
        if (!api) return
        api.rows().every(function syncSelected() {
            const node = this.node()
            if (!node) return
            const isSelected = selectedIds.includes(this.data().id)
            node.classList.toggle('table-active', isSelected)
            const checkbox = node.querySelector('input[type="checkbox"]')
            if (checkbox) checkbox.checked = isSelected
        })

        const headerCheckbox = headerCheckboxRef.current
        if (headerCheckbox) {
            const selectedCount = values.filter((v) => selectedIds.includes(v.id)).length
            headerCheckbox.checked = values.length > 0 && selectedCount === values.length
            headerCheckbox.indeterminate = selectedCount > 0 && selectedCount < values.length
        }
    }, [selectedIds, values])

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
