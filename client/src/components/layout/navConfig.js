const NAV_ITEMS = [
    { to: '/', labelKey: 'nav.home' },
    { to: '/positions', labelKey: 'nav.positions' },
    { to: '/profile', labelKey: 'nav.profile', authenticated: true },
    { to: '/attributes', labelKey: 'nav.attributes', roles: ['RECRUITER', 'ADMIN'] },
    { to: '/admin', labelKey: 'nav.admin', roles: ['ADMIN'] },
]

const isVisible = (item, user) => {
    if (item.authenticated && !user) return false
    if (!item.roles) return true
    return Boolean(user?.roles.some((role) => item.roles.includes(role)))
}

export const getNavItems = (user) => NAV_ITEMS.filter((item) => isVisible(item, user))
