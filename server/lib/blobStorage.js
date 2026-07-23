import { randomUUID } from "node:crypto";
import { BlobServiceClient } from "@azure/storage-blob";

const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
const containerClient = blobServiceClient.getContainerClient(process.env.AZURE_STORAGE_CONTAINER);

const EXTENSION_BY_MIME_TYPE = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
};

export const ensureContainer = async () => {
    await containerClient.createIfNotExists({ access: "blob" });
    await containerClient.setAccessPolicy("blob");
};

export const uploadImage = async (buffer, mimetype) => {
    const extension = EXTENSION_BY_MIME_TYPE[mimetype] ?? "bin";
    const blobName = `${randomUUID()}.${extension}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(buffer, {
        blobHTTPHeaders: { blobContentType: mimetype },
    });

    return blockBlobClient.url;
};

export const deleteImageByUrl = async (url) => {
    const blobName = url?.startsWith(containerClient.url) ? url.slice(containerClient.url.length + 1) : null;
    if (!blobName) {
        return;
    }

    await containerClient.getBlockBlobClient(decodeURIComponent(blobName)).deleteIfExists();
};
