import { useState } from 'react'
import { Button, Modal, Table } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import AccessRuleFormModal from './AccessRuleFormModal.jsx'

const formatValue = (rule, t) => {
    if (rule.operator === 'IS_TRUE') return t('positions.accessRules.true')
    if (rule.operator === 'IS_FALSE') return t('positions.accessRules.false')
    if (rule.attribute.type === 'SELECT') return rule.attribute.options?.find((o) => o.id === rule.optionId)?.label ?? ''
    if (rule.attribute.type === 'NUMBER') return rule.numberValue
    if (rule.attribute.type === 'DATE') return new Date(rule.dateValue).toLocaleDateString()
    return rule.stringValue
}

// Access rules table + Add/Edit/Delete toolbar (single-row select via checkbox, no row
// buttons). isPublic positions still allow rules to be configured (they're simply ignored
// while isPublic is true), so the section is always visible.
const PositionAccessRulesSection = ({ rules, onSave, disabled }) => {
    const { t } = useTranslation()
    const [selectedId, setSelectedId] = useState(null)
    const [modal, setModal] = useState(null) // 'create' | 'edit' | 'delete'
    const [formError, setFormError] = useState(null)

    const selectedRule = rules.find((r) => r.id === selectedId) ?? null

    const closeModal = () => {
        setModal(null)
        setFormError(null)
    }

    const ruleToPayload = (rule) => ({
        attributeId: rule.attributeId,
        operator: rule.operator,
        stringValue: rule.stringValue ?? undefined,
        numberValue: rule.numberValue ?? undefined,
        dateValue: rule.dateValue ?? undefined,
        optionId: rule.optionId ?? undefined,
    })

    const handleCreateSubmit = async (payload) => {
        try {
            await onSave([...rules.map(ruleToPayload), payload])
            closeModal()
        } catch (err) {
            setFormError(err.message)
        }
    }

    const handleEditSubmit = async (payload) => {
        try {
            await onSave(rules.map((r) => (r.id === selectedId ? payload : ruleToPayload(r))))
            setSelectedId(null)
            closeModal()
        } catch (err) {
            setFormError(err.message)
        }
    }

    const handleDeleteConfirm = async () => {
        await onSave(rules.filter((r) => r.id !== selectedId).map(ruleToPayload))
        setSelectedId(null)
        closeModal()
    }

    return (
        <div>
            {!disabled && (
                <div className="d-flex gap-2 mb-3">
                    <Button variant="primary" size="sm" onClick={() => setModal('create')}>
                        {t('positions.accessRules.toolbar.add')}
                    </Button>
                    <Button variant="outline-primary" size="sm" disabled={!selectedRule} onClick={() => setModal('edit')}>
                        {t('positions.accessRules.toolbar.edit')}
                    </Button>
                    <Button variant="outline-danger" size="sm" disabled={!selectedRule} onClick={() => setModal('delete')}>
                        {t('positions.accessRules.toolbar.delete')}
                    </Button>
                </div>
            )}

            {rules.length === 0 ? (
                <p className="text-muted">{t('positions.accessRules.empty')}</p>
            ) : (
                <Table hover responsive>
                    <thead>
                        <tr>
                            {!disabled && <th />}
                            <th>{t('positions.accessRules.form.attribute')}</th>
                            <th>{t('positions.accessRules.form.operator')}</th>
                            <th>{t('positions.accessRules.form.value')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rules.map((rule) => (
                            <tr
                                key={rule.id}
                                className={!disabled && selectedId === rule.id ? 'table-active' : ''}
                                style={disabled ? undefined : { cursor: 'pointer' }}
                                onClick={disabled ? undefined : () => setSelectedId(rule.id === selectedId ? null : rule.id)}
                            >
                                {!disabled && (
                                    <td onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            className="form-check-input"
                                            checked={selectedId === rule.id}
                                            onChange={() => setSelectedId(rule.id === selectedId ? null : rule.id)}
                                        />
                                    </td>
                                )}
                                <td>{rule.attribute.name}</td>
                                <td>{t(`positions.accessRules.operators.${rule.operator}`)}</td>
                                <td>{formatValue(rule, t)}</td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            )}

            {modal === 'create' && (
                <AccessRuleFormModal show onClose={closeModal} onSubmit={handleCreateSubmit} error={formError} />
            )}

            {modal === 'edit' && selectedRule && (
                <AccessRuleFormModal
                    key={selectedRule.id}
                    show
                    onClose={closeModal}
                    onSubmit={handleEditSubmit}
                    rule={selectedRule}
                    error={formError}
                />
            )}

            <Modal show={modal === 'delete'} onHide={closeModal}>
                <Modal.Header closeButton>
                    <Modal.Title>{t('positions.accessRules.deleteConfirm.title')}</Modal.Title>
                </Modal.Header>
                <Modal.Body>{t('positions.accessRules.deleteConfirm.body')}</Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={closeModal}>{t('positions.form.cancel')}</Button>
                    <Button variant="danger" onClick={handleDeleteConfirm}>{t('positions.accessRules.toolbar.delete')}</Button>
                </Modal.Footer>
            </Modal>
        </div>
    )
}

export default PositionAccessRulesSection
