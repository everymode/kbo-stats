import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { kboApi, Hitter, Pitcher } from "@/lib/kboApi";
import TeamBadge from "@/components/TeamBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Search } from "lucide-react";

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
        className="flex items-center gap-2 py-2.5 px-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer animate-fade-in-up border border-transparent hover:border-border"
        style={{ animationDelay: `${index * 20}ms` }}
      >
        <div className="w-7 text-center font-stat text-xs text-muted-foreground shrink-0">
          {player.rank}
        </div>
        <div className="w-28 shrink-0">
          <div className="font-semibold text-sm hover:text-primary transition-colors truncate">{player.playerName}</div>
          <TeamBadge teamName={player.teamName} size="sm" />
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

  const loadData = useCallback(async () => {
    setLoading(true);
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

  // 표시할 컬럼 결정
  const allCols = tab === "hitter" ? HITTER_COLS : PITCHER_COLS;
  const basicCols = allCols.filter(c => !(SABER_HITTER_KEYS.has(c.key) || SABER_PITCHER_KEYS.has(c.key)));
  const saberCols = allCols.filter(c => SABER_HITTER_KEYS.has(c.key) || SABER_PITCHER_KEYS.has(c.key));
  const visibleCols = showSaber ? allCols : basicCols;

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center gap-2 mb-2">
        <Users size={20} className="text-primary" />
        <h1 className="font-display text-3xl lg:text-4xl tracking-wider leading-none">선수</h1>
      </div>
      <p className="text-muted-foreground text-sm mb-6">2026 KBO 리그 — 선수 기록 조회</p>

      {/* 필터 */}
      <div className="bg-card border border-border rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-center">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "hitter" | "pitcher")}>
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="hitter">타자</TabsTrigger>
            <TabsTrigger value="pitcher">투수</TabsTrigger>
          </TabsList>
        </Tabs>

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

        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9 h-9 bg-secondary/50 border-border/50 text-sm"
            placeholder="선수명 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* 세이버메트릭스 토글 */}
        <button
          onClick={() => setShowSaber(!showSaber)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            showSaber
              ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
              : "bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent"
          }`}
        >
          세이버메트릭스 {showSaber ? "ON" : "OFF"}
        </button>

        <div className="text-xs text-muted-foreground ml-auto">{filtered.length}명</div>
      </div>

      {/* 테이블 */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center gap-2 py-2 px-3 border-b border-border bg-secondary/20">
          <div className="w-7 text-xs font-semibold text-muted-foreground uppercase">#</div>
          <div className="w-28 text-xs font-semibold text-muted-foreground uppercase">선수</div>
          <div className="flex-1 grid gap-1 text-right" style={{ gridTemplateColumns: `repeat(${visibleCols.length}, minmax(0, 1fr))` }}>
            {visibleCols.map((col) => {
              const isSaber = SABER_HITTER_KEYS.has(col.key) || SABER_PITCHER_KEYS.has(col.key);
              return (
                <div key={col.key} title={col.title} className={`text-xs font-semibold uppercase ${isSaber ? "text-blue-400 dark:text-blue-300" : "text-muted-foreground"}`}>
                  {col.label}
                </div>
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
            {filtered.map((player, i) => (
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
