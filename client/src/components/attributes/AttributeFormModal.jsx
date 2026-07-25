import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { useFormState } from '../../hooks/useFormState.js'
import { isFieldError } from '../../lib/errors.js'
import FieldError from '../common/FieldError.jsx'
import FormModal from '../common/FormModal.jsx'
import AttributeOptionsEditor from './AttributeOptionsEditor.jsx'

const ATTRIBUTE_TYPES = ['STRING', 'TEXT', 'IMAGE', 'NUMBER', 'DATE', 'DATE_RANGE', 'BOOLEAN', 'SELECT']

const initialFormFor = (attribute, categories) => attribute ? {
    name: attribute.name,
    description: attribute.description ?? '',
    categoryId: attribute.categoryId,
    type: attribute.type,
    options: attribute.options?.length ? attribute.options.map(({ label }) => label) : [''],
} : { name: '', description: '', categoryId: categories[0]?.id ?? '', type: 'STRING', options: [''] }

const buildPayload = (form, isEdit) => ({
    name: form.name.trim(),
    description: form.description.trim() || null,
    categoryId: form.categoryId,
    ...(!isEdit && { type: form.type }),
    ...(form.type === 'SELECT' && { options: form.options.map((option) => option.trim()).filter(Boolean) }),
})

const AttributeFormModal = ({ show, onClose, onSubmit, categories, attribute, error }) => {
    const { t } = useTranslation()
    const { form, setField, bindField } = useFormState(() => initialFormFor(attribute, categories))
    const isEdit = Boolean(attribute)
    const submit = (event) => {
        event.preventDefault()
        onSubmit(buildPayload(form, isEdit))
    }
    return (
        <FormModal show={show} onClose={onClose} onSubmit={submit} title={t(isEdit ? 'attributes.form.editTitle' : 'attributes.form.createTitle')} error={error} cancelLabel={t('attributes.form.cancel')} submitLabel={t('attributes.form.save')}>
            <Form.Group className="mb-3">
                <Form.Label>{t('attributes.form.name')}</Form.Label>
                <Form.Control required isInvalid={isFieldError(error, 'name')} {...bindField('name')} />
                <FieldError error={error} field="name" />
            </Form.Group>
            <Form.Group className="mb-3"><Form.Label>{t('attributes.form.description')}</Form.Label><Form.Control as="textarea" rows={2} {...bindField('description')} /></Form.Group>
            <Form.Group className="mb-3">
                <Form.Label>{t('attributes.form.category')}</Form.Label>
                <Form.Select required isInvalid={isFieldError(error, 'categoryId')} {...bindField('categoryId')}>{categories.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}</Form.Select>
                <FieldError error={error} field="categoryId" />
            </Form.Group>
            <Form.Group className="mb-3">
                <Form.Label>{t('attributes.form.type')}</Form.Label>
                <Form.Select required disabled={isEdit} isInvalid={isFieldError(error, 'type')} {...bindField('type')}>{ATTRIBUTE_TYPES.map((type) => <option key={type} value={type}>{t(`attributes.types.${type}`)}</option>)}</Form.Select>
                <FieldError error={error} field="type" />
            </Form.Group>
            {form.type === 'SELECT' && <><AttributeOptionsEditor options={form.options} onChange={(options) => setField('options', options)} t={t} /><FieldError error={error} field="options" /></>}
        </FormModal>
    )
}

export default AttributeFormModal
