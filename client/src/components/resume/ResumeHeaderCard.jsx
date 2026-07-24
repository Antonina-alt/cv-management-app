import { Badge, Button, Card } from 'react-bootstrap'

const ResumeHeaderCard = ({ resume, canLike, liking, publishing, isComplete, onToggleLike, onPublish, t }) => (
    <Card className="mb-4">
        <Card.Body>
            <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                <div>
                    <Card.Title>{resume.position.title}</Card.Title>
                    <div className="text-muted mb-2">{[resume.position.company, resume.position.level ? t(`positions.levels.${resume.position.level}`) : null].filter(Boolean).join(' · ')}</div>
                    <Badge bg={resume.status === 'PUBLISHED' ? 'success' : 'secondary'}>{t(`resume.status.${resume.status}`)}</Badge>
                </div>
                <div className="d-flex align-items-center gap-2">
                    {canLike && <Button variant={resume.likedByMe ? 'danger' : 'outline-danger'} size="sm" disabled={liking} onClick={onToggleLike}>{resume.likedByMe ? t('resume.unlike') : t('resume.like')} ({resume.likeCount})</Button>}
                    {resume.canEdit && resume.status === 'DRAFT' && <Button variant="primary" disabled={!isComplete || publishing} onClick={onPublish}>{t('resume.publish')}</Button>}
                </div>
            </div>
        </Card.Body>
    </Card>
)

export default ResumeHeaderCard
