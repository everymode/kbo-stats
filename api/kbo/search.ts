import type { VercelRequest, VercelResponse } from "@vercel/node";
import { searchPlayers } from "../lib/kbo";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const q = String(req.query.q ?? "");
    const season = String(req.query.season ?? "2026");
    if (!q) return res.json({ data: [], query: "" });
    const data = await searchPlayers(q, season);
    res.json(data);
  } catch (e: any) {
    res.status(503).json({ error: e.message });
  }
}
