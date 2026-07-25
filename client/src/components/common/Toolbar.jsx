import { Button } from 'react-bootstrap'

const Toolbar = ({ actions, className = 'mb-3' }) => (
    <div className={`d-grid d-sm-flex flex-sm-wrap gap-2 ${className}`} role="toolbar" aria-label="toolbar">
        {actions.filter(Boolean).map(({ key, label, ...props }) => (
            <Button key={key} {...props}>{label}</Button>
        ))}
    </div>
)

export default Toolbar
