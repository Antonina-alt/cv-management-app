import { useState } from 'react'
import { Button, Form, Modal } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'

const ROLES = ['CANDIDATE', 'RECRUITER', 'ADMIN']

const RoleModal = ({ show, user, onClose, onSubmit, error }) => {
    const { t } = useTranslation()
    const [roles, setRoles] = useState(() => new Set(user?.roles ?? []))

    const toggleRole = (role) => {
        setRoles((prev) => {
            const next = new Set(prev)
            if (next.has(role)) next.delete(role)
            else next.add(role)
            return next
        })
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        const initial = new Set(user?.roles ?? [])
        const toAdd = ROLES.filter((role) => roles.has(role) && !initial.has(role))
        const toRemove = ROLES.filter((role) => !roles.has(role) && initial.has(role))
        onSubmit({ toAdd, toRemove })
    }

    if (!user) return null

    return (
        <Modal show={show} onHide={onClose}>
            <Form onSubmit={handleSubmit}>
                <Modal.Header closeButton>
                    <Modal.Title>{t('admin.roleModal.title', { name: `${user.firstName} ${user.lastName}` })}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {error && <div className="alert alert-danger">{error}</div>}
                    {ROLES.map((role) => (
                        <Form.Check
                            key={role}
                            type="checkbox"
                            id={`role-${role}`}
                            label={t(`admin.roles.${role}`)}
                            checked={roles.has(role)}
                            onChange={() => toggleRole(role)}
                        />
                    ))}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onClose} type="button">
                        {t('admin.roleModal.cancel')}
                    </Button>
                    <Button variant="primary" type="submit">
                        {t('admin.roleModal.save')}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    )
}

export default RoleModal
