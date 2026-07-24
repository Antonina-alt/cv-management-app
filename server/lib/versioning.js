export const VERSION_CONFLICT = "VERSION_CONFLICT";

export const updateVersioned = (delegate, id, version, data) => delegate.updateMany({
    where: { id, version },
    data: { ...data, version: { increment: 1 } },
});

export const deleteVersioned = (delegate, id, version) => delegate.deleteMany({
    where: { id, version },
});

export const ensureUpdated = (result) => {
    if (result.count === 0) throw new Error(VERSION_CONFLICT);
};
