import { removeStoredImage, storeImage } from "../services/imageService.js";

export const postImage = async (req, res) => {
    res.status(201).json({ url: await storeImage(req.file) });
};

export const removeImage = async (req, res) => {
    await removeStoredImage(req.body?.url);
    res.status(204).send();
};
