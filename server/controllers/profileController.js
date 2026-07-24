import { getProfile, removeCandidateImage, setCandidateImage, updateAbout } from "../services/profileService.js";
import { createAttributeValue, deleteAttributeValue, updateAttributeValue } from "../services/attributeValueService.js";
import { createProject, deleteProject, updateProject } from "../services/projectService.js";

export const getCandidateProfile = async (req, res) => {
    res.status(200).json(await getProfile(req.params.candidateId, req.user));
};

export const patchCandidateImage = async (req, res) => {
    res.status(200).json(await setCandidateImage(req.params.candidateId, req.body ?? {}));
};

export const deleteCandidateImage = async (req, res) => {
    res.status(200).json(await removeCandidateImage(req.params.candidateId, req.body ?? {}));
};

export const patchCandidateAbout = async (req, res) => {
    res.status(200).json(await updateAbout(req.params.candidateId, req.body ?? {}));
};

export const postAttributeValue = async (req, res) => {
    res.status(201).json(await createAttributeValue(req.params.candidateId, req.body ?? {}));
};

export const patchAttributeValue = async (req, res) => {
    const value = await updateAttributeValue(req.params.candidateId, req.params.valueId, req.body ?? {});
    res.status(200).json(value);
};

export const removeAttributeValue = async (req, res) => {
    await deleteAttributeValue(req.params.candidateId, req.params.valueId, req.body ?? {});
    res.status(204).send();
};

export const postProject = async (req, res) => {
    res.status(201).json(await createProject(req.params.candidateId, req.body ?? {}));
};

export const patchProject = async (req, res) => {
    const project = await updateProject(req.params.candidateId, req.params.projectId, req.body ?? {});
    res.status(200).json(project);
};

export const removeProject = async (req, res) => {
    await deleteProject(req.params.candidateId, req.params.projectId, req.body ?? {});
    res.status(204).send();
};
