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

function LeaderRow({
  item, index, category, maxValue, isHitter,
}: {
  item: Hitter | Pitcher;
  index: number;
  category: string;
  maxValue: number;
  isHitter: boolean;
}) {
  const getValue = () => {
    return (item as any)[category] ?? "-";
  };

  const rawValue = getValue();
  const numValue = typeof rawValue === "string" ? parseFloat(rawValue) || 0 : (rawValue as number) || 0;
  const isLowerBetter = ["era", "whip", "fip", "bb9", "hr9"].includes(category);
  const barPct = isLowerBetter
    ? maxValue > 0 ? Math.max(0, 1 - numValue / maxValue) * 100 : 0
    : maxValue > 0 ? (numValue / maxValue) * 100 : 0;

  const teamColor = item.colors?.primary || "#666";
  const isSaber = ["ops", "obp", "slg", "iso", "babip", "bbPct", "fip", "k9", "bb9", "hr9"].includes(category);

  return (
    <div
      className="flex items-center gap-3 py-2.5 px-4 rounded-lg hover:bg-accent/60 transition-all animate-fade-in-up"
      style={{ animationDelay: `${index * 25}ms` }}
    >
      <div className="w-7 text-center font-stat text-sm text-muted-foreground shrink-0">
        {index < 3 ? (
          <span className="font-bold" style={{ color: index === 0 ? "#FFD700" : index === 1 ? "#C0C0C0" : "#CD7F32" }}>
            {index + 1}
          </span>
        ) : index + 1}
      </div>

      <div className="w-36 lg:w-44 shrink-0 flex items-center gap-2">
        <TeamBadge teamName={item.teamName} size="sm" />
        <Link
          href={`/players/${encodeURIComponent(item.playerName)}`}
          className="text-sm font-semibold hover:text-primary transition-colors truncate"
        >
          {item.playerName}
        </Link>
      </div>

      <div className="flex-1 flex items-center gap-2 min-w-0">
        <div className="flex-1 bg-border/40 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${barPct}%`,
              backgroundColor: teamColor,
              boxShadow: `0 0 6px ${teamColor}66`,
            }}
          />
        </div>
        <div className={`font-stat text-sm font-semibold w-16 text-right shrink-0 ${isSaber ? "text-blue-400 dark:text-blue-300" : "text-primary"}`}>
          {rawValue === "-" ? "-" : (typeof rawValue === "number" ? rawValue : rawValue)}
        </div>
      </div>
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

  const maxValue = data.reduce((max, item) => {
    const val = parseFloat(String((item as any)[category] ?? "0")) || 0;
    return Math.max(max, val);
  }, 0);

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

      {/* 리더보드 목록 */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3 px-4">
          <div className="w-7 text-xs font-bold text-muted-foreground uppercase">#</div>
          <div className="w-32 lg:w-40 text-xs font-bold text-muted-foreground uppercase">선수</div>
          <div className={`flex-1 text-xs font-bold uppercase tracking-wider text-right pr-16 ${isSaberCategory ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"}`}>
            {currentCat?.label}
            {isLowerBetter && <span className="ml-1 text-muted-foreground font-medium">(낮을수록 좋음)</span>}
          </div>
        </div>

        {loading ? (
          <div className="space-y-2 mt-2">
            {Array.from({ length: 15 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">데이터가 없습니다.</div>
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
