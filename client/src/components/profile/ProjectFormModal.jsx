import { useState } from 'react'
import { Button, Form, Modal } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import MarkdownField from './MarkdownField.jsx'
import TagInput from './TagInput.jsx'
import { toDateInputValue } from '../../lib/dateInput.js'

const initialFormFor = (project) => (project
    ? {
        title: project.title,
        startDate: toDateInputValue(project.startDate),
        endDate: toDateInputValue(project.endDate),
        description: project.description ?? '',
        tags: project.tags.map((t) => t.tag.name),
    }
    : { title: '', startDate: '', endDate: '', description: '', tags: [] })

const ProjectFormModal = ({ show, onClose, onSubmit, project, error }) => {
    const { t } = useTranslation()
    const [form, setForm] = useState(() => initialFormFor(project))
    const isEdit = Boolean(project)

    const handleSubmit = (e) => {
        e.preventDefault()
        onSubmit({
            title: form.title.trim(),
            startDate: form.startDate || null,
            endDate: form.endDate || null,
            description: form.description,
            tags: form.tags,
        })
    }

    return (
        <Modal show={show} onHide={onClose} size="lg">
            <Form onSubmit={handleSubmit}>
                <Modal.Header closeButton>
                    <Modal.Title>
                        {isEdit ? t('profile.projects.editTitle') : t('profile.projects.createTitle')}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {error && <div className="alert alert-danger">{error}</div>}

                    <Form.Group className="mb-3">
                        <Form.Label>{t('profile.projects.titleField')}</Form.Label>
                        <Form.Control
                            required
                            value={form.title}
                            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                        />
                    </Form.Group>

                    <div className="row">
                        <div className="col-6">
                            <Form.Group className="mb-3">
                                <Form.Label>{t('profile.projects.startDate')}</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={form.startDate}
                                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                                />
                            </Form.Group>
                        </div>
                        <div className="col-6">
                            <Form.Group className="mb-3">
                                <Form.Label>{t('profile.projects.endDate')}</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={form.endDate}
                                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                                />
                            </Form.Group>
                        </div>
                    </div>

                    <Form.Group className="mb-3">
                        <Form.Label>{t('profile.projects.description')}</Form.Label>
                        <MarkdownField
                            value={form.description}
                            rows={5}
                            onChange={(description) => setForm((f) => ({ ...f, description }))}
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>{t('profile.projects.tags')}</Form.Label>
                        <TagInput value={form.tags} onChange={(tags) => setForm((f) => ({ ...f, tags }))} />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" type="button" onClick={onClose}>
                        {t('profile.projects.cancel')}
                    </Button>
                    <Button variant="primary" type="submit">
                        {t('profile.projects.save')}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    )
}

export default ProjectFormModal
