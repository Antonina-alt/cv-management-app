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
        onSubmit({
            attributeId: form.attributeId,
            operator: form.operator,
            stringValue: form.stringValue || undefined,
            numberValue: form.numberValue !== '' ? form.numberValue : undefined,
            dateValue: form.dateValue || undefined,
            optionId: form.optionId || undefined,
        })
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

                    {attribute && (attribute.type === 'STRING' || attribute.type === 'TEXT') && (
                        <Form.Group className="mb-3">
                            <Form.Label>{t('positions.accessRules.form.value')}</Form.Label>
                            <Form.Control
                                required
                                value={form.stringValue}
                                onChange={(e) => setForm((f) => ({ ...f, stringValue: e.target.value }))}
                            />
                        </Form.Group>
                    )}

                    {attribute?.type === 'NUMBER' && (
                        <Form.Group className="mb-3">
                            <Form.Label>{t('positions.accessRules.form.value')}</Form.Label>
                            <Form.Control
                                type="number"
                                required
                                value={form.numberValue}
                                onChange={(e) => setForm((f) => ({ ...f, numberValue: e.target.value }))}
                            />
                        </Form.Group>
                    )}

                    {attribute?.type === 'DATE' && (
                        <Form.Group className="mb-3">
                            <Form.Label>{t('positions.accessRules.form.value')}</Form.Label>
                            <Form.Control
                                type="date"
                                required
                                value={form.dateValue}
                                onChange={(e) => setForm((f) => ({ ...f, dateValue: e.target.value }))}
                            />
                        </Form.Group>
                    )}

                    {attribute?.type === 'SELECT' && (
                        <Form.Group className="mb-3">
                            <Form.Label>{t('positions.accessRules.form.value')}</Form.Label>
                            <Form.Select
                                required
                                value={form.optionId}
                                onChange={(e) => setForm((f) => ({ ...f, optionId: e.target.value }))}
                            >
                                {attribute.options?.map((o) => (
                                    <option key={o.id} value={o.id}>{o.label}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    )}
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
