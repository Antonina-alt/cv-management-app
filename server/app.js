import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import * as path from "node:path";
import adminRouter from "./routes/admin.js";
import attributeCategoriesRouter from "./routes/attributeCategories.js";
import attributesRouter from "./routes/attributes.js";
import authRouter from "./routes/auth.js";
import healthRouter from "./routes/health.js";
import homeRouter from "./routes/home.js";
import imagesRouter from "./routes/images.js";
import positionsRouter from "./routes/positions.js";
import profileRouter from "./routes/profile.js";
import resumesRouter from "./routes/resumes.js";
import searchRouter from "./routes/search.js";
import tagsRouter from "./routes/tags.js";
import { errorHandler } from "./lib/httpError.js";

const app = express();
const clientDistPath = path.resolve(process.cwd(), "../client/dist");

const apiRoutes = [
    ["/api/health", healthRouter],
    ["/api/auth", authRouter],
    ["/api/attributes", attributesRouter],
    ["/api/attribute-categories", attributeCategoriesRouter],
    ["/api/images", imagesRouter],
    ["/api/profile", profileRouter],
    ["/api/tags", tagsRouter],
    ["/api/positions", positionsRouter],
    ["/api/resumes", resumesRouter],
    ["/api/search", searchRouter],
    ["/api/home", homeRouter],
    ["/api/admin/users", adminRouter],
];

app.disable("x-powered-by");
app.use(express.json());
app.use(cookieParser());
apiRoutes.forEach(([route, router]) => app.use(route, router));
app.use("/api", (req, res) => res.status(404).json({ message: "API endpoint not found" }));
app.use(express.static(clientDistPath));
app.get(/.*/, (req, res) => res.sendFile(path.join(clientDistPath, "index.html")));
app.use(errorHandler);

export default app;
