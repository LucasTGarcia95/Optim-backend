import app from "#app";
import db from "#db/client";

const PORT = process.env.PORT ?? 3000;

const check = await db.query("SELECT COUNT(*) FROM public.users");
console.log("Startup check — public.users count:", check.rows);

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}...`);
});
