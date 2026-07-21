import { useState } from 'react'
import { Badge, Button, Form, Modal } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import TagInput from '../profile/TagInput.jsx'

const PositionProjectFilterSection = ({ tags, maxProjects, onSave, disabled }) => {
    const { t } = useTranslation()
    const [show, setShow] = useState(false)
    const [form, setForm] = useState({ tags, maxProjects })

    const openModal = () => {
        setForm({ tags, maxProjects })
        setShow(true)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        await onSave({ projectTags: form.tags, maxProjects: Number(form.maxProjects) })
        setShow(false)
    }

    return (
        <div>
            <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                    <div className="mb-2">
                        {tags.length === 0
                            ? <span className="text-muted">{t('positions.projectFilter.noTags')}</span>
                            : tags.map((tag) => <Badge key={tag} bg="secondary" className="me-1">{tag}</Badge>)}
                    </div>
                    <div className="text-muted small">
                        {t('positions.projectFilter.maxProjects', { count: maxProjects })}
                    </div>
                </div>
                <Button variant="outline-primary" size="sm" disabled={disabled} onClick={openModal}>
                    {t('positions.projectFilter.edit')}
                </Button>
            </div>

            <Modal show={show} onHide={() => setShow(false)}>
                <Form onSubmit={handleSubmit}>
                    <Modal.Header closeButton>
                        <Modal.Title>{t('positions.projectFilter.editTitle')}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>{t('positions.projectFilter.tags')}</Form.Label>
                            <TagInput value={form.tags} onChange={(tags) => setForm((f) => ({ ...f, tags }))} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>{t('positions.projectFilter.maxProjectsLabel')}</Form.Label>
                            <Form.Control
                                type="number"
                                min={0}
                                required
                                value={form.maxProjects}
                                onChange={(e) => setForm((f) => ({ ...f, maxProjects: e.target.value }))}
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" type="button" onClick={() => setShow(false)}>
                            {t('positions.form.cancel')}
                        </Button>
                        <Button variant="primary" type="submit">
                            {t('positions.form.save')}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </div>
    )
}

export default PositionProjectFilterSection
