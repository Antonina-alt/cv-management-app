import { ERROR_CODES } from "../lib/errorCodes.js";
import { deleteImageByUrl, uploadImage } from "../lib/blobStorage.js";
import { badRequest } from "../lib/httpError.js";

export const storeImage = (file) => uploadImage(file.buffer, file.mimetype);

export const removeStoredImage = async (url) => {
    if (!url) badRequest(ERROR_CODES.IMAGE_URL_REQUIRED, { field: "url" });
    await deleteImageByUrl(url);
};
