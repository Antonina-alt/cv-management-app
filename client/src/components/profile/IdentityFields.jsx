import { Form } from 'react-bootstrap'

const IdentityField = ({ label, value, disabled, invalid, onChange }) => (
    <Form.Group className="mb-3">
        <Form.Label className={invalid ? 'text-danger' : ''}>{label}</Form.Label>
        <Form.Control className={invalid ? 'border-danger' : ''} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
    </Form.Group>
)

const IdentityFields = ({ form, disabled = false, highlightEmpty = false, onChange, t }) => (
    <>
        <IdentityField label={t('profile.about.firstName')} value={form.firstName} disabled={disabled} invalid={highlightEmpty && !form.firstName} onChange={(value) => onChange('firstName', value)} />
        <IdentityField label={t('profile.about.lastName')} value={form.lastName} disabled={disabled} invalid={highlightEmpty && !form.lastName} onChange={(value) => onChange('lastName', value)} />
        <IdentityField label={t('profile.about.location')} value={form.location} disabled={disabled} invalid={highlightEmpty && !form.location} onChange={(value) => onChange('location', value)} />
    </>
)

export default IdentityFields
