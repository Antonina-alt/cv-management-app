export const createCheckbox = (label, onToggle) => {
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.className = 'form-check-input'
    checkbox.setAttribute('aria-label', label)
    checkbox.onclick = (event) => {
        event.stopPropagation()
        onToggle(event.target.checked)
    }
    return checkbox
}

export const wireCheckboxCell = (cell, label, onToggle) => {
    cell.replaceChildren(createCheckbox(label, onToggle))
}
