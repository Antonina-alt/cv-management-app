export const createCheckbox = (label, onToggle) => {
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.className = 'form-check-input'
    checkbox.setAttribute('aria-label', label)
    checkbox.onclick = (e) => { e.stopPropagation(); onToggle(e.target.checked) }
    return checkbox
}

export const wireCheckboxCell = (cell, label, onToggle) => {
    cell.style.width = '1px'
    cell.style.whiteSpace = 'nowrap'
    cell.replaceChildren(createCheckbox(label, onToggle))
}
