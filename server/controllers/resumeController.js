import { createResume, deleteResume, getResume, likeResume, publishResume, unlikeResume } from "../services/resumeService.js";

export const postResume = async (req, res) => {
    res.status(201).json(await createResume(req.user, req.body ?? {}));
};

export const getResumeById = async (req, res) => {
    res.status(200).json(await getResume(req.user, req.params.id));
};

export const patchResumePublish = async (req, res) => {
    res.status(200).json(await publishResume(req.user, req.params.id, req.body ?? {}));
};

export const removeResume = async (req, res) => {
    await deleteResume(req.user, req.params.id, req.body ?? {});
    res.status(204).send();
};

export const putResumeLike = async (req, res) => {
    res.status(200).json(await likeResume(req.user.id, req.params.id));
};

export const deleteResumeLike = async (req, res) => {
    res.status(200).json(await unlikeResume(req.user.id, req.params.id));
};
