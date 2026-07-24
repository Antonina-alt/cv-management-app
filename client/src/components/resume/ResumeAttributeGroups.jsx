import { Card } from 'react-bootstrap'
import ResumeAttributeField from './ResumeAttributeField.jsx'

const AttributeGroup = ({ category, attributes, canEdit, onEmptyChange, onSave, t }) => (
    <div className="mt-4">
        <h5>{category || t('resume.attributes.uncategorized')}</h5>
        <Card><Card.Body>{attributes.map((item) => <ResumeAttributeField key={item.attributeId} attribute={item.attribute} value={item} editable={canEdit} onEmptyChange={onEmptyChange} onSave={(updated) => onSave(item, updated)} />)}</Card.Body></Card>
    </div>
)

const groupByCategory = (attributes) => {
    const groups = new Map()
    attributes.forEach((item) => {
        const category = item.attribute.category?.name ?? ''
        groups.set(category, [...(groups.get(category) ?? []), item])
    })
    return [...groups.entries()]
}

const ResumeAttributeGroups = ({ attributes, canEdit, onEmptyChange, onSave, t }) => groupByCategory(attributes).map(([category, items]) => (
    <AttributeGroup key={category || 'uncategorized'} category={category} attributes={items} canEdit={canEdit} onEmptyChange={onEmptyChange} onSave={onSave} t={t} />
))

export default ResumeAttributeGroups
