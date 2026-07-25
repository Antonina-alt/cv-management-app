import { useState } from 'react'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import FieldError from '../common/FieldError.jsx'
import FormModal from '../common/FormModal.jsx'

const ROLES = ['CANDIDATE', 'RECRUITER', 'ADMIN']
const roleChanges = (initialRoles, selectedRoles) => {
    const initial = new Set(initialRoles)
    return {
        toAdd: ROLES.filter((role) => selectedRoles.has(role) && !initial.has(role)),
        toRemove: ROLES.filter((role) => !selectedRoles.has(role) && initial.has(role)),
    }
}

const toggleSetValue = (values, value) => {
    const next = new Set(values)
    next.has(value) ? next.delete(value) : next.add(value)
    return next
}

const RoleModal = ({ show, user, onClose, onSubmit, error }) => {
    const { t } = useTranslation()
    const [roles, setRoles] = useState(() => new Set(user?.roles ?? []))
    if (!user) return null
    const submit = (event) => {
        event.preventDefault()
        onSubmit(roleChanges(user.roles, roles))
    }
    return (
        <FormModal show={show} onClose={onClose} onSubmit={submit} title={t('admin.roleModal.title', { name: `${user.firstName} ${user.lastName}` })} error={error} cancelLabel={t('admin.roleModal.cancel')} submitLabel={t('admin.roleModal.save')}>
            {ROLES.map((role) => <Form.Check key={role} type="checkbox" id={`role-${role}`} label={t(`admin.roles.${role}`)} checked={roles.has(role)} onChange={() => setRoles((current) => toggleSetValue(current, role))} />)}
            <FieldError error={error} field="role" />
        </FormModal>
    )
}

export default RoleModal
