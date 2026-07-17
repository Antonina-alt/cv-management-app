export class ConflictError extends Error {
    constructor(message, body) {
        super(message);
        this.name = 'ConflictError';
        this.body = body;
    }
}

export const apiRequest = async (path, options) => {
    const res = await fetch(path, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });

    const body = res.status === 204 ? null : await res.json().catch(() => null);

    if (res.status === 409) {
        throw new ConflictError(body?.message ?? 'Version conflict', body);
    }

    if (!res.ok) {
        throw new Error(body?.message ?? `Request failed with status ${res.status}`);
    }

    return body;
};
