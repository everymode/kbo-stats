import { useState, useEffect, useCallback } from "react";
import { useSearch } from "wouter";
import { kboApi, Hitter, Pitcher } from "@/lib/kboApi";
import TeamBadge from "@/components/TeamBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { BarChart3, RefreshCw } from "lucide-react";

const HITTER_CATEGORIES = [
  { value: "avg",   label: "타율 AVG",   group: "기본" },
  { value: "hr",    label: "홈런 HR",    group: "기본" },
  { value: "rbi",   label: "타점 RBI",   group: "기본" },
  { value: "hits",  label: "안타 H",     group: "기본" },
  { value: "ops",   label: "OPS",        group: "세이버" },
  { value: "obp",   label: "출루율 OBP", group: "세이버" },
  { value: "slg",   label: "장타율 SLG", group: "세이버" },
  { value: "iso",   label: "ISO",        group: "세이버" },
  { value: "babip", label: "BABIP",      group: "세이버" },
  { value: "bbPct", label: "BB%",        group: "세이버" },
  { value: "sb",    label: "도루 SB",    group: "기본" },
];

const PITCHER_CATEGORIES = [
  { value: "era",   label: "ERA",        group: "기본" },
  { value: "wins",  label: "승리 W",     group: "기본" },
  { value: "so",    label: "탈삼진 K",   group: "기본" },
  { value: "whip",  label: "WHIP",       group: "기본" },
  { value: "saves", label: "세이브 SV",  group: "기본" },
  { value: "holds", label: "홀드 HLD",   group: "기본" },
  { value: "fip",   label: "FIP",        group: "세이버" },
  { value: "k9",    label: "K/9",        group: "세이버" },
  { value: "bb9",   label: "BB/9",       group: "세이버" },
  { value: "hr9",   label: "HR/9",       group: "세이버" },
];

const TEAMS = ["전체", "KIA", "삼성", "LG", "두산", "KT", "SSG", "NC", "롯데", "한화", "키움"];
const SEASONS = ["2026", "2025", "2024", "2023", "2022"];

const SABER_CATS = new Set(["ops","obp","slg","iso","babip","bbPct","fip","k9","bb9","hr9"]);

function ctxStats(item: any, cat: string, isH: boolean) {
  const h = [
    { l: "G", v: item.games, k: "games" }, { l: "PA", v: item.pa, k: "pa" },
    { l: "AVG", v: item.avg, k: "avg" }, { l: "HR", v: item.hr, k: "hr" }, { l: "RBI", v: item.rbi, k: "rbi" },
  ];
  const p = [
    { l: "G", v: item.games, k: "games" }, { l: "IP", v: item.ip, k: "ip" },
    { l: "ERA", v: item.era, k: "era" }, { l: "W", v: item.wins, k: "wins" }, { l: "K", v: item.so, k: "so" },
  ];
  return (isH ? h : p).filter(s => s.k !== cat).slice(0, 3);
}

function TopCard({ item, rank, cat, isH }: { item: any; rank: number; cat: string; isH: boolean }) {
  const tc = item.colors?.primary || "#666";
  const val = item[cat] ?? "-";
  const ctx = ctxStats(item, cat, isH);
  const first = rank === 1;

  return (
    <div
      className={`relative rounded-xl border border-border overflow-hidden animate-fade-in-up ${first ? "shadow-lg" : "shadow-sm"}`}
      style={{ animationDelay: `${rank * 50}ms`, background: `linear-gradient(160deg, ${tc}0D 0%, transparent 50%)` }}
    >
      <div className={first ? "h-1.5" : "h-1"} style={{ backgroundColor: tc }} />
      <div className={first ? "p-5" : "p-4"}>
        <div
          className={`font-stat font-black leading-none mb-3 ${first ? "text-4xl" : "text-2xl"}`}
          style={{ color: tc, opacity: first ? 1 : 0.45 }}
        >
          {rank}
        </div>
        <div className="flex items-center gap-2 mb-3">
          <TeamBadge teamName={item.teamName} size="sm" />
          <div className="min-w-0">
            <Link
              href={`/players/${encodeURIComponent(item.playerName)}`}
              className={`font-semibold hover:text-primary transition-colors block truncate ${first ? "text-base" : "text-sm"}`}
            >
              {item.playerName}
            </Link>
            <span className="text-xs text-muted-foreground">{item.teamShort}</span>
          </div>
        </div>
        <div className={`font-stat font-bold ${first ? "text-4xl" : "text-2xl"} ${SABER_CATS.has(cat) ? "text-blue-400" : ""}`}>
          {val}
        </div>
        <div className="flex gap-4 mt-3 pt-3 border-t border-border/40">
          {ctx.map(s => (
            <div key={s.l}>
              <div className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">{s.l}</div>
              <div className="text-xs font-stat font-medium text-muted-foreground">{s.v ?? "-"}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CompactRow({ item, rank, cat, isH }: { item: any; rank: number; cat: string; isH: boolean }) {
  const tc = item.colors?.primary || "#666";
  const val = item[cat] ?? "-";
  const ctx = ctxStats(item, cat, isH);

  return (
    <div
      className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-accent/50 transition-all animate-fade-in-up"
      style={{ animationDelay: `${Math.min(rank, 20) * 15}ms`, borderLeft: `3px solid ${tc}` }}
    >
      <div className="w-7 text-center font-stat text-sm text-muted-foreground shrink-0">{rank}</div>
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <TeamBadge teamName={item.teamName} size="sm" />
        <Link
          href={`/players/${encodeURIComponent(item.playerName)}`}
          className="text-sm font-semibold hover:text-primary transition-colors truncate"
        >
          {item.playerName}
        </Link>
      </div>
      <div className={`w-16 text-right font-stat text-sm font-bold shrink-0 ${SABER_CATS.has(cat) ? "text-blue-400" : "text-primary"}`}>
        {val}
      </div>
      {ctx.map(s => (
        <div key={s.l} className="w-12 text-right shrink-0 hidden sm:block">
          <div className="text-xs font-stat text-muted-foreground">{s.v ?? "-"}</div>
        </div>
      ))}
    </div>
  );
}

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
  const basicCats = categories.filter(c => c.group === "기본");
  const saberCats = categories.filter(c => c.group === "세이버");
  const isHitter = tab === "hitter";
  const isLowerBetter = ["era", "whip", "fip", "bb9", "hr9"].includes(category);

  const currentCat = categories.find(c => c.value === category);
  const isSaberCategory = currentCat?.group === "세이버";

  return (
    <div className="p-4 lg:p-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 size={18} className="text-primary" />
            </div>
            <h1 className="font-display text-3xl lg:text-4xl leading-tight">리더보드</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">선수별 기록 순위 — 실시간 크롤링 데이터</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-3 py-2 rounded-lg bg-card border border-border hover:border-primary/30 shadow-sm"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          {lastUpdated || "새로고침"}
        </button>
      </div>

      {/* 필터 */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-5 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center mb-4">
          <Tabs value={tab} onValueChange={handleTabChange}>
            <TabsList className="bg-secondary">
              <TabsTrigger value="hitter">타자</TabsTrigger>
              <TabsTrigger value="pitcher">투수</TabsTrigger>
            </TabsList>
          </Tabs>

          <Select value={season} onValueChange={setSeason}>
            <SelectTrigger className="w-28 h-9 bg-secondary border-border text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEASONS.map((s) => <SelectItem key={s} value={s}>{s}시즌</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={team} onValueChange={setTeam}>
            <SelectTrigger className="w-28 h-9 bg-secondary border-border text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TEAMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* 기본 스탯 탭 */}
        <div className="mb-2">
          <div className="text-xs text-muted-foreground mb-1.5 font-semibold uppercase tracking-wider">기본 스탯</div>
          <div className="flex flex-wrap gap-1.5">
            {basicCats.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  category === c.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-accent border border-border"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* 세이버메트릭스 탭 */}
        <div>
          <div className="text-xs text-blue-400 mb-1.5 font-semibold uppercase tracking-wider">세이버메트릭스</div>
          <div className="flex flex-wrap gap-1.5">
            {saberCats.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  category === c.value
                    ? "bg-blue-600 text-white shadow-sm dark:bg-blue-500"
                    : "bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 리더보드 */}
      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-52 rounded-xl" />)}
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
            {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
          </div>
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-2xl">데이터가 없습니다.</div>
      ) : (
        <>
          {/* Top 3 포디움 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            {data.slice(0, 3).map((item, i) => (
              <TopCard key={`top-${item.playerName}`} item={item} rank={i + 1} cat={category} isH={isHitter} />
            ))}
          </div>

          {/* 4위~ 컴팩트 테이블 */}
          {data.length > 3 && (
            <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 px-3 py-1.5 mb-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <div className="w-7 text-center">#</div>
                <div className="flex-1">선수</div>
                <div className={`w-16 text-right ${isSaberCategory ? "text-blue-500/70" : ""}`}>
                  {currentCat?.label?.split(" ").pop() || category}
                  {isLowerBetter && " ↓"}
                </div>
                {ctxStats(data[3], category, isHitter).map(s => (
                  <div key={s.l} className="w-12 text-right hidden sm:block">{s.l}</div>
                ))}
              </div>
              <div className="space-y-0.5">
                {data.slice(3).map((item, i) => (
                  <CompactRow key={`${item.playerName}-${i}`} item={item} rank={i + 4} cat={category} isH={isHitter} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
