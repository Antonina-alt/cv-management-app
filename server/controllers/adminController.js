import { addUserRole, deleteUser, listUsers, removeUserRole, updateUserBlock } from "../services/adminService.js";

export const getUsers = async (req, res) => {
    res.status(200).json(await listUsers(req.query.q));
};

export const patchUser = async (req, res) => {
    const user = await updateUserBlock(req.user.id, req.params.id, req.body ?? {});
    res.status(200).json(user);
};

export const removeUser = async (req, res) => {
    await deleteUser(req.user.id, req.params.id, req.body ?? {});
    res.status(204).send();
};

export const createUserRole = async (req, res) => {
    const user = await addUserRole(req.params.id, req.body?.role);
    res.status(200).json(user);
};

export const deleteUserRole = async (req, res) => {
    const user = await removeUserRole(req.params.id, req.params.role);
    res.status(200).json(user);
};
