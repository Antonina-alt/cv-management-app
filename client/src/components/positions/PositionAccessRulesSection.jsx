import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelection } from '../../hooks/useSelection.js'
import { formatDate } from '../../lib/formatDate.js'
import CommonDataTable from '../common/CommonDataTable.jsx'
import { TABLE_MODE } from '../../lib/tableMode.js'
import ConfirmationModal from '../common/ConfirmationModal.jsx'
import Toolbar from '../common/Toolbar.jsx'
import AccessRuleFormModal from './AccessRuleFormModal.jsx'

const sectionTableOptions = { paging: false, info: false, ordering: false }
const ruleToPayload = ({ attributeId, operator, stringValue, numberValue, dateValue, optionId }) => ({ attributeId, operator, stringValue: stringValue ?? undefined, numberValue: numberValue ?? undefined, dateValue: dateValue ?? undefined, optionId: optionId ?? undefined })
const formatValue = (rule, t, locale) => {
    if (rule.operator === 'IS_TRUE') return t('positions.accessRules.true')
    if (rule.operator === 'IS_FALSE') return t('positions.accessRules.false')
    if (rule.attribute.type === 'SELECT') return rule.attribute.options?.find(({ id }) => id === rule.optionId)?.label ?? ''
    if (rule.attribute.type === 'DATE') return formatDate(rule.dateValue, locale)
    return rule.attribute.type === 'NUMBER' ? rule.numberValue : rule.stringValue
}

const PositionAccessRulesSection = ({ rules, onSave, disabled }) => {
    const { t, i18n } = useTranslation()
    const selection = useSelection()
    const [modal, setModal] = useState(null)
    const [formError, setFormError] = useState(null)
    const closeModal = () => {
        setModal(null)
        setFormError(null)
    }
    const save = async (payloads) => {
        try {
            await onSave(payloads)
            selection.clear()
            closeModal()
        } catch (error) {
            setFormError(error)
        }
    }
    const create = (payload) => save([...rules.map(ruleToPayload), payload])
    const edit = (payload) => save(rules.map((rule) => rule.id === selection.single.id ? payload : ruleToPayload(rule)))
    const remove = () => save(rules.filter(({ id }) => !selection.ids.includes(id)).map(ruleToPayload))
    const columns = useMemo(() => [
        { data: (row) => row.attribute.name, title: t('positions.accessRules.form.attribute') },
        { data: 'operator', title: t('positions.accessRules.form.operator'), render: (_, row) => t(`positions.accessRules.operators.${row.operator}`) },
        { data: (row) => formatValue(row, t, i18n.resolvedLanguage), title: t('positions.accessRules.form.value') },
    ], [i18n.resolvedLanguage, t])
    const actions = [
        { key: 'add', label: t('positions.accessRules.toolbar.add'), variant: 'primary', size: 'sm', onClick: () => setModal('create') },
        { key: 'edit', label: t('positions.accessRules.toolbar.edit'), variant: 'outline-primary', size: 'sm', disabled: !selection.single, onClick: () => setModal('edit') },
        { key: 'delete', label: t('positions.accessRules.toolbar.delete'), variant: 'outline-danger', size: 'sm', disabled: !selection.items.length, onClick: () => setModal('delete') },
    ]
    return (
        <div>
            {!disabled && <Toolbar actions={actions} />}
            <CommonDataTable data={rules} columns={columns} emptyMessage={t('positions.accessRules.empty')} mode={disabled ? TABLE_MODE.READ_ONLY : TABLE_MODE.MULTIPLE} selectedIds={selection.ids} onToggleRow={selection.toggle} onToggleAll={selection.toggleAll} getRowLabel={(row) => row.attribute.name} options={sectionTableOptions} />
            {modal === 'create' && <AccessRuleFormModal show onClose={closeModal} onSubmit={create} error={formError} />}
            {modal === 'edit' && selection.single && <AccessRuleFormModal key={selection.single.id} show onClose={closeModal} onSubmit={edit} rule={selection.single} error={formError} />}
            <ConfirmationModal show={modal === 'delete'} onCancel={closeModal} onConfirm={remove} title={t('positions.accessRules.deleteConfirm.title')} body={t('positions.accessRules.deleteConfirm.body')} cancelLabel={t('positions.form.cancel')} confirmLabel={t('positions.accessRules.toolbar.delete')} />
        </div>
    )
}

export default PositionAccessRulesSection
