import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPitchers } from "../lib/kbo";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const season = String(req.query.season ?? "2026");
    const page = parseInt(String(req.query.page ?? "1"));
    const data = await getPitchers(season, page);
    res.json(data);
  } catch (e: any) {
    res.status(503).json({ error: e.message });
  }
}
