const request = async (path, options) => {
    const res = await fetch(`/api/auth${path}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
        throw new Error(body?.message ?? `Request failed with status ${res.status}`);
    }

    return body;
};

export const register = (data) => request('/register', { method: 'POST', body: JSON.stringify(data) });

export const login = (data) => request('/login', { method: 'POST', body: JSON.stringify(data) });

export const logout = () => request('/logout', { method: 'POST' });

export const me = () => request('/me', { method: 'GET' });

export const updateMe = (patch) => request('/me', { method: 'PATCH', body: JSON.stringify(patch) });
