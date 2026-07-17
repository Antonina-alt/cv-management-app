import { useState } from 'react'
import { Button, Form, Modal } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'

const ATTRIBUTE_TYPES = ['STRING', 'TEXT', 'IMAGE', 'NUMBER', 'DATE', 'DATE_RANGE', 'BOOLEAN', 'SELECT']

// The parent remounts this component (via a `key`) whenever it opens for a
// different attribute, so the initial state below only needs to be computed once per mount.
const initialFormFor = (attribute, categories) => (attribute
    ? {
        name: attribute.name,
        description: attribute.description ?? '',
        categoryId: attribute.categoryId,
        type: attribute.type,
        options: attribute.options?.length ? attribute.options.map((o) => o.label) : [''],
    }
    : { name: '', description: '', categoryId: categories[0]?.id ?? '', type: 'STRING', options: [''] })

const AttributeFormModal = ({ show, onClose, onSubmit, categories, attribute, error }) => {
    const { t } = useTranslation()
    const [form, setForm] = useState(() => initialFormFor(attribute, categories))
    const isEdit = Boolean(attribute)

    const setOption = (index, value) => {
        setForm((f) => ({ ...f, options: f.options.map((o, i) => (i === index ? value : o)) }))
    }

    const addOption = () => setForm((f) => ({ ...f, options: [...f.options, ''] }))

    const removeOption = (index) => {
        setForm((f) => ({ ...f, options: f.options.filter((_, i) => i !== index) }))
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        const payload = {
            name: form.name.trim(),
            description: form.description.trim() || null,
            categoryId: form.categoryId,
        }
        if (!isEdit) {
            payload.type = form.type
        }
        if (form.type === 'SELECT') {
            payload.options = form.options.map((o) => o.trim()).filter(Boolean)
        }
        onSubmit(payload)
    }

    return (
        <Modal show={show} onHide={onClose}>
            <Form onSubmit={handleSubmit}>
                <Modal.Header closeButton>
                    <Modal.Title>
                        {isEdit ? t('attributes.form.editTitle') : t('attributes.form.createTitle')}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {error && <div className="alert alert-danger">{error}</div>}

                    <Form.Group className="mb-3">
                        <Form.Label>{t('attributes.form.name')}</Form.Label>
                        <Form.Control
                            required
                            value={form.name}
                            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>{t('attributes.form.description')}</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={2}
                            value={form.description}
                            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>{t('attributes.form.category')}</Form.Label>
                        <Form.Select
                            required
                            value={form.categoryId}
                            onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                        >
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </Form.Select>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>{t('attributes.form.type')}</Form.Label>
                        <Form.Select
                            required
                            disabled={isEdit}
                            value={form.type}
                            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                        >
                            {ATTRIBUTE_TYPES.map((type) => (
                                <option key={type} value={type}>{t(`attributes.types.${type}`)}</option>
                            ))}
                        </Form.Select>
                    </Form.Group>

                    {form.type === 'SELECT' && (
                        <Form.Group className="mb-3">
                            <Form.Label>{t('attributes.form.options')}</Form.Label>
                            {form.options.map((option, index) => (
                                <div className="d-flex gap-2 mb-2" key={index}>
                                    <Form.Control
                                        value={option}
                                        onChange={(e) => setOption(index, e.target.value)}
                                        placeholder={t('attributes.form.optionPlaceholder', { n: index + 1 })}
                                    />
                                    <Button
                                        variant="outline-danger"
                                        type="button"
                                        disabled={form.options.length <= 1}
                                        onClick={() => removeOption(index)}
                                    >
                                        &times;
                                    </Button>
                                </div>
                            ))}
                            <Button variant="outline-secondary" size="sm" type="button" onClick={addOption}>
                                {t('attributes.form.addOption')}
                            </Button>
                        </Form.Group>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onClose} type="button">
                        {t('attributes.form.cancel')}
                    </Button>
                    <Button variant="primary" type="submit">
                        {t('attributes.form.save')}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    )
}

export default AttributeFormModal
