// Tarea programada cada minuto (Coolify → Scheduled Tasks: `node dist/enviar-emails.mjs`).
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as s from "../src/db/schema";
import { procesarCola } from "../src/lib/email";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const r = await procesarCola(drizzle(pool, { schema: s }));
if (r.enviadas || r.fallidas) console.log(`Emails: ${r.enviadas} enviados, ${r.fallidas} con error`);
await pool.end();
