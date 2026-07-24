import { runSearch } from "../services/searchService.js";

const emptyResults = { positions: [], projects: [], resumes: [] };

export const search = async (req, res) => {
    const query = String(req.query.q ?? "").trim();
    const results = query ? await runSearch(query, req.user ?? null) : emptyResults;
    res.status(200).json(results);
};
