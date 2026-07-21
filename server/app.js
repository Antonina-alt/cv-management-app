import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import * as path from "node:path";
import healthRouter from "./routes/health.js";
import authRouter from "./routes/auth.js";
import attributesRouter from "./routes/attributes.js";
import attributeCategoriesRouter from "./routes/attributeCategories.js";
import imagesRouter from "./routes/images.js";
import profileRouter from "./routes/profile.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/attributes', attributesRouter);
app.use('/api/attribute-categories', attributeCategoriesRouter);
app.use('/api/images', imagesRouter);
app.use('/api/profile', profileRouter);

const clientDistPath = path.resolve(process.cwd(), '../client/dist');
app.use(express.static(clientDistPath));

app.get(/.*/, (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
});

export default app;
