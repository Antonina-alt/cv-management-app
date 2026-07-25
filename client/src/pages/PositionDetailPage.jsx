import { Button } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import ErrorAlert from '../components/common/ErrorAlert.jsx'
import PositionCandidateAction from '../components/positions/PositionCandidateAction.jsx'
import PositionDetailSections from '../components/positions/PositionDetailSections.jsx'
import PositionFormModal from '../components/positions/PositionFormModal.jsx'
import PositionSummaryCard from '../components/positions/PositionSummaryCard.jsx'
import { usePositionDetailPage } from '../hooks/pages/usePositionDetailPage.js'

const PositionDetailPage = () => {
    const { t } = useTranslation()
    const page = usePositionDetailPage()
    if (page.loading) return <p className="text-muted">{t('positions.loading')}</p>
    if (page.error) return <ErrorAlert error={page.error} />
    if (!page.data) return null
    return (
        <div>
            <Button variant="link" className="px-0 mb-2" onClick={page.goBack}>&larr; {t('common.back')}</Button>
            <ErrorAlert error={page.banner} onClose={page.clearBanner} />
            <PositionSummaryCard position={page.data} editable={page.canManage} onEdit={page.openEdit} t={t} />
            {page.canActAsCandidate && <PositionCandidateAction position={page.data} creating={page.creatingResume} onCreate={page.createCandidateResume} onOpen={page.openResume} />}
            <PositionDetailSections position={page.data} canManage={page.canManage} onPatch={page.patchPosition} />
            {page.showEdit && <PositionFormModal show onClose={page.closeEdit} onSubmit={page.editPosition} position={page.data} error={page.editError} />}
        </div>
    )
}

export default PositionDetailPage
