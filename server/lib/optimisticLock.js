export const updateWithVersion = (delegate, id, version, data) =>
    delegate.updateMany({
        where: { id, version },
        data: { ...data, version: { increment: 1 } },
    });

export const deleteWithVersion = (delegate, id, version) =>
    delegate.deleteMany({ where: { id, version } });
