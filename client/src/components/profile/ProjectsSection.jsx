import { useMemo, useState } from 'react'
import { Button, Modal } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import CommonDataTable, { TABLE_MODE } from '../common/CommonDataTable.jsx'
import ProjectFormModal from './ProjectFormModal.jsx'
import { createProject, deleteProject, updateProject } from '../../api/profile.js'
import { ConflictError } from '../../api/http.js'
import { useIdSelection } from '../../hooks/useIdSelection.js'
import { formatDateRange } from '../../lib/formatDate.js'

const formatTags = (row) => row.tags.map((tag) => tag.tag.name).join(', ')

const ProjectsSection = ({ candidateId, initialProjects, onConflict }) => {
    const { t, i18n } = useTranslation()
    const [projects, setProjects] = useState(initialProjects)
    const selection = useIdSelection()
    const [modal, setModal] = useState(null)
    const [formError, setFormError] = useState(null)
    const [banner, setBanner] = useState(null)

    const selected = projects.filter((project) => selection.ids.includes(project.id))
    const singleSelected = selected.length === 1 ? selected[0] : null

    const closeModal = () => {
        setModal(null)
        setFormError(null)
    }

    const handleCreate = async (payload) => {
        try {
            const created = await createProject(candidateId, payload)
            setProjects((previous) => [created, ...previous])
            setBanner(null)
            closeModal()
        } catch (error) {
            setFormError(error.message)
        }
    }

    const handleEdit = async (payload) => {
        try {
            const updated = await updateProject(candidateId, singleSelected.id, {
                ...payload,
                version: singleSelected.version,
            })
            setProjects((previous) => previous.map((project) => (project.id === updated.id ? updated : project)))
            selection.setIds([])
            setBanner(null)
            closeModal()
        } catch (error) {
            if (error instanceof ConflictError) {
                selection.setIds([])
                closeModal()
                onConflict?.()
            } else {
                setFormError(error.message)
            }
        }
    }

    const handleDelete = async () => {
        try {
            await Promise.all(selected.map((project) => deleteProject(candidateId, project.id, project.version)))
            setProjects((previous) => previous.filter((project) => !selection.ids.includes(project.id)))
            setBanner(null)
        } catch (error) {
            if (error instanceof ConflictError) onConflict?.()
            else setBanner(error.message)
        }
        selection.setIds([])
        closeModal()
    }

    const columns = useMemo(() => [
        { data: 'title', title: t('profile.projects.titleColumn') },
        {
            data: (row) => formatDateRange(row.startDate, row.endDate, i18n.resolvedLanguage),
            title: t('profile.projects.period'),
            orderable: false,
        },
        { data: 'description', title: t('profile.projects.description') },
        {
            data: formatTags,
            title: t('profile.projects.tags'),
            orderable: false,
        },
    ], [i18n.resolvedLanguage, t])

    return (
        <div>
            {banner && (
                <div className="alert alert-warning alert-dismissible" role="alert">
                    {banner}
                    <button type="button" className="btn-close" onClick={() => setBanner(null)} />
                </div>
            )}

            <div className="d-flex flex-wrap gap-2 mb-3">
                <Button variant="primary" onClick={() => setModal('create')}>
                    {t('profile.projects.create')}
                </Button>
                <Button variant="outline-primary" disabled={!singleSelected} onClick={() => setModal('edit')}>
                    {t('profile.projects.edit')}
                </Button>
                <Button variant="outline-danger" disabled={selected.length === 0} onClick={() => setModal('delete')}>
                    {t('profile.projects.delete')}
                </Button>
            </div>

            <CommonDataTable
                data={projects}
                columns={columns}
                emptyMessage={t('profile.projects.empty')}
                mode={TABLE_MODE.MULTIPLE}
                selectedIds={selection.ids}
                onToggleRow={(row) => selection.toggle(row.id)}
                onToggleAll={selection.toggleAll}
                getRowLabel={(row) => row.title}
            />

            {modal === 'create' && (
                <ProjectFormModal show onClose={closeModal} onSubmit={handleCreate} error={formError} />
            )}

            {modal === 'edit' && singleSelected && (
                <ProjectFormModal
                    key={singleSelected.id}
                    show
                    onClose={closeModal}
                    onSubmit={handleEdit}
                    project={singleSelected}
                    error={formError}
                />
            )}

            <Modal show={modal === 'delete'} onHide={closeModal}>
                <Modal.Header closeButton>
                    <Modal.Title>{t('profile.projects.deleteConfirmTitle')}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {t('profile.projects.deleteConfirmBody', { title: selected.map((project) => project.title).join(', ') })}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={closeModal}>
                        {t('profile.projects.cancel')}
                    </Button>
                    <Button variant="danger" onClick={handleDelete}>
                        {t('profile.projects.delete')}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    )
}

export default ProjectsSection
