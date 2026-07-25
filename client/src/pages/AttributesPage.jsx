import { useTranslation } from 'react-i18next'
import AttributeDialogs from '../components/attributes/AttributeDialogs.jsx'
import AttributeList from '../components/attributes/AttributeList.jsx'
import AttributesToolbar from '../components/attributes/AttributesToolbar.jsx'
import ErrorAlert from '../components/common/ErrorAlert.jsx'
import { useAttributesPage } from '../hooks/pages/useAttributesPage.js'

const AttributesPage = () => {
    const { t } = useTranslation()
    const page = useAttributesPage()
    return (
        <div>
            <h1>{t('attributes.title')}</h1>
            <ErrorAlert error={page.banner} onClose={page.clearBanner} />
            <AttributesToolbar selection={page.selection} hasSystem={page.hasSystem} onCreate={() => page.dialog.open('create')} onEdit={() => page.dialog.open('edit')} onDelete={() => page.dialog.open('delete')} />
            <AttributeList selectedIds={page.selection.ids} onToggleRow={page.toggleAttribute} onToggleAll={page.selection.toggleAll} refreshToken={page.refreshToken} />
            <AttributeDialogs dialog={page.dialog} selection={page.selection} categories={page.categories} onCreate={page.create} onEdit={page.edit} onDelete={page.remove} />
        </div>
    )
}

export default AttributesPage
