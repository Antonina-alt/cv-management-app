import { useMemo, useState } from 'react'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { listUsers } from '../../api/admin.js'
import { useAsyncData } from '../../hooks/useAsyncData.js'
import { formatName } from '../../lib/formatName.js'
import { formatDate } from '../../lib/formatDate.js'
import CommonDataTable, { TABLE_MODE } from '../common/CommonDataTable.jsx'

const UserList = ({ selectedIds = [], onToggleRow, onToggleAll, refreshToken }) => {
    const { t, i18n } = useTranslation()
    const [query, setQuery] = useState('')
    const { data: loaded, loading, error } = useAsyncData(
        () => listUsers({ q: query || undefined }),
        [query, refreshToken],
        { debounceMs: 200 },
    )
    const users = loaded ?? []

    const columns = useMemo(() => [
        { data: (row) => formatName(row), title: t('admin.table.name') },
        { data: 'email', title: t('admin.table.email') },
        {
            data: (row) => row.roles.join(', '),
            title: t('admin.table.roles'),
            render: (data, row) => (
                <span className="d-flex flex-wrap gap-1">
                    {row.roles.map((role) => (
                        <span key={role} className="badge text-bg-secondary">{t(`admin.roles.${role}`)}</span>
                    ))}
                </span>
            ),
        },
        {
            data: 'isBlocked',
            title: t('admin.table.status'),
            render: (data, row) => (
                <span className={`badge ${row.isBlocked ? 'text-bg-danger' : 'text-bg-success'}`}>
                    {t(row.isBlocked ? 'admin.status.blocked' : 'admin.status.active')}
                </span>
            ),
        },
        {
            data: (row) => formatDate(row.createdAt, i18n.resolvedLanguage),
            title: t('admin.table.createdAt'),
        },
    ], [i18n.resolvedLanguage, t])

    return (
        <div>
            <div className="row g-2 mb-3">
                <div className="col-12 col-md-7 col-lg-5">
                    <Form.Control
                        type="search"
                        placeholder={t('admin.searchPlaceholder')}
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        aria-label={t('admin.searchPlaceholder')}
                    />
                </div>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}
            {loading && <div className="text-muted mb-2">{t('admin.loading')}</div>}

            <CommonDataTable
                data={loading ? [] : users}
                columns={columns}
                emptyMessage={t('admin.empty')}
                mode={onToggleRow ? TABLE_MODE.MULTIPLE : TABLE_MODE.READ_ONLY}
                selectedIds={selectedIds}
                onToggleRow={onToggleRow}
                onToggleAll={onToggleAll}
                getRowLabel={formatName}
            />
        </div>
    )
}

export default UserList
