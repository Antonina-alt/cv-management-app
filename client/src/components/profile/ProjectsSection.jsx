import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ConflictError } from '../../api/http.js'
import { createProject, deleteProject, updateProject } from '../../api/profile.js'
import { useSelection } from '../../hooks/useSelection.js'
import { formatDateRange } from '../../lib/formatDate.js'
import CommonDataTable from '../common/CommonDataTable.jsx'
import { TABLE_MODE } from '../../lib/tableMode.js'
import ConfirmationModal from '../common/ConfirmationModal.jsx'
import DismissibleAlert from '../common/DismissibleAlert.jsx'
import Toolbar from '../common/Toolbar.jsx'
import ProjectFormModal from './ProjectFormModal.jsx'

const formatTags = (row) => row.tags.map(({ tag }) => tag.name).join(', ')

const ProjectsSection = ({ candidateId, initialProjects, onConflict }) => {
    const { t, i18n } = useTranslation()
    const [projects, setProjects] = useState(initialProjects)
    const selection = useSelection()
    const [modal, setModal] = useState(null)
    const [formError, setFormError] = useState(null)
    const [banner, setBanner] = useState(null)
    const closeModal = () => {
        setModal(null)
        setFormError(null)
    }
    const create = async (payload) => {
        try {
            const project = await createProject(candidateId, payload)
            setProjects((current) => [project, ...current])
            closeModal()
        } catch (error) {
            setFormError(error.message)
        }
    }
    const edit = async (payload) => {
        try {
            const project = await updateProject(candidateId, selection.single.id, { ...payload, version: selection.single.version })
            setProjects((current) => current.map((item) => item.id === project.id ? project : item))
            selection.clear()
            closeModal()
        } catch (error) {
            if (!(error instanceof ConflictError)) return setFormError(error.message)
            selection.clear()
            closeModal()
            onConflict?.()
        }
    }
    const remove = async () => {
        try {
            await Promise.all(selection.items.map(({ id, version }) => deleteProject(candidateId, id, version)))
            const removed = new Set(selection.ids)
            setProjects((current) => current.filter(({ id }) => !removed.has(id)))
            setBanner(null)
        } catch (error) {
            error instanceof ConflictError ? onConflict?.() : setBanner(error.message)
        }
        selection.clear()
        closeModal()
    }
    const columns = useMemo(() => [
        { data: 'title', title: t('profile.projects.titleColumn') },
        { data: (row) => formatDateRange(row.startDate, row.endDate, i18n.resolvedLanguage), title: t('profile.projects.period'), orderable: false },
        { data: 'description', title: t('profile.projects.description') },
        { data: formatTags, title: t('profile.projects.tags'), orderable: false },
    ], [i18n.resolvedLanguage, t])
    const actions = [
        { key: 'create', label: t('profile.projects.create'), variant: 'primary', onClick: () => setModal('create') },
        { key: 'edit', label: t('profile.projects.edit'), variant: 'outline-primary', disabled: !selection.single, onClick: () => setModal('edit') },
        { key: 'delete', label: t('profile.projects.delete'), variant: 'outline-danger', disabled: !selection.items.length, onClick: () => setModal('delete') },
    ]
    return (
        <div>
            <DismissibleAlert onClose={() => setBanner(null)}>{banner}</DismissibleAlert>
            <Toolbar actions={actions} />
            <CommonDataTable data={projects} columns={columns} emptyMessage={t('profile.projects.empty')} mode={TABLE_MODE.MULTIPLE} selectedIds={selection.ids} onToggleRow={selection.toggle} onToggleAll={selection.toggleAll} getRowLabel={(row) => row.title} />
            {modal === 'create' && <ProjectFormModal show onClose={closeModal} onSubmit={create} error={formError} />}
            {modal === 'edit' && selection.single && <ProjectFormModal key={selection.single.id} show onClose={closeModal} onSubmit={edit} project={selection.single} error={formError} />}
            <ConfirmationModal show={modal === 'delete'} onCancel={closeModal} onConfirm={remove} title={t('profile.projects.deleteConfirmTitle')} body={t('profile.projects.deleteConfirmBody', { title: selection.items.map(({ title }) => title).join(', ') })} cancelLabel={t('profile.projects.cancel')} confirmLabel={t('profile.projects.delete')} />
        </div>
    )
}

export default ProjectsSection
