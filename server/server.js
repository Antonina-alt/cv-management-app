import app from "./app.js";
import { ensureContainer } from "./lib/blobStorage.js";

const port = process.env.PORT || 5000;

await ensureContainer();

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
