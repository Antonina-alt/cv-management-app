import { createPosition, deletePosition, duplicatePosition, getPosition, listPositions, updatePosition } from "../services/positionService.js";

export const getPositions = async (req, res) => {
    res.status(200).json(await listPositions(req.query, req.user));
};

export const getPositionById = async (req, res) => {
    res.status(200).json(await getPosition(req.params.id, req.user));
};

export const postPosition = async (req, res) => {
    res.status(201).json(await createPosition(req.body ?? {}));
};

export const postPositionDuplicate = async (req, res) => {
    res.status(201).json(await duplicatePosition(req.params.id));
};

export const patchPosition = async (req, res) => {
    res.status(200).json(await updatePosition(req.params.id, req.body ?? {}));
};

export const removePosition = async (req, res) => {
    await deletePosition(req.params.id, req.body ?? {});
    res.status(204).send();
};
