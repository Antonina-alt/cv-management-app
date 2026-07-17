export const getNavItems = (user) => {
    const items = [
        { to: '/', labelKey: 'nav.home' },
        { to: '/positions', labelKey: 'nav.positions' },
    ]

    if (user) {
        items.push({ to: '/profile', labelKey: 'nav.profile' })

        if (user.roles.includes('RECRUITER') || user.roles.includes('ADMIN')) {
            items.push({ to: '/attributes', labelKey: 'nav.attributes' })
        }

        if (user.roles.includes('ADMIN')) {
            items.push({ to: '/admin', labelKey: 'nav.admin' })
        }
    }

    return items
}
