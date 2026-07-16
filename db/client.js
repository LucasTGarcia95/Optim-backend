import pg from "pg";

const options = { connectionString: process.env.DATABASE_URL };
console.log("DB connecting to:", process.env.DATABASE_URL);

// Need SSL for external database connection
if (process.env.NODE_ENV === "production") {
  options.ssl = { rejectUnauthorized: false };
}

const db = new pg.Pool(options);
export default db;
