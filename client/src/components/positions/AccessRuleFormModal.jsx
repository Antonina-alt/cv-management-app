import { useEffect, useMemo, useState } from 'react'
import { Button, Form, Modal } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { listAttributes } from '../../api/attributes.js'
import { toDateInputValue } from '../../lib/dateInput.js'

const OPERATORS_BY_TYPE = {
    STRING: ['EQUALS', 'NOT_EQUALS'],
    TEXT: ['EQUALS', 'NOT_EQUALS'],
    NUMBER: ['EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'GREATER_THAN_OR_EQUALS', 'LESS_THAN', 'LESS_THAN_OR_EQUALS'],
    DATE: ['EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'GREATER_THAN_OR_EQUALS', 'LESS_THAN', 'LESS_THAN_OR_EQUALS'],
    BOOLEAN: ['IS_TRUE', 'IS_FALSE'],
    SELECT: ['EQUALS', 'NOT_EQUALS'],
}

const initialFormFor = (rule) => (rule
    ? {
        attributeId: rule.attributeId,
        operator: rule.operator,
        stringValue: rule.stringValue ?? '',
        numberValue: rule.numberValue ?? '',
        dateValue: toDateInputValue(rule.dateValue),
        optionId: rule.optionId ?? '',
    }
    : { attributeId: '', operator: '', stringValue: '', numberValue: '', dateValue: '', optionId: '' })

const StringValueField = ({ value, onChange, t }) => (
    <Form.Group className="mb-3">
        <Form.Label>{t('positions.accessRules.form.value')}</Form.Label>
        <Form.Control required value={value} onChange={onChange} />
    </Form.Group>
)

const NumberValueField = ({ value, onChange, t }) => (
    <Form.Group className="mb-3">
        <Form.Label>{t('positions.accessRules.form.value')}</Form.Label>
        <Form.Control type="number" required value={value} onChange={onChange} />
    </Form.Group>
)

const DateValueField = ({ value, onChange, t }) => (
    <Form.Group className="mb-3">
        <Form.Label>{t('positions.accessRules.form.value')}</Form.Label>
        <Form.Control type="date" required value={value} onChange={onChange} />
    </Form.Group>
)

const SelectValueField = ({ attribute, value, onChange, t }) => (
    <Form.Group className="mb-3">
        <Form.Label>{t('positions.accessRules.form.value')}</Form.Label>
        <Form.Select required value={value} onChange={onChange}>
            {attribute.options?.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </Form.Select>
    </Form.Group>
)

const VALUE_FIELD_BY_TYPE = {
    STRING: { key: 'stringValue', Field: StringValueField },
    TEXT: { key: 'stringValue', Field: StringValueField },
    NUMBER: { key: 'numberValue', Field: NumberValueField },
    DATE: { key: 'dateValue', Field: DateValueField },
    SELECT: { key: 'optionId', Field: SelectValueField },
}

const ValueField = ({ attribute, form, setForm, t }) => {
    const config = attribute && VALUE_FIELD_BY_TYPE[attribute.type]
    if (!config) return null
    const { key, Field } = config
    const onChange = (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
    return <Field attribute={attribute} value={form[key]} onChange={onChange} t={t} />
}

const buildRulePayload = (form) => ({
    attributeId: form.attributeId,
    operator: form.operator,
    stringValue: form.stringValue || undefined,
    numberValue: form.numberValue !== '' ? form.numberValue : undefined,
    dateValue: form.dateValue || undefined,
    optionId: form.optionId || undefined,
})

const AccessRuleFormModal = ({ show, onClose, onSubmit, rule, error }) => {
    const { t } = useTranslation()
    const [attributes, setAttributes] = useState([])
    const [form, setForm] = useState(() => initialFormFor(rule))
    const isEdit = Boolean(rule)

    useEffect(() => {
        listAttributes({}).then(setAttributes).catch(() => setAttributes([]))
    }, [])

    const attribute = useMemo(
        () => attributes.find((a) => a.id === form.attributeId),
        [attributes, form.attributeId],
    )
    const eligibleAttributes = useMemo(
        () => attributes.filter((a) => OPERATORS_BY_TYPE[a.type]),
        [attributes],
    )
    const availableOperators = attribute ? OPERATORS_BY_TYPE[attribute.type] ?? [] : []

    const handleAttributeChange = (attributeId) => {
        const next = attributes.find((a) => a.id === attributeId)
        setForm((f) => ({
            ...f,
            attributeId,
            operator: '',
            stringValue: '',
            numberValue: '',
            dateValue: '',
            optionId: next?.type === 'SELECT' ? (next.options?.[0]?.id ?? '') : '',
        }))
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        onSubmit(buildRulePayload(form))
    }

    return (
        <Modal show={show} onHide={onClose}>
            <Form onSubmit={handleSubmit}>
                <Modal.Header closeButton>
                    <Modal.Title>
                        {isEdit ? t('positions.accessRules.form.editTitle') : t('positions.accessRules.form.createTitle')}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {error && <div className="alert alert-danger">{error}</div>}

                    <Form.Group className="mb-3">
                        <Form.Label>{t('positions.accessRules.form.attribute')}</Form.Label>
                        <Form.Select
                            required
                            value={form.attributeId}
                            onChange={(e) => handleAttributeChange(e.target.value)}
                        >
                            <option value="">{t('positions.accessRules.form.selectAttribute')}</option>
                            {eligibleAttributes.map((a) => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                        </Form.Select>
                    </Form.Group>

                    {attribute && (
                        <Form.Group className="mb-3">
                            <Form.Label>{t('positions.accessRules.form.operator')}</Form.Label>
                            <Form.Select
                                required
                                value={form.operator}
                                onChange={(e) => setForm((f) => ({ ...f, operator: e.target.value }))}
                            >
                                <option value="">{t('positions.accessRules.form.selectOperator')}</option>
                                {availableOperators.map((op) => (
                                    <option key={op} value={op}>{t(`positions.accessRules.operators.${op}`)}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    )}

                    <ValueField attribute={attribute} form={form} setForm={setForm} t={t} />
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onClose} type="button">
                        {t('positions.form.cancel')}
                    </Button>
                    <Button variant="primary" type="submit" disabled={!form.attributeId || !form.operator}>
                        {t('positions.form.save')}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    )
}

export default AccessRuleFormModal
