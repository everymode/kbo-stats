import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getLeaderboard } from "../lib/kbo";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const category = String(req.query.category ?? "avg");
    const season = String(req.query.season ?? "2026");
    const team = req.query.team ? String(req.query.team) : undefined;
    const limit = parseInt(String(req.query.limit ?? "30"));
    const data = await getLeaderboard(category, season, team, limit);
    res.json(data);
  } catch (e: any) {
    res.status(503).json({ error: e.message });
  }
}
