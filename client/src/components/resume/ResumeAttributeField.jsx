import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AttributeValueField from '../profile/AttributeValueField.jsx'
import { isAttributeValueEmpty } from '../../lib/attributeEmpty.js'

const formatReadOnly = (attribute, value, t) => {
    switch (attribute.type) {
        case 'STRING':
        case 'TEXT':
            return value.stringValue || ''
        case 'NUMBER':
            return value.numberValue ?? ''
        case 'DATE':
            return value.dateValue ? new Date(value.dateValue).toLocaleDateString() : ''
        case 'DATE_RANGE': {
            const from = value.dateFrom ? new Date(value.dateFrom).toLocaleDateString() : ''
            const to = value.dateTo ? new Date(value.dateTo).toLocaleDateString() : ''
            return from || to ? `${from} – ${to}` : ''
        }
        case 'BOOLEAN':
            if (value.booleanValue === null || value.booleanValue === undefined) return ''
            return t(value.booleanValue ? 'positions.accessRules.true' : 'positions.accessRules.false')
        case 'SELECT':
            return value.selectedOption?.label || ''
        case 'IMAGE':
            return value.imageUrl ? (
                <img src={value.imageUrl} alt={attribute.name} className="img-thumbnail" style={{ maxWidth: 120, maxHeight: 120 }} />
            ) : ''
        default:
            return ''
    }
}

// Owns its own local edit state (seeded once from the value it was mounted with) so keystrokes
// don't ripple through the whole resume page — same pattern as InformationSection's
// AttributeValueCell. Reports emptiness up so the page can gate the Publish button.
const ResumeAttributeField = ({ attribute, value, editable, onSave, onEmptyChange }) => {
    const { t } = useTranslation()
    const [local, setLocal] = useState(value)

    const empty = isAttributeValueEmpty(attribute.type, local)

    useEffect(() => {
        onEmptyChange(value.attributeId, empty)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [empty])

    const handleChange = (fields) => {
        setLocal((prev) => {
            const updated = { ...prev, ...fields }
            onSave(updated)
            return updated
        })
    }

    return (
        <div className="mb-3">
            <div className={`fw-semibold mb-1 ${empty ? 'text-danger' : ''}`}>{attribute.name}</div>
            {editable ? (
                <div className={empty ? 'border border-danger rounded p-2' : ''}>
                    <AttributeValueField attribute={attribute} value={local} onChange={handleChange} />
                </div>
            ) : (
                <div className={`p-2 ${empty ? 'border border-danger rounded text-danger' : ''}`}>
                    {formatReadOnly(attribute, local, t) || <span className="text-muted">&mdash;</span>}
                </div>
            )}
        </div>
    )
}

export default ResumeAttributeField
