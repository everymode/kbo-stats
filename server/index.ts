import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import {
  getTeamRank,
  getHitters,
  getHittersAll,
  getHittersOps,
  getHittersCombined,
  getHitterSituation,
  getPitchers,
  getPitchersAll,
  getLeaderboard,
  searchPlayers,
} from "./kbo.js";
import {
  getHomeStandings,
  getHomeRecentGames,
  getHomeLeaders,
  getHomeSummary,
} from "../api/kbo.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json());

  // ─── KBO 크롤링 API ────────────────────────────────────────
  // 모든 API 응답에 CORS 허용
  app.use("/api/kbo", (_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
  });

  app.get("/api/kbo", async (req, res) => {
    const action = String(req.query.action ?? "health");

    try {
      switch (action) {
        case "health":
          return res.json({
            status: "ok",
            timestamp: new Date().toISOString(),
          });
        case "home-summary":
          return res.json(
            await getHomeSummary(String(req.query.season ?? "2026"))
          );
        case "home-standings":
          return res.json(
            await getHomeStandings(String(req.query.season ?? "2026"))
          );
        case "home-recent-games":
          return res.json(
            await getHomeRecentGames(String(req.query.season ?? "2026"))
          );
        case "home-leaders":
          return res.json(
            await getHomeLeaders(String(req.query.season ?? "2026"))
          );
        case "team-rank":
          return res.json(await getTeamRank());
        case "hitters":
          return res.json(
            await getHitters(
              String(req.query.season ?? "2026"),
              parseInt(String(req.query.page ?? "1"))
            )
          );
        case "hitters-combined":
          return res.json(
            await getHittersCombined(
              String(req.query.season ?? "2026"),
              parseInt(String(req.query.page ?? "1"))
            )
          );
        case "hitters-all":
          return res.json(
            await getHittersAll(String(req.query.season ?? "2026"))
          );
        case "hitters-ops":
          return res.json(
            await getHittersOps(
              String(req.query.season ?? "2026"),
              parseInt(String(req.query.page ?? "1"))
            )
          );
        case "pitchers":
          return res.json(
            await getPitchers(
              String(req.query.season ?? "2026"),
              parseInt(String(req.query.page ?? "1"))
            )
          );
        case "pitchers-all":
          return res.json(
            await getPitchersAll(String(req.query.season ?? "2026"))
          );
        case "leaderboard":
          return res.json(
            await getLeaderboard(
              String(req.query.category ?? "avg"),
              String(req.query.season ?? "2026"),
              req.query.team ? String(req.query.team) : undefined,
              parseInt(String(req.query.limit ?? "30"))
            )
          );
        case "search": {
          const q = String(req.query.q ?? "");
          if (!q) return res.json({ data: [], query: "" });
          return res.json(
            await searchPlayers(q, String(req.query.season ?? "2026"))
          );
        }
        case "hitter-situation": {
          const playerId = String(req.query.playerId ?? "");
          if (!playerId)
            return res.status(400).json({ error: "playerId required" });
          return res.json(await getHitterSituation(playerId));
        }
        default:
          return res.status(404).json({ error: "Unknown action", action });
      }
    } catch (e: any) {
      return res.status(503).json({ error: e.message });
    }
  });

  // 헬스체크
  app.get("/api/kbo/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // 팀 순위
  app.get("/api/kbo/team-rank", async (_req, res) => {
    try {
      const data = await getTeamRank();
      res.json(data);
    } catch (e: any) {
      res.status(503).json({ error: e.message });
    }
  });

  // 타자 기본 기록 (AVG, HR, RBI 등)
  app.get("/api/kbo/hitters", async (req, res) => {
    try {
      const season = String(req.query.season ?? "2026");
      const page = parseInt(String(req.query.page ?? "1"));
      const data = await getHitters(season, page);
      res.json(data);
    } catch (e: any) {
      res.status(503).json({ error: e.message });
    }
  });

  // 타자 통합 기록 (Basic1 + Basic2 병합: HR, RBI, H, OPS, OBP, SLG, BB%, K%, ISO, BABIP)
  app.get("/api/kbo/hitters/combined", async (req, res) => {
    try {
      const season = String(req.query.season ?? "2026");
      const page = parseInt(String(req.query.page ?? "1"));
      const data = await getHittersCombined(season, page);
      res.json(data);
    } catch (e: any) {
      res.status(503).json({ error: e.message });
    }
  });

  // 타자 OPS 기록 (OBP, SLG, OPS 등)
  app.get("/api/kbo/hitters/ops", async (req, res) => {
    try {
      const season = String(req.query.season ?? "2026");
      const page = parseInt(String(req.query.page ?? "1"));
      const data = await getHittersOps(season, page);
      res.json(data);
    } catch (e: any) {
      res.status(503).json({ error: e.message });
    }
  });

  // 타자 상황별 기록 (볼카운트, 투수유형)
  app.get("/api/kbo/hitter-situation", async (req, res) => {
    try {
      const playerId = String(req.query.playerId ?? "");
      if (!playerId)
        return res.status(400).json({ error: "playerId required" });
      const data = await getHitterSituation(playerId);
      res.json(data);
    } catch (e: any) {
      res.status(503).json({ error: e.message });
    }
  });

  // 투수 기록
  app.get("/api/kbo/pitchers", async (req, res) => {
    try {
      const season = String(req.query.season ?? "2026");
      const page = parseInt(String(req.query.page ?? "1"));
      const data = await getPitchers(season, page);
      res.json(data);
    } catch (e: any) {
      res.status(503).json({ error: e.message });
    }
  });

  // 통합 리더보드
  app.get("/api/kbo/leaderboard", async (req, res) => {
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
  });

  // 선수 검색
  app.get("/api/kbo/search", async (req, res) => {
    try {
      const q = String(req.query.q ?? "");
      const season = String(req.query.season ?? "2026");
      if (!q) return res.json({ data: [], query: "" });
      const data = await searchPlayers(q, season);
      res.json(data);
    } catch (e: any) {
      res.status(503).json({ error: e.message });
    }
  });

  // ─── 정적 파일 서빙 ────────────────────────────────────────
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // SPA 라우팅 — 모든 경로에서 index.html 반환
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`KBO Stats 서버 실행 중: http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
