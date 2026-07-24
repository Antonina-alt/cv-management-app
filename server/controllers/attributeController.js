import { createAttribute, deleteAttribute, listAttributes, updateAttribute } from "../services/attributeService.js";

export const getAttributes = async (req, res) => {
    res.status(200).json(await listAttributes(req.query));
};

export const postAttribute = async (req, res) => {
    res.status(201).json(await createAttribute(req.body ?? {}));
};

export const patchAttribute = async (req, res) => {
    res.status(200).json(await updateAttribute(req.params.id, req.body ?? {}));
};

export const removeAttribute = async (req, res) => {
    await deleteAttribute(req.params.id, req.body ?? {});
    res.status(204).send();
};
