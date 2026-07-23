import { useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import ReactMarkdown from 'react-markdown'
import { useTranslation } from 'react-i18next'

const MarkdownField = ({ value, onChange, disabled, rows = 4 }) => {
    const { t } = useTranslation()
    const [preview, setPreview] = useState(false)

    return (
        <div>
            <div className="d-flex justify-content-end mb-1">
                <Button variant="link" size="sm" className="p-0" type="button" onClick={() => setPreview((p) => !p)}>
                    {preview ? t('profile.markdown.edit') : t('profile.markdown.preview')}
                </Button>
            </div>
            {preview ? (
                <div className="border rounded p-2 bg-body-tertiary">
                    <ReactMarkdown>{value || ''}</ReactMarkdown>
                </div>
            ) : (
                <Form.Control
                    as="textarea"
                    rows={rows}
                    value={value ?? ''}
                    disabled={disabled}
                    onChange={(e) => onChange(e.target.value)}
                />
            )}
        </div>
    )
}

export default MarkdownField
