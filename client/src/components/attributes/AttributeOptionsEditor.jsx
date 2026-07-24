import { Button, Form } from 'react-bootstrap'

const replaceAt = (items, index, value) => items.map((item, itemIndex) => itemIndex === index ? value : item)
const removeAt = (items, index) => items.filter((_, itemIndex) => itemIndex !== index)

const OptionRow = ({ index, value, removable, onChange, onRemove, t }) => (
    <div className="d-flex gap-2 mb-2">
        <Form.Control required value={value} onChange={(event) => onChange(index, event.target.value)} placeholder={t('attributes.form.optionPlaceholder', { n: index + 1 })} />
        <Button variant="outline-danger" type="button" disabled={!removable} onClick={() => onRemove(index)}>&times;</Button>
    </div>
)

const AttributeOptionsEditor = ({ options, onChange, t }) => {
    const update = (index, value) => onChange(replaceAt(options, index, value))
    const remove = (index) => onChange(removeAt(options, index))
    const add = () => onChange([...options, ''])
    return (
        <Form.Group className="mb-3">
            <Form.Label>{t('attributes.form.options')}</Form.Label>
            {options.map((option, index) => (
                <OptionRow key={index} index={index} value={option} removable={options.length > 1} onChange={update} onRemove={remove} t={t} />
            ))}
            <Button variant="outline-secondary" size="sm" type="button" onClick={add}>{t('attributes.form.addOption')}</Button>
        </Form.Group>
    )
}

export default AttributeOptionsEditor
