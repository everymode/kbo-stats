import { useState, useEffect, useCallback } from "react";
import { useSearch } from "wouter";
import { kboApi, Hitter, Pitcher, TEAM_COLORS } from "@/lib/kboApi";
import TeamBadge from "@/components/TeamBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { BarChart3, RefreshCw } from "lucide-react";

const HITTER_CATEGORIES = [
  { value: "avg", label: "타율 AVG" },
  { value: "hr", label: "홈런 HR" },
  { value: "rbi", label: "타점 RBI" },
  { value: "ops", label: "OPS" },
  { value: "hits", label: "안타 H" },
  { value: "sb", label: "도루 SB" },
];

const PITCHER_CATEGORIES = [
  { value: "era", label: "평균자책점 ERA" },
  { value: "wins", label: "승리 W" },
  { value: "so", label: "탈삼진 K" },
  { value: "whip", label: "WHIP" },
  { value: "saves", label: "세이브 SV" },
  { value: "holds", label: "홀드 HLD" },
];

const TEAMS = ["전체", "KIA", "삼성", "LG", "두산", "KT", "SSG", "NC", "롯데", "한화", "키움"];
const SEASONS = ["2026", "2025", "2024", "2023", "2022"];

// ─── 바 차트 행 ───────────────────────────────────────────
function LeaderRow({
  item,
  index,
  category,
  maxValue,
  isHitter,
}: {
  item: Hitter | Pitcher;
  index: number;
  category: string;
  maxValue: number;
  isHitter: boolean;
}) {
  const getValue = () => {
    if (isHitter) {
      const h = item as Hitter;
      const map: Record<string, string | number | undefined> = {
        avg: h.avg, hr: h.hr, rbi: h.rbi, ops: h.ops, hits: h.hits, sb: h.sb,
      };
      return map[category] ?? "-";
    } else {
      const p = item as Pitcher;
      const map: Record<string, string | number | undefined> = {
        era: p.era, wins: p.wins, so: p.so, whip: p.whip, saves: p.saves, holds: p.holds,
      };
      return map[category] ?? "-";
    }
  };

  const rawValue = getValue();
  const numValue = typeof rawValue === "string" ? parseFloat(rawValue) || 0 : (rawValue as number) || 0;
  const isLowerBetter = ["era", "whip"].includes(category);
  const barPct = isLowerBetter
    ? maxValue > 0 ? Math.max(0, 1 - (numValue - 0) / maxValue) * 100 : 0
    : maxValue > 0 ? (numValue / maxValue) * 100 : 0;

  const teamColor = item.colors?.primary || "#666";

  return (
    <div
      className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-white/5 transition-colors animate-fade-in-up"
      style={{ animationDelay: `${index * 30}ms` }}
    >
      {/* 순위 */}
      <div className="w-7 text-center font-stat text-sm text-muted-foreground shrink-0">
        {index < 3 ? (
          <span
            className="font-bold"
            style={{ color: index === 0 ? "#FFD700" : index === 1 ? "#C0C0C0" : "#CD7F32" }}
          >
            {index + 1}
          </span>
        ) : (
          index + 1
        )}
      </div>

      {/* 선수명 + 팀 */}
      <div className="w-32 lg:w-40 shrink-0">
        <Link
          href={`/players/${encodeURIComponent(item.playerName)}`}
          className="text-sm font-semibold hover:text-primary transition-colors block truncate"
        >
          {item.playerName}
        </Link>
        <TeamBadge teamName={item.teamName} size="sm" />
      </div>

      {/* 바 차트 */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <div className="flex-1 bg-white/5 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${barPct}%`,
              backgroundColor: teamColor,
              boxShadow: `0 0 6px ${teamColor}66`,
            }}
          />
        </div>
        <div className="font-stat text-sm font-semibold text-foreground w-16 text-right shrink-0">
          {typeof rawValue === "number" ? rawValue : rawValue}
        </div>
      </div>
    </div>
  );
}

// ─── 메인 리더보드 ────────────────────────────────────────
export default function Leaderboard() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialTab = params.get("tab") === "pitcher" ? "pitcher" : "hitter";

  const [tab, setTab] = useState<"hitter" | "pitcher">(initialTab as "hitter" | "pitcher");
  const [category, setCategory] = useState(tab === "hitter" ? "avg" : "era");
  const [season, setSeason] = useState("2026");
  const [team, setTeam] = useState("전체");
  const [data, setData] = useState<(Hitter | Pitcher)[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const teamParam = team === "전체" ? undefined : team;
      const res = await kboApi.getLeaderboard(category, season, teamParam, 50);
      setData(res.data);
      setLastUpdated(new Date().toLocaleTimeString("ko-KR"));
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [category, season, team]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleTabChange = (val: string) => {
    const newTab = val as "hitter" | "pitcher";
    setTab(newTab);
    setCategory(newTab === "hitter" ? "avg" : "era");
  };

  const categories = tab === "hitter" ? HITTER_CATEGORIES : PITCHER_CATEGORIES;
  const isHitter = tab === "hitter";
  const isLowerBetter = ["era", "whip"].includes(category);

  const maxValue = data.reduce((max, item) => {
    const val = isHitter
      ? parseFloat(String((item as Hitter)[category as keyof Hitter] ?? "0")) || 0
      : parseFloat(String((item as Pitcher)[category as keyof Pitcher] ?? "0")) || 0;
    return Math.max(max, val);
  }, 0);

  return (
    <div className="p-4 lg:p-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={20} className="text-primary" />
            <h1 className="font-display text-3xl lg:text-4xl tracking-wider leading-none">리더보드</h1>
          </div>
          <p className="text-muted-foreground text-sm">선수별 기록 순위 — 실시간 크롤링 데이터</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg bg-secondary/50 hover:bg-secondary"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          {lastUpdated || "새로고침"}
        </button>
      </div>

      {/* 필터 영역 */}
      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* 타자/투수 탭 */}
          <Tabs value={tab} onValueChange={handleTabChange}>
            <TabsList className="bg-secondary/50">
              <TabsTrigger value="hitter">타자</TabsTrigger>
              <TabsTrigger value="pitcher">투수</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* 카테고리 */}
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-40 h-9 bg-secondary/50 border-border/50 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 시즌 */}
          <Select value={season} onValueChange={setSeason}>
            <SelectTrigger className="w-28 h-9 bg-secondary/50 border-border/50 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEASONS.map((s) => (
                <SelectItem key={s} value={s}>{s}시즌</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 팀 필터 */}
          <Select value={team} onValueChange={setTeam}>
            <SelectTrigger className="w-28 h-9 bg-secondary/50 border-border/50 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TEAMS.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 카테고리 빠른 탭 */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {categories.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                category === c.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* 리더보드 목록 */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-1 px-3">
          <div className="w-7 text-xs font-semibold text-muted-foreground uppercase tracking-wider">#</div>
          <div className="w-32 lg:w-40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">선수</div>
          <div className="flex-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right pr-16">
            {categories.find((c) => c.value === category)?.label}
          </div>
        </div>

        {loading ? (
          <div className="space-y-2 mt-2">
            {Array.from({ length: 15 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            데이터가 없습니다.
          </div>
        ) : (
          <div className="space-y-0.5 mt-2">
            {data.map((item, i) => (
              <LeaderRow
                key={`${item.playerName}-${i}`}
                item={item}
                index={i}
                category={category}
                maxValue={maxValue}
                isHitter={isHitter}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
