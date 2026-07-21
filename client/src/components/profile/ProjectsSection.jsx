import { useState } from 'react'
import { Button, Modal, Table } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import ProjectFormModal from './ProjectFormModal.jsx'
import { createProject, deleteProject, updateProject } from '../../api/profile.js'
import { ConflictError } from '../../api/http.js'

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '')

// Projects are a normal modal-form CRUD (create/edit/delete), same pattern as the attribute
// library's manage page — no per-row buttons, a selection column + toolbar instead.
const ProjectsSection = ({ candidateId, initialProjects, onConflict }) => {
    const { t } = useTranslation()
    const [projects, setProjects] = useState(initialProjects)
    const [selectedIds, setSelectedIds] = useState([])
    const [modal, setModal] = useState(null)
    const [formError, setFormError] = useState(null)
    const [banner, setBanner] = useState(null)

    const selected = projects.filter((p) => selectedIds.includes(p.id))
    const singleSelected = selected.length === 1 ? selected[0] : null

    const toggleRow = (id) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
    }

    const closeModal = () => {
        setModal(null)
        setFormError(null)
    }

    const handleCreate = async (payload) => {
        try {
            const created = await createProject(candidateId, payload)
            setProjects((prev) => [created, ...prev])
            setBanner(null)
            closeModal()
        } catch (err) {
            setFormError(err.message)
        }
    }

    const handleEdit = async (payload) => {
        try {
            const updated = await updateProject(candidateId, singleSelected.id, { ...payload, version: singleSelected.version })
            setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
            setSelectedIds([])
            setBanner(null)
            closeModal()
        } catch (err) {
            if (err instanceof ConflictError) {
                setSelectedIds([])
                closeModal()
                onConflict?.()
            } else {
                setFormError(err.message)
            }
        }
    }

    const handleDelete = async () => {
        try {
            await Promise.all(selected.map((p) => deleteProject(candidateId, p.id, p.version)))
            setProjects((prev) => prev.filter((p) => !selectedIds.includes(p.id)))
            setBanner(null)
        } catch (err) {
            if (err instanceof ConflictError) {
                onConflict?.()
            } else {
                setBanner(err.message)
            }
        }
        setSelectedIds([])
        closeModal()
    }

    return (
        <div>
            {banner && (
                <div className="alert alert-warning alert-dismissible" role="alert">
                    {banner}
                    <button type="button" className="btn-close" onClick={() => setBanner(null)} />
                </div>
            )}

            <div className="d-flex gap-2 mb-3">
                <Button variant="primary" onClick={() => setModal('create')}>
                    {t('profile.projects.create')}
                </Button>
                <Button variant="outline-secondary" disabled={!singleSelected} onClick={() => setModal('edit')}>
                    {t('profile.projects.edit')}
                </Button>
                <Button variant="outline-danger" disabled={selected.length === 0} onClick={() => setModal('delete')}>
                    {t('profile.projects.delete')}
                </Button>
            </div>

            {projects.length === 0 ? (
                <p className="text-muted">{t('profile.projects.empty')}</p>
            ) : (
                <Table hover responsive>
                    <thead>
                        <tr>
                            <th style={{ width: 32 }} />
                            <th>{t('profile.projects.titleColumn')}</th>
                            <th>{t('profile.projects.period')}</th>
                            <th>{t('profile.projects.description')}</th>
                            <th>{t('profile.projects.tags')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {projects.map((project) => (
                            <tr key={project.id}>
                                <td>
                                    <input
                                        type="checkbox"
                                        className="form-check-input"
                                        checked={selectedIds.includes(project.id)}
                                        onChange={() => toggleRow(project.id)}
                                        aria-label={project.title}
                                    />
                                </td>
                                <td>{project.title}</td>
                                <td>{formatDate(project.startDate)} – {formatDate(project.endDate)}</td>
                                <td className="text-truncate d-inline-block" style={{ maxWidth: 320 }}>
                                    {project.description}
                                </td>
                                <td>{project.tags.map((t) => t.tag.name).join(', ')}</td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            )}

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
                    {t('profile.projects.deleteConfirmBody', { title: selected.map((p) => p.title).join(', ') })}
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
