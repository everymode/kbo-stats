import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { kboApi, Hitter, Pitcher } from "@/lib/kboApi";
import TeamBadge from "@/components/TeamBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Search, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

const TEAMS = ["전체", "KIA", "삼성", "LG", "두산", "KT", "SSG", "NC", "롯데", "한화", "키움"];

// 타자 컬럼 정의 (기본 + 세이버메트릭스)
const HITTER_COLS = [
  { key: "avg",   label: "AVG",   title: "타율" },
  { key: "hr",    label: "HR",    title: "홈런" },
  { key: "rbi",   label: "RBI",   title: "타점" },
  { key: "hits",  label: "H",     title: "안타" },
  { key: "ops",   label: "OPS",   title: "출루율+장타율" },
  { key: "obp",   label: "OBP",   title: "출루율" },
  { key: "slg",   label: "SLG",   title: "장타율" },
  { key: "bbPct", label: "BB%",   title: "볼넷율" },
  { key: "kPct",  label: "K%",    title: "삼진율" },
  { key: "iso",   label: "ISO",   title: "순수장타율" },
  { key: "babip", label: "BABIP", title: "인플레이 타구 타율" },
];

// 투수 컬럼 정의 (기본 + 세이버메트릭스)
const PITCHER_COLS = [
  { key: "era",   label: "ERA",   title: "평균자책점" },
  { key: "wins",  label: "W",     title: "승" },
  { key: "so",    label: "K",     title: "탈삼진" },
  { key: "whip",  label: "WHIP",  title: "이닝당 출루허용률" },
  { key: "saves", label: "SV",    title: "세이브" },
  { key: "fip",   label: "FIP",   title: "수비무관 평균자책점" },
  { key: "k9",    label: "K/9",   title: "9이닝당 탈삼진" },
  { key: "bb9",   label: "BB/9",  title: "9이닝당 볼넷" },
  { key: "hr9",   label: "HR/9",  title: "9이닝당 피홈런" },
];

// 세이버메트릭스 컬럼 키 목록
const SABER_HITTER_KEYS = new Set(["ops", "obp", "slg", "bbPct", "kPct", "iso", "babip"]);
const SABER_PITCHER_KEYS = new Set(["fip", "k9", "bb9", "hr9"]);

function PlayerRow({ player, type, index, visibleCols }: {
  player: Hitter | Pitcher;
  type: "hitter" | "pitcher";
  index: number;
  visibleCols: typeof HITTER_COLS;
}) {
  const isHitter = type === "hitter";

  const getValue = (key: string) => {
    const val = (player as any)[key];
    if (val === undefined || val === null || val === "") return "-";
    // 숫자 0은 표시 (홈런 0개, 타점 0개 등 유효한 값)
    return val;
  };

  return (
    <Link href={`/players/${encodeURIComponent(player.playerName)}`}>
      <div
        className="flex items-center gap-2 py-2.5 px-4 rounded-lg hover:bg-accent/60 transition-all cursor-pointer animate-fade-in-up border border-transparent hover:border-border"
        style={{ animationDelay: `${index * 20}ms` }}
      >
        <div className="w-7 text-center font-stat text-xs text-muted-foreground shrink-0">
          {player.rank}
        </div>
        <div className="w-32 shrink-0 flex items-center gap-2">
          <TeamBadge teamName={player.teamName} size="sm" />
          <span className="font-semibold text-sm hover:text-primary transition-colors truncate">{player.playerName}</span>
        </div>
        <div className="flex-1 grid gap-1 text-right" style={{ gridTemplateColumns: `repeat(${visibleCols.length}, minmax(0, 1fr))` }}>
          {visibleCols.map((col, ci) => {
            const val = getValue(col.key);
            const isSaber = isHitter ? SABER_HITTER_KEYS.has(col.key) : SABER_PITCHER_KEYS.has(col.key);
            const isMain = ci === 0;
            return (
              <div key={col.key} title={col.title}>
                <div className={`font-stat text-xs font-semibold ${isMain ? "text-primary" : isSaber ? "text-blue-400 dark:text-blue-300" : "text-foreground"}`}>
                  {val}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Link>
  );
}

export default function Players() {
  const [tab, setTab] = useState<"hitter" | "pitcher">("hitter");
  const [team, setTeam] = useState("전체");
  const [search, setSearch] = useState("");
  const [showSaber, setShowSaber] = useState(false);
  const [data, setData] = useState<(Hitter | Pitcher)[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === "desc") setSortDir("asc");
      else { setSortKey(null); setSortDir("desc"); }
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setSortKey(null);
    setSortDir("desc");
    try {
      if (tab === "hitter") {
        const res = await kboApi.getHittersCombined("2026", 1);
        setData(res.data);
      } else {
        const res = await kboApi.getPitchers("2026", 1);
        setData(res.data);
      }
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = data.filter((p) => {
    const matchTeam = team === "전체" || p.teamName.includes(team) || (p as any).teamShort?.includes(team);
    const matchSearch = !search || p.playerName.includes(search) || p.teamName.includes(search);
    return matchTeam && matchSearch;
  });

  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        const va = parseFloat(String((a as any)[sortKey] ?? "0")) || 0;
        const vb = parseFloat(String((b as any)[sortKey] ?? "0")) || 0;
        return sortDir === "desc" ? vb - va : va - vb;
      })
    : filtered;

  // 표시할 컬럼 결정
  const allCols = tab === "hitter" ? HITTER_COLS : PITCHER_COLS;
  const basicCols = allCols.filter(c => !(SABER_HITTER_KEYS.has(c.key) || SABER_PITCHER_KEYS.has(c.key)));
  const saberCols = allCols.filter(c => SABER_HITTER_KEYS.has(c.key) || SABER_PITCHER_KEYS.has(c.key));
  const visibleCols = showSaber ? allCols : basicCols;

  return (
    <div className="p-4 lg:p-8">
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Users size={18} className="text-primary" />
        </div>
        <h1 className="font-display text-3xl lg:text-4xl leading-tight">선수</h1>
      </div>
      <p className="text-muted-foreground text-sm mb-8">2026 KBO 리그 — 선수 기록 조회</p>

      {/* 필터 */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-5 flex flex-wrap gap-3 items-center shadow-sm">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "hitter" | "pitcher")}>
          <TabsList className="bg-secondary">
            <TabsTrigger value="hitter">타자</TabsTrigger>
            <TabsTrigger value="pitcher">투수</TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={team} onValueChange={setTeam}>
          <SelectTrigger className="w-28 h-9 bg-secondary border-border text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TEAMS.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9 h-9 bg-secondary border-border text-sm"
            placeholder="선수명 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* 세이버메트릭스 토글 */}
        <button
          onClick={() => setShowSaber(!showSaber)}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            showSaber
              ? "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
              : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-accent border border-border"
          }`}
        >
          세이버메트릭스 {showSaber ? "ON" : "OFF"}
        </button>

        <div className="text-xs text-muted-foreground font-medium ml-auto">{filtered.length}명</div>
      </div>

      {/* 테이블 */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        {/* 헤더 */}
        <div className="flex items-center gap-2 py-3 px-4 border-b-2 border-border bg-secondary/30">
          <div className="w-7 text-xs font-bold text-muted-foreground uppercase">#</div>
          <div className="w-28 text-xs font-bold text-muted-foreground uppercase">선수</div>
          <div className="flex-1 grid gap-1 text-right" style={{ gridTemplateColumns: `repeat(${visibleCols.length}, minmax(0, 1fr))` }}>
            {visibleCols.map((col) => {
              const isSaber = SABER_HITTER_KEYS.has(col.key) || SABER_PITCHER_KEYS.has(col.key);
              const isActive = sortKey === col.key;
              return (
                <button
                  key={col.key}
                  title={`${col.title} (클릭하여 정렬)`}
                  className={`flex items-center justify-end gap-0.5 text-xs font-semibold uppercase cursor-pointer select-none transition-colors hover:text-primary ${
                    isActive ? "text-primary" : isSaber ? "text-blue-400 dark:text-blue-300" : "text-muted-foreground"
                  }`}
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}
                  {isActive ? (
                    sortDir === "desc" ? <ArrowDown size={11} /> : <ArrowUp size={11} />
                  ) : (
                    <ArrowUpDown size={10} className="opacity-30" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 15 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">검색 결과가 없습니다.</div>
        ) : (
          <div className="divide-y divide-border/30 p-1">
            {sorted.map((player, i) => (
              <PlayerRow
                key={`${player.playerName}-${i}`}
                player={player}
                type={tab}
                index={i}
                visibleCols={visibleCols}
              />
            ))}
          </div>
        )}
      </div>

      {/* 세이버메트릭스 범례 */}
      {showSaber && (
        <div className="mt-4 bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
          <div className="text-xs font-semibold text-blue-400 mb-2">세이버메트릭스 지표 설명</div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {(tab === "hitter" ? [
              { label: "OPS", desc: "출루율 + 장타율" },
              { label: "OBP", desc: "출루율" },
              { label: "SLG", desc: "장타율" },
              { label: "BB%", desc: "볼넷율 (타석 대비)" },
              { label: "K%", desc: "삼진율 (타석 대비)" },
              { label: "ISO", desc: "순수장타율 (SLG-AVG)" },
              { label: "BABIP", desc: "인플레이 타구 타율" },
            ] : [
              { label: "FIP", desc: "수비무관 평균자책점" },
              { label: "K/9", desc: "9이닝당 탈삼진" },
              { label: "BB/9", desc: "9이닝당 볼넷" },
              { label: "HR/9", desc: "9이닝당 피홈런" },
            ]).map(item => (
              <div key={item.label} className="flex gap-2 items-start">
                <span className="text-xs font-bold text-blue-400 w-12 shrink-0">{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
