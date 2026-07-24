export const formatDate = (value, locale) => {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return new Intl.DateTimeFormat(locale).format(date)
}

export const formatDateRange = (from, to, locale) => {
    const start = formatDate(from, locale)
    const end = formatDate(to, locale)
    return [start, end].filter(Boolean).join(' – ')
}
