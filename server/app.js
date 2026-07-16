import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import * as path from "node:path";
import healthRouter from "./routes/health.js";
import authRouter from "./routes/auth.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);

const clientDistPath = path.resolve(process.cwd(), '../client/dist');
app.use(express.static(clientDistPath));

app.get(/.*/, (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
});

export default app;
