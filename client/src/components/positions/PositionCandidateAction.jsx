import { Button } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'

const PositionCandidateAction = ({ position, creating, onCreate, onOpen }) => {
    const { t } = useTranslation()
    const openOrCreate = position.myResume ? () => onOpen(position.myResume.id) : onCreate
    const label = t(position.myResume ? 'positions.resumes.open' : 'positions.resumes.create')
    return <div className="d-flex gap-2 mb-4"><Button variant="primary" disabled={creating} onClick={openOrCreate}>{label}</Button></div>
}

export default PositionCandidateAction
