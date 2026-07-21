import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import ImageUploader from '../upload/ImageUploader.jsx'
import MarkdownField from './MarkdownField.jsx'
import { toDateInputValue } from '../../lib/dateInput.js'

// Renders the correct input for one CandidateAttributeValue based on attribute.type.
// Calls onChange with only the typed field(s) relevant to that type.
const AttributeValueField = ({ attribute, value, onChange, disabled }) => {
    const { t } = useTranslation()

    switch (attribute.type) {
        case 'STRING':
            return (
                <Form.Control
                    value={value.stringValue ?? ''}
                    disabled={disabled}
                    onChange={(e) => onChange({ stringValue: e.target.value })}
                />
            )
        case 'TEXT':
            return (
                <MarkdownField
                    value={value.stringValue}
                    disabled={disabled}
                    onChange={(stringValue) => onChange({ stringValue })}
                />
            )
        case 'IMAGE':
            return (
                <ImageUploader
                    value={value.imageUrl}
                    disabled={disabled}
                    onUpload={(imageUrl) => onChange({ imageUrl })}
                    onRemove={() => onChange({ imageUrl: null })}
                />
            )
        case 'NUMBER':
            return (
                <Form.Control
                    type="number"
                    value={value.numberValue ?? ''}
                    disabled={disabled}
                    onChange={(e) => onChange({ numberValue: e.target.value })}
                />
            )
        case 'DATE':
            return (
                <Form.Control
                    type="date"
                    value={toDateInputValue(value.dateValue)}
                    disabled={disabled}
                    onChange={(e) => onChange({ dateValue: e.target.value })}
                />
            )
        case 'DATE_RANGE':
            return (
                <div className="d-flex gap-2">
                    <Form.Control
                        type="date"
                        value={toDateInputValue(value.dateFrom)}
                        disabled={disabled}
                        onChange={(e) => onChange({ dateFrom: e.target.value, dateTo: value.dateTo })}
                    />
                    <Form.Control
                        type="date"
                        value={toDateInputValue(value.dateTo)}
                        disabled={disabled}
                        onChange={(e) => onChange({ dateFrom: value.dateFrom, dateTo: e.target.value })}
                    />
                </div>
            )
        case 'BOOLEAN':
            return (
                <Form.Check
                    type="checkbox"
                    checked={Boolean(value.booleanValue)}
                    disabled={disabled}
                    onChange={(e) => onChange({ booleanValue: e.target.checked })}
                />
            )
        case 'SELECT':
            return (
                <Form.Select
                    value={value.selectedOptionId ?? ''}
                    disabled={disabled}
                    onChange={(e) => onChange({ selectedOptionId: e.target.value || null })}
                >
                    <option value="">{t('profile.info.selectPlaceholder')}</option>
                    {attribute.options?.map((o) => (
                        <option key={o.id} value={o.id}>{o.label}</option>
                    ))}
                </Form.Select>
            )
        default:
            return null
    }
}

export default AttributeValueField
