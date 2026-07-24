import { listAttributeCategories, listTags } from "../services/catalogService.js";

export const getAttributeCategories = async (req, res) => {
    res.status(200).json(await listAttributeCategories());
};

export const getTags = async (req, res) => {
    res.status(200).json(await listTags(req.query.q));
};
