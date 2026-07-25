import { useState } from 'react'
import { Badge, Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { ConflictError } from '../../api/http.js'
import { useFormState } from '../../hooks/useFormState.js'
import { isFieldError } from '../../lib/errors.js'
import FieldError from '../common/FieldError.jsx'
import FormModal from '../common/FormModal.jsx'
import TagInput from '../profile/TagInput.jsx'

const PositionProjectFilterSection = ({ tags, maxProjects, onSave, disabled }) => {
    const { t } = useTranslation()
    const [show, setShow] = useState(false)
    const [error, setError] = useState(null)
    const { form, setForm, setField, bindField } = useFormState({ tags, maxProjects })
    const close = () => {
        setShow(false)
        setError(null)
    }
    const open = () => {
        setForm({ tags, maxProjects })
        setShow(true)
    }
    const submit = async (event) => {
        event.preventDefault()
        try {
            await onSave({ projectTags: form.tags, maxProjects: Number(form.maxProjects) })
            close()
        } catch (requestError) {
            if (requestError instanceof ConflictError) return close()
            setError(requestError)
        }
    }
    return (
        <div>
            <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                    <div className="mb-2">{tags.length ? tags.map((tag) => <Badge key={tag} bg="secondary" className="me-1">{tag}</Badge>) : <span className="text-muted">{t('positions.projectFilter.noTags')}</span>}</div>
                    <div className="text-muted small">{t('positions.projectFilter.maxProjects', { count: maxProjects })}</div>
                </div>
                {!disabled && <Button variant="outline-primary" size="sm" onClick={open}>{t('positions.projectFilter.edit')}</Button>}
            </div>
            {show && <FormModal show onClose={close} onSubmit={submit} title={t('positions.projectFilter.editTitle')} error={error} cancelLabel={t('positions.form.cancel')} submitLabel={t('positions.form.save')}>
                <Form.Group className="mb-3"><Form.Label>{t('positions.projectFilter.tags')}</Form.Label><TagInput value={form.tags} onChange={(value) => setField('tags', value)} /></Form.Group>
                <Form.Group className="mb-3">
                    <Form.Label>{t('positions.projectFilter.maxProjectsLabel')}</Form.Label>
                    <Form.Control type="number" min={0} required isInvalid={isFieldError(error, 'maxProjects')} {...bindField('maxProjects')} />
                    <FieldError error={error} field="maxProjects" />
                </Form.Group>
            </FormModal>}
        </div>
    )
}

export default PositionProjectFilterSection
