import { getHomeStats, getRecentPositions, normalizeRecentLimit } from "../services/homeService.js";

export const getStats = async (req, res) => {
    res.status(200).json(await getHomeStats());
};

export const getRecent = async (req, res) => {
    const limit = normalizeRecentLimit(req.query.limit);
    res.status(200).json(await getRecentPositions(req.user, limit));
};
