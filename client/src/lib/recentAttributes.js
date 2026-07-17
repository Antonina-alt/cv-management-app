const STORAGE_KEY = 'cv-app:recent-attributes';
const MAX_RECENT = 5;

export const getRecentAttributeIds = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

export const pushRecentAttributeId = (id) => {
    const current = getRecentAttributeIds().filter((existingId) => existingId !== id);
    const next = [id, ...current].slice(0, MAX_RECENT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
};
