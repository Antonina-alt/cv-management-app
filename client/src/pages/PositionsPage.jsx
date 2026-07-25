import { useTranslation } from 'react-i18next'
import ErrorAlert from '../components/common/ErrorAlert.jsx'
import PositionDialogs from '../components/positions/PositionDialogs.jsx'
import PositionList from '../components/positions/PositionList.jsx'
import PositionsToolbar from '../components/positions/PositionsToolbar.jsx'
import { usePositionsPage } from '../hooks/pages/usePositionsPage.js'

const PositionsPage = () => {
    const { t } = useTranslation()
    const page = usePositionsPage()
    return (
        <div>
            <h1>{t('positions.title')}</h1>
            <ErrorAlert error={page.banner} onClose={page.clearBanner} />
            {page.canManage && <PositionsToolbar selection={page.selection} onCreate={() => page.dialog.open('create')} onOpen={page.openSelected} onDuplicate={page.duplicate} onDelete={() => page.dialog.open('delete')} />}
            <PositionList selectedIds={page.canManage ? page.selection.ids : []} onToggleRow={page.canManage ? page.selection.toggle : undefined} onToggleAll={page.canManage ? page.selection.toggleAll : undefined} refreshToken={page.refreshToken} />
            <PositionDialogs dialog={page.dialog} selection={page.selection} onCreate={page.create} onDelete={page.remove} />
        </div>
    )
}

export default PositionsPage
