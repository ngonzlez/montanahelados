import { NextResponse } from "next/server";
import { pool } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await pool.query("select 1");
    return NextResponse.json({ ok: true, base: "ok" });
  } catch {
    return NextResponse.json({ ok: false, base: "sin conexión" }, { status: 503 });
  }
}
