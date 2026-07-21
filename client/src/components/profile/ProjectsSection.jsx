import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Modal } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import DataTable from 'datatables.net-react'
import DT from 'datatables.net-bs5'
import 'datatables.net-bs5/css/dataTables.bootstrap5.css'
import ProjectFormModal from './ProjectFormModal.jsx'
import { createProject, deleteProject, updateProject } from '../../api/profile.js'
import { ConflictError } from '../../api/http.js'

// eslint-disable-next-line react-hooks/rules-of-hooks -- DataTables static registration, not a React hook
DataTable.use(DT)

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
    const dtRef = useRef(null)
    const headerCheckboxRef = useRef(null)
    const onToggleRowRef = useRef(null)
    const onToggleAllRef = useRef(null)
    const projectsRef = useRef(projects)

    const selected = projects.filter((p) => selectedIds.includes(p.id))
    const singleSelected = selected.length === 1 ? selected[0] : null

    const toggleRow = (id) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
    }

    const toggleAll = (rows, selectAll) => {
        setSelectedIds((prev) => {
            if (selectAll) {
                const existing = new Set(prev)
                return [...prev, ...rows.map((p) => p.id).filter((id) => !existing.has(id))]
            }
            const removed = new Set(rows.map((p) => p.id))
            return prev.filter((id) => !removed.has(id))
        })
    }

    useEffect(() => {
        onToggleRowRef.current = (row) => toggleRow(row.id)
        onToggleAllRef.current = toggleAll
        projectsRef.current = projects
    })

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

    const columns = useMemo(() => [
        { data: null, title: '', orderable: false, className: 'dt-checkbox-column', width: '1%' },
        { data: 'title', title: t('profile.projects.titleColumn') },
        { data: null, title: t('profile.projects.period'), orderable: false },
        { data: 'description', title: t('profile.projects.description') },
        { data: null, title: t('profile.projects.tags'), orderable: false },
    ], [t])

    const slots = useMemo(() => ({
        2: (data, row) => <>{formatDate(row.startDate)} – {formatDate(row.endDate)}</>,
        3: (data, row) => (
            <span className="text-truncate d-inline-block" style={{ maxWidth: 320 }}>{row.description}</span>
        ),
        4: (data, row) => <>{row.tags.map((tag) => tag.tag.name).join(', ')}</>,
    }), [])

    const options = useMemo(() => ({
        searching: false,
        autoWidth: false,
        language: { emptyTable: t('profile.projects.empty') },
        createdRow: (row, data) => {
            row.style.cursor = 'pointer'
            row.onclick = () => onToggleRowRef.current?.(data)

            const checkboxCell = row.cells[0]
            checkboxCell.style.width = '1px'
            checkboxCell.style.whiteSpace = 'nowrap'
            const checkbox = document.createElement('input')
            checkbox.type = 'checkbox'
            checkbox.className = 'form-check-input'
            checkbox.setAttribute('aria-label', data.title)
            checkbox.onclick = (e) => {
                e.stopPropagation()
                onToggleRowRef.current?.(data)
            }
            checkboxCell.replaceChildren(checkbox)
        },
        initComplete: function initComplete() {
            const headerCell = this.api().table().header().querySelector('th')
            headerCell.style.width = '1px'
            headerCell.style.whiteSpace = 'nowrap'
            const checkbox = document.createElement('input')
            checkbox.type = 'checkbox'
            checkbox.className = 'form-check-input'
            checkbox.setAttribute('aria-label', t('attributes.selectAll'))
            checkbox.onclick = (e) => {
                e.stopPropagation()
                onToggleAllRef.current?.(projectsRef.current, e.target.checked)
            }
            headerCell.replaceChildren(checkbox)
            headerCheckboxRef.current = checkbox
        },
    }), [t])

    useEffect(() => {
        const api = dtRef.current?.dt()
        if (!api) return
        api.rows().every(function syncSelected() {
            const node = this.node()
            if (!node) return
            const isSelected = selectedIds.includes(this.data().id)
            node.classList.toggle('table-active', isSelected)
            const checkbox = node.querySelector('input[type="checkbox"]')
            if (checkbox) checkbox.checked = isSelected
        })

        const headerCheckbox = headerCheckboxRef.current
        if (headerCheckbox) {
            const selectedCount = projects.filter((p) => selectedIds.includes(p.id)).length
            headerCheckbox.checked = projects.length > 0 && selectedCount === projects.length
            headerCheckbox.indeterminate = selectedCount > 0 && selectedCount < projects.length
        }
    }, [selectedIds, projects])

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
                <Button variant="outline-primary" disabled={!singleSelected} onClick={() => setModal('edit')}>
                    {t('profile.projects.edit')}
                </Button>
                <Button variant="outline-danger" disabled={selected.length === 0} onClick={() => setModal('delete')}>
                    {t('profile.projects.delete')}
                </Button>
            </div>

            <DataTable
                ref={dtRef}
                data={projects}
                columns={columns}
                slots={slots}
                options={options}
                className="table table-hover"
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
