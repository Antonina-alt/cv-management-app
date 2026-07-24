import { useCallback, useMemo } from 'react'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { listAttributes } from '../../api/attributes.js'
import { useAsyncData } from '../../hooks/useAsyncData.js'
import { useFormState } from '../../hooks/useFormState.js'
import { toDateInputValue } from '../../lib/dateInput.js'
import FormModal from '../common/FormModal.jsx'

const OPERATORS_BY_TYPE = {
    STRING: ['EQUALS', 'NOT_EQUALS'],
    TEXT: ['EQUALS', 'NOT_EQUALS'],
    NUMBER: ['EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'GREATER_THAN_OR_EQUALS', 'LESS_THAN', 'LESS_THAN_OR_EQUALS'],
    DATE: ['EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'GREATER_THAN_OR_EQUALS', 'LESS_THAN', 'LESS_THAN_OR_EQUALS'],
    BOOLEAN: ['IS_TRUE', 'IS_FALSE'],
    SELECT: ['EQUALS', 'NOT_EQUALS'],
}
const VALUE_CONFIG = { STRING: ['stringValue', 'text'], TEXT: ['stringValue', 'text'], NUMBER: ['numberValue', 'number'], DATE: ['dateValue', 'date'] }
const emptyForm = { attributeId: '', operator: '', stringValue: '', numberValue: '', dateValue: '', optionId: '' }
const initialFormFor = (rule) => rule ? {
    attributeId: rule.attributeId,
    operator: rule.operator,
    stringValue: rule.stringValue ?? '',
    numberValue: rule.numberValue ?? '',
    dateValue: toDateInputValue(rule.dateValue),
    optionId: rule.optionId ?? '',
} : emptyForm
const buildPayload = (form) => ({
    attributeId: form.attributeId,
    operator: form.operator,
    stringValue: form.stringValue || undefined,
    numberValue: form.numberValue !== '' ? form.numberValue : undefined,
    dateValue: form.dateValue || undefined,
    optionId: form.optionId || undefined,
})

const ValueField = ({ attribute, form, setField, t }) => {
    if (!attribute || attribute.type === 'BOOLEAN') return null
    if (attribute.type === 'SELECT') return (
        <Form.Group className="mb-3">
            <Form.Label>{t('positions.accessRules.form.value')}</Form.Label>
            <Form.Select required value={form.optionId} onChange={(event) => setField('optionId', event)}>
                {attribute.options?.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
            </Form.Select>
        </Form.Group>
    )
    const [field, type] = VALUE_CONFIG[attribute.type] ?? []
    if (!field) return null
    return (
        <Form.Group className="mb-3">
            <Form.Label>{t('positions.accessRules.form.value')}</Form.Label>
            <Form.Control required type={type} value={form[field]} onChange={(event) => setField(field, event)} />
        </Form.Group>
    )
}

const AccessRuleFormModal = ({ show, onClose, onSubmit, rule, error }) => {
    const { t } = useTranslation()
    const fetchAttributes = useCallback(() => listAttributes({}), [])
    const { data, error: loadError } = useAsyncData(fetchAttributes)
    const attributes = useMemo(() => data ?? [], [data])
    const { form, setForm, setField, bindField } = useFormState(() => initialFormFor(rule))
    const attribute = useMemo(() => attributes.find(({ id }) => id === form.attributeId), [attributes, form.attributeId])
    const eligible = useMemo(() => attributes.filter(({ type }) => OPERATORS_BY_TYPE[type]), [attributes])
    const selectAttribute = (attributeId) => {
        const selected = attributes.find(({ id }) => id === attributeId)
        setForm({ ...emptyForm, attributeId, optionId: selected?.options?.[0]?.id ?? '' })
    }
    const submit = (event) => {
        event.preventDefault()
        onSubmit(buildPayload(form))
    }
    return (
        <FormModal show={show} onClose={onClose} onSubmit={submit} title={t(rule ? 'positions.accessRules.form.editTitle' : 'positions.accessRules.form.createTitle')} error={error || loadError} cancelLabel={t('positions.form.cancel')} submitLabel={t('positions.form.save')} submitDisabled={!form.attributeId || !form.operator}>
            <Form.Group className="mb-3">
                <Form.Label>{t('positions.accessRules.form.attribute')}</Form.Label>
                <Form.Select required value={form.attributeId} onChange={(event) => selectAttribute(event.target.value)}>
                    <option value="">{t('positions.accessRules.form.selectAttribute')}</option>
                    {eligible.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
                </Form.Select>
            </Form.Group>
            {attribute && (
                <Form.Group className="mb-3">
                    <Form.Label>{t('positions.accessRules.form.operator')}</Form.Label>
                    <Form.Select required {...bindField('operator')}>
                        <option value="">{t('positions.accessRules.form.selectOperator')}</option>
                        {(OPERATORS_BY_TYPE[attribute.type] ?? []).map((operator) => <option key={operator} value={operator}>{t(`positions.accessRules.operators.${operator}`)}</option>)}
                    </Form.Select>
                </Form.Group>
            )}
            <ValueField attribute={attribute} form={form} setField={setField} t={t} />
        </FormModal>
    )
}

export default AccessRuleFormModal
