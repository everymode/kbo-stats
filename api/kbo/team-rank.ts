import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getTeamRank } from "../lib/kbo";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const data = await getTeamRank();
    res.json(data);
  } catch (e: any) {
    res.status(503).json({ error: e.message });
  }
}
