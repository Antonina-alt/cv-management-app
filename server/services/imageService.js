import { deleteImageByUrl, uploadImage } from "../lib/blobStorage.js";
import { badRequest } from "../lib/httpError.js";

export const storeImage = (file) => uploadImage(file.buffer, file.mimetype);

export const removeStoredImage = async (url) => {
    if (!url) badRequest("url is required");
    await deleteImageByUrl(url);
};
