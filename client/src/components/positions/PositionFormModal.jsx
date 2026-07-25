import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { useFormState } from '../../hooks/useFormState.js'
import { isFieldError } from '../../lib/errors.js'
import FieldError from '../common/FieldError.jsx'
import FormModal from '../common/FormModal.jsx'

const LEVELS = ['JUNIOR', 'MIDDLE', 'SENIOR', 'LEAD', 'C_LEVEL']
const initialFormFor = (position) => position ? {
    title: position.title,
    description: position.description ?? '',
    company: position.company ?? '',
    level: position.level ?? '',
    isPublic: position.isPublic,
    maxProjects: position.maxProjects,
} : { title: '', description: '', company: '', level: '', isPublic: false, maxProjects: 3 }

const buildPayload = (form) => ({
    title: form.title.trim(),
    description: form.description.trim() || null,
    company: form.company.trim() || null,
    level: form.level || null,
    isPublic: form.isPublic,
    maxProjects: Number(form.maxProjects),
})

const PositionFormModal = ({ show, onClose, onSubmit, position, error }) => {
    const { t } = useTranslation()
    const { form, setField, bindField } = useFormState(() => initialFormFor(position))
    const submit = (event) => {
        event.preventDefault()
        onSubmit(buildPayload(form))
    }
    return (
        <FormModal show={show} onClose={onClose} onSubmit={submit} title={t(position ? 'positions.form.editTitle' : 'positions.form.createTitle')} error={error} cancelLabel={t('positions.form.cancel')} submitLabel={t('positions.form.save')}>
            <Form.Group className="mb-3">
                <Form.Label>{t('positions.form.title')}</Form.Label>
                <Form.Control required isInvalid={isFieldError(error, 'title')} {...bindField('title')} />
                <FieldError error={error} field="title" />
            </Form.Group>
            <Form.Group className="mb-3"><Form.Label>{t('positions.form.description')}</Form.Label><Form.Control as="textarea" rows={2} {...bindField('description')} /></Form.Group>
            <Form.Group className="mb-3"><Form.Label>{t('positions.form.company')}</Form.Label><Form.Control {...bindField('company')} /></Form.Group>
            <Form.Group className="mb-3">
                <Form.Label>{t('positions.form.level')}</Form.Label>
                <Form.Select isInvalid={isFieldError(error, 'level')} {...bindField('level')}>
                    <option value="">{t('positions.allLevels')}</option>
                    {LEVELS.map((level) => <option key={level} value={level}>{t(`positions.levels.${level}`)}</option>)}
                </Form.Select>
                <FieldError error={error} field="level" />
            </Form.Group>
            <Form.Group className="mb-3">
                <Form.Label>{t('positions.form.maxProjects')}</Form.Label>
                <Form.Control type="number" min={0} required isInvalid={isFieldError(error, 'maxProjects')} {...bindField('maxProjects')} />
                <FieldError error={error} field="maxProjects" />
            </Form.Group>
            <Form.Check type="checkbox" label={t('positions.form.isPublic')} checked={form.isPublic} onChange={(event) => setField('isPublic', event.target.checked)} />
        </FormModal>
    )
}

export default PositionFormModal
