import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { useFormState } from '../../hooks/useFormState.js'
import { toDateInputValue } from '../../lib/dateInput.js'
import { isFieldError } from '../../lib/errors.js'
import FieldError from '../common/FieldError.jsx'
import FormModal from '../common/FormModal.jsx'
import MarkdownField from './MarkdownField.jsx'
import TagInput from './TagInput.jsx'

const initialFormFor = (project) => project ? {
    title: project.title,
    startDate: toDateInputValue(project.startDate),
    endDate: toDateInputValue(project.endDate),
    description: project.description ?? '',
    tags: project.tags.map(({ tag }) => tag.name),
} : { title: '', startDate: '', endDate: '', description: '', tags: [] }

const buildPayload = (form) => ({
    title: form.title.trim(),
    startDate: form.startDate || null,
    endDate: form.endDate || null,
    description: form.description,
    tags: form.tags,
})

const DateField = ({ label, field, bindField, error }) => (
    <Form.Group className="mb-3">
        <Form.Label>{label}</Form.Label>
        <Form.Control type="date" isInvalid={isFieldError(error, field)} {...bindField(field)} />
        <FieldError error={error} field={field} />
    </Form.Group>
)

const ProjectFormModal = ({ show, onClose, onSubmit, project, error }) => {
    const { t } = useTranslation()
    const { form, setField, bindField } = useFormState(() => initialFormFor(project))
    const submit = (event) => {
        event.preventDefault()
        onSubmit(buildPayload(form))
    }
    return (
        <FormModal show={show} onClose={onClose} onSubmit={submit} title={t(project ? 'profile.projects.editTitle' : 'profile.projects.createTitle')} error={error} cancelLabel={t('profile.projects.cancel')} submitLabel={t('profile.projects.save')} size="lg">
            <Form.Group className="mb-3">
                <Form.Label>{t('profile.projects.titleField')}</Form.Label>
                <Form.Control required isInvalid={isFieldError(error, 'title')} {...bindField('title')} />
                <FieldError error={error} field="title" />
            </Form.Group>
            <div className="row">
                <div className="col-6"><DateField label={t('profile.projects.startDate')} field="startDate" bindField={bindField} error={error} /></div>
                <div className="col-6"><DateField label={t('profile.projects.endDate')} field="endDate" bindField={bindField} error={error} /></div>
            </div>
            <Form.Group className="mb-3"><Form.Label>{t('profile.projects.description')}</Form.Label><MarkdownField value={form.description} rows={5} onChange={(value) => setField('description', value)} /></Form.Group>
            <Form.Group className="mb-3"><Form.Label>{t('profile.projects.tags')}</Form.Label><TagInput value={form.tags} onChange={(value) => setField('tags', value)} /></Form.Group>
        </FormModal>
    )
}

export default ProjectFormModal
