import pkg from "pg";
const { Pool } = pkg;

export const pool = new Pool({
  user: "gokuljs", // Your PostgreSQL role name
  host: "localhost",
  database: "chima", // Replace with your database name
  password: "password", // Replace with your role's password
  port: 5432, // Default PostgreSQL port
});
