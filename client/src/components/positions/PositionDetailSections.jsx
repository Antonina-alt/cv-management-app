import { useTranslation } from 'react-i18next'
import PositionAccessRulesSection from './PositionAccessRulesSection.jsx'
import PositionAttributesSection from './PositionAttributesSection.jsx'
import PositionProjectFilterSection from './PositionProjectFilterSection.jsx'
import PositionResumesTable from './PositionResumesTable.jsx'

const PositionDetailSections = ({ position, canManage, onPatch }) => {
    const { t } = useTranslation()
    return (
        <>
            <h5>{t('positions.attributesSection.title')}</h5>
            <PositionAttributesSection attributes={position.attributes} onSave={(attributeIds) => onPatch({ attributeIds })} disabled={!canManage} />
            <h5 className="mt-4">{t('positions.projectFilter.title')}</h5>
            <PositionProjectFilterSection tags={position.projectTagFilters.map(({ tag }) => tag.name)} maxProjects={position.maxProjects} onSave={onPatch} disabled={!canManage} />
            <h5 className="mt-4">{t('positions.accessRules.title')}</h5>
            <PositionAccessRulesSection rules={position.accessRules} onSave={(accessRules) => onPatch({ accessRules })} disabled={!canManage} />
            {canManage && <><h5 className="mt-4">{t('positions.resumes.title')}</h5><PositionResumesTable resumes={position.resumes ?? []} /></>}
        </>
    )
}

export default PositionDetailSections
