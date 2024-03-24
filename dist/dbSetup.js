import pkg from "pg";
const { Pool } = pkg;
export const pool = new Pool({
    user: "gokuljs",
    host: "localhost",
    database: "chima",
    password: "password",
    port: 5432, // Default PostgreSQL port
});
