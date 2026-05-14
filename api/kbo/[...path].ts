import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getTeamRank,
  getHitters,
  getHittersOps,
  getHittersCombined,
  getPitchers,
  getLeaderboard,
  searchPlayers,
} from "../kbo.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  // /api/kbo/xxx 에서 xxx 추출
  const url = req.url || "";
  const path = url.replace(/\?.*$/, "").replace(/^\/api\/kbo\/?/, "");

  try {
    switch (path) {
      case "health":
        return res.json({ status: "ok", timestamp: new Date().toISOString() });

      case "team-rank": {
        const data = await getTeamRank();
        return res.json(data);
      }

      case "hitters": {
        const season = String(req.query.season ?? "2026");
        const page = parseInt(String(req.query.page ?? "1"));
        const data = await getHitters(season, page);
        return res.json(data);
      }

      case "hitters/combined": {
        const season = String(req.query.season ?? "2026");
        const page = parseInt(String(req.query.page ?? "1"));
        const data = await getHittersCombined(season, page);
        return res.json(data);
      }

      case "hitters/ops": {
        const season = String(req.query.season ?? "2026");
        const page = parseInt(String(req.query.page ?? "1"));
        const data = await getHittersOps(season, page);
        return res.json(data);
      }

      case "pitchers": {
        const season = String(req.query.season ?? "2026");
        const page = parseInt(String(req.query.page ?? "1"));
        const data = await getPitchers(season, page);
        return res.json(data);
      }

      case "leaderboard": {
        const category = String(req.query.category ?? "avg");
        const season = String(req.query.season ?? "2026");
        const team = req.query.team ? String(req.query.team) : undefined;
        const limit = parseInt(String(req.query.limit ?? "30"));
        const data = await getLeaderboard(category, season, team, limit);
        return res.json(data);
      }

      case "search": {
        const q = String(req.query.q ?? "");
        const season = String(req.query.season ?? "2026");
        if (!q) return res.json({ data: [], query: "" });
        const data = await searchPlayers(q, season);
        return res.json(data);
      }

      default:
        return res.status(404).json({ error: "Not found", path });
    }
  } catch (e: any) {
    return res.status(503).json({ error: e.message });
  }
}
