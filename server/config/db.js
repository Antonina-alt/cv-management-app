import {Pool} from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    port: Number(process.env.DATABASE_PORT),
})

pool.on("connect", () => {
    console.log("Connected to DB!");
})

pool.on("error", (err) => {
    console.error("Error while connecting to DB!", err);
})

export default pool;