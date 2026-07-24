import { Button, Card } from 'react-bootstrap'
import AccessBadge from '../common/AccessBadge.jsx'

const PositionSummaryCard = ({ position, editable, onEdit, t }) => (
    <Card className="mb-4">
        <Card.Body>
            <div className="d-flex justify-content-between align-items-start">
                <div>
                    <Card.Title>{position.title}</Card.Title>
                    <div className="text-muted mb-2">{[position.company, position.level ? t(`positions.levels.${position.level}`) : null].filter(Boolean).join(' · ')}</div>
                    <AccessBadge isPublic={position.isPublic} />
                    {position.description && <p className="mt-3 mb-0">{position.description}</p>}
                </div>
                {editable && <Button variant="outline-primary" size="sm" onClick={onEdit}>{t('positions.toolbar.edit')}</Button>}
            </div>
        </Card.Body>
    </Card>
)

export default PositionSummaryCard
