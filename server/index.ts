import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import {
  getTeamRank,
  getHitters,
  getHittersOps,
  getPitchers,
  getLeaderboard,
  searchPlayers,
} from "./kbo.js";

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
