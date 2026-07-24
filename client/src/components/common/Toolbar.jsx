import { Button, ButtonGroup } from 'react-bootstrap'

const Toolbar = ({ actions, className = 'mb-3' }) => (
    <ButtonGroup className={className} aria-label="toolbar">
        {actions.filter(Boolean).map(({ key, label, ...props }) => (
            <Button key={key} {...props}>{label}</Button>
        ))}
    </ButtonGroup>
)

export default Toolbar
