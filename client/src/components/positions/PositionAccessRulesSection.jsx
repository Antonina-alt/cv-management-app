import { useMemo, useState } from 'react'
import { Button, Modal } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import CommonDataTable, { TABLE_MODE } from '../common/CommonDataTable.jsx'
import AccessRuleFormModal from './AccessRuleFormModal.jsx'
import { useIdSelection } from '../../hooks/useIdSelection.js'
import { formatDate } from '../../lib/formatDate.js'

const sectionTableOptions = { paging: false, info: false, ordering: false }

const formatValue = (rule, t, locale) => {
    if (rule.operator === 'IS_TRUE') return t('positions.accessRules.true')
    if (rule.operator === 'IS_FALSE') return t('positions.accessRules.false')
    if (rule.attribute.type === 'SELECT') {
        return rule.attribute.options?.find((option) => option.id === rule.optionId)?.label ?? ''
    }
    if (rule.attribute.type === 'NUMBER') return rule.numberValue
    if (rule.attribute.type === 'DATE') return formatDate(rule.dateValue, locale)
    return rule.stringValue
}

const ruleToPayload = (rule) => ({
    attributeId: rule.attributeId,
    operator: rule.operator,
    stringValue: rule.stringValue ?? undefined,
    numberValue: rule.numberValue ?? undefined,
    dateValue: rule.dateValue ?? undefined,
    optionId: rule.optionId ?? undefined,
})

const PositionAccessRulesSection = ({ rules, onSave, disabled }) => {
    const { t, i18n } = useTranslation()
    const selection = useIdSelection()
    const [modal, setModal] = useState(null)
    const [formError, setFormError] = useState(null)

    const selectedRules = rules.filter((rule) => selection.ids.includes(rule.id))
    const singleSelected = selectedRules.length === 1 ? selectedRules[0] : null

    const closeModal = () => {
        setModal(null)
        setFormError(null)
    }

    const handleCreateSubmit = async (payload) => {
        try {
            await onSave([...rules.map(ruleToPayload), payload])
            closeModal()
        } catch (error) {
            setFormError(error.message)
        }
    }

    const handleEditSubmit = async (payload) => {
        try {
            await onSave(rules.map((rule) => (rule.id === singleSelected.id ? payload : ruleToPayload(rule))))
            selection.setIds([])
            closeModal()
        } catch (error) {
            setFormError(error.message)
        }
    }

    const handleDeleteConfirm = async () => {
        await onSave(rules.filter((rule) => !selection.ids.includes(rule.id)).map(ruleToPayload))
        selection.setIds([])
        closeModal()
    }

    const columns = useMemo(() => [
        { data: (row) => row.attribute.name, title: t('positions.accessRules.form.attribute') },
        {
            data: 'operator',
            title: t('positions.accessRules.form.operator'),
            render: (data, row) => t(`positions.accessRules.operators.${row.operator}`),
        },
        {
            data: (row) => formatValue(row, t, i18n.resolvedLanguage),
            title: t('positions.accessRules.form.value'),
        },
    ], [i18n.resolvedLanguage, t])

    return (
        <div>
            {!disabled && (
                <div className="d-flex flex-wrap gap-2 mb-3">
                    <Button variant="primary" size="sm" onClick={() => setModal('create')}>
                        {t('positions.accessRules.toolbar.add')}
                    </Button>
                    <Button variant="outline-primary" size="sm" disabled={!singleSelected} onClick={() => setModal('edit')}>
                        {t('positions.accessRules.toolbar.edit')}
                    </Button>
                    <Button
                        variant="outline-danger"
                        size="sm"
                        disabled={selectedRules.length === 0}
                        onClick={() => setModal('delete')}
                    >
                        {t('positions.accessRules.toolbar.delete')}
                    </Button>
                </div>
            )}

            <CommonDataTable
                data={rules}
                columns={columns}
                emptyMessage={t('positions.accessRules.empty')}
                mode={disabled ? TABLE_MODE.READ_ONLY : TABLE_MODE.MULTIPLE}
                selectedIds={selection.ids}
                onToggleRow={(row) => selection.toggle(row.id)}
                onToggleAll={selection.toggleAll}
                getRowLabel={(row) => row.attribute.name}
                options={sectionTableOptions}
            />

            {modal === 'create' && (
                <AccessRuleFormModal show onClose={closeModal} onSubmit={handleCreateSubmit} error={formError} />
            )}

            {modal === 'edit' && singleSelected && (
                <AccessRuleFormModal
                    key={singleSelected.id}
                    show
                    onClose={closeModal}
                    onSubmit={handleEditSubmit}
                    rule={singleSelected}
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
