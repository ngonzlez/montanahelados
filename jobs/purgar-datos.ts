// Tarea programada diaria (Coolify → Scheduled Tasks: `node dist/purgar-datos.mjs`).
// Retención del PRD 11.1: pedidos 12 meses; el hash de IP, 30 días.
import { drizzle } from "drizzle-orm/node-postgres";
import { and, isNotNull, lt, sql } from "drizzle-orm";
import { Pool } from "pg";
import * as s from "../src/db/schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const pedidos = await db.delete(s.pedido).where(lt(s.pedido.creado, sql`now() - interval '12 months'`)).returning({ id: s.pedido.id });
const ips = await db
  .update(s.pedido)
  .set({ ipHash: null })
  .where(and(isNotNull(s.pedido.ipHash), lt(s.pedido.creado, sql`now() - interval '30 days'`)))
  .returning({ id: s.pedido.id });
const avisos = await db.delete(s.notificacion).where(lt(s.notificacion.creado, sql`now() - interval '12 months'`)).returning({ id: s.notificacion.id });

console.log(`Purga: ${pedidos.length} pedidos, ${ips.length} hashes de IP, ${avisos.length} avisos`);
await pool.end();
