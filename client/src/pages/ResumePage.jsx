import { Button } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import ErrorAlert from '../components/common/ErrorAlert.jsx'
import ResumeContent from '../components/resume/ResumeContent.jsx'
import { useResumePage } from '../hooks/pages/useResumePage.js'

const ResumePage = () => {
    const { t } = useTranslation()
    const page = useResumePage()
    if (page.loading) return <p className="text-muted">{t('resume.loading')}</p>
    if (page.error) return <ErrorAlert error={page.error} />
    if (!page.data) return null
    return (
        <div>
            <Button variant="link" className="px-0 mb-2" onClick={page.openPosition}>&larr; {page.data.position.title}</Button>
            <ErrorAlert error={page.banner} onClose={page.clearBanner} />
            <ResumeContent page={page} />
        </div>
    )
}

export default ResumePage
