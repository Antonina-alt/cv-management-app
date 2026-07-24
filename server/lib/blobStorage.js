import "dotenv/config";
import { randomUUID } from "node:crypto";
import { BlobServiceClient } from "@azure/storage-blob";

const EXTENSION_BY_MIME_TYPE = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
};

const getContainerClient = () => {
    const service = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
    return service.getContainerClient(process.env.AZURE_STORAGE_CONTAINER);
};

const createBlobName = (mimetype) => {
    const extension = EXTENSION_BY_MIME_TYPE[mimetype] ?? "bin";
    return `${randomUUID()}.${extension}`;
};

export const ensureContainer = async () => {
    const container = getContainerClient();
    await container.createIfNotExists({ access: "blob" });
    await container.setAccessPolicy("blob");
};

export const uploadImage = async (buffer, mimetype) => {
    const blob = getContainerClient().getBlockBlobClient(createBlobName(mimetype));
    await blob.uploadData(buffer, { blobHTTPHeaders: { blobContentType: mimetype } });
    return blob.url;
};

const blobNameFromUrl = (container, url) => {
    if (!url?.startsWith(container.url)) return null;
    return decodeURIComponent(url.slice(container.url.length + 1));
};

export const deleteImageByUrl = async (url) => {
    const container = getContainerClient();
    const blobName = blobNameFromUrl(container, url);
    if (blobName) await container.getBlockBlobClient(blobName).deleteIfExists();
};
