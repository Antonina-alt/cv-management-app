import { checkDatabase } from "../services/healthService.js";

export const getHealth = async (req, res) => {
    try {
        await checkDatabase();
        res.status(200).json({ status: "ok" });
    } catch {
        res.status(500).json({ status: "error" });
    }
};
