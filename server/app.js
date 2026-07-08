import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import * as path from "node:path";

dotenv.config();

const app = express();

app.use(express.json());
app.use(cookieParser());


const clientDistPath = path.resolve(process.cwd(), '../client/dist');
app.use(express.static(clientDistPath));

app.get(/.*/, (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
});

const port = process.env.PORT || 5000;

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
