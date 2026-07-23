import { useState } from 'react'
import { Button, Form, Modal } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'

const LEVELS = ['JUNIOR', 'MIDDLE', 'SENIOR', 'LEAD', 'C_LEVEL']

const initialFormFor = (position) => (position
    ? {
        title: position.title,
        description: position.description ?? '',
        company: position.company ?? '',
        level: position.level ?? '',
        isPublic: position.isPublic,
        maxProjects: position.maxProjects,
    }
    : { title: '', description: '', company: '', level: '', isPublic: false, maxProjects: 3 })

const buildPositionPayload = (form) => ({
    title: form.title.trim(),
    description: form.description.trim() || null,
    company: form.company.trim() || null,
    level: form.level || null,
    isPublic: form.isPublic,
    maxProjects: Number(form.maxProjects),
})

const PositionFormModal = ({ show, onClose, onSubmit, position, error }) => {
    const { t } = useTranslation()
    const [form, setForm] = useState(() => initialFormFor(position))
    const isEdit = Boolean(position)

    const handleSubmit = (e) => {
        e.preventDefault()
        onSubmit(buildPositionPayload(form))
    }

    return (
        <Modal show={show} onHide={onClose}>
            <Form onSubmit={handleSubmit}>
                <Modal.Header closeButton>
                    <Modal.Title>
                        {isEdit ? t('positions.form.editTitle') : t('positions.form.createTitle')}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {error && <div className="alert alert-danger">{error}</div>}

                    <Form.Group className="mb-3">
                        <Form.Label>{t('positions.form.title')}</Form.Label>
                        <Form.Control
                            required
                            value={form.title}
                            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>{t('positions.form.description')}</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={2}
                            value={form.description}
                            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>{t('positions.form.company')}</Form.Label>
                        <Form.Control
                            value={form.company}
                            onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>{t('positions.form.level')}</Form.Label>
                        <Form.Select
                            value={form.level}
                            onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
                        >
                            <option value="">{t('positions.allLevels')}</option>
                            {LEVELS.map((lvl) => (
                                <option key={lvl} value={lvl}>{t(`positions.levels.${lvl}`)}</option>
                            ))}
                        </Form.Select>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>{t('positions.form.maxProjects')}</Form.Label>
                        <Form.Control
                            type="number"
                            min={0}
                            required
                            value={form.maxProjects}
                            onChange={(e) => setForm((f) => ({ ...f, maxProjects: e.target.value }))}
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Check
                            type="checkbox"
                            label={t('positions.form.isPublic')}
                            checked={form.isPublic}
                            onChange={(e) => setForm((f) => ({ ...f, isPublic: e.target.checked }))}
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onClose} type="button">
                        {t('positions.form.cancel')}
                    </Button>
                    <Button variant="primary" type="submit">
                        {t('positions.form.save')}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    )
}

export default PositionFormModal
