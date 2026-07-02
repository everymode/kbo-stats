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

// 타자 컬럼 정의 (네이버 스타일 — 기본 기록 + 세이버메트릭스 항상 표시)
const HITTER_COLS = [
  { key: "avg",   label: "AVG",   title: "타율" },
  { key: "games", label: "G",     title: "경기" },
  { key: "ab",    label: "AB",    title: "타수" },
  { key: "hits",  label: "H",     title: "안타" },
  { key: "doubles", label: "2B",  title: "2루타" },
  { key: "triples", label: "3B",  title: "3루타" },
  { key: "hr",    label: "HR",    title: "홈런" },
  { key: "rbi",   label: "RBI",   title: "타점" },
  { key: "runs",  label: "R",     title: "득점" },
  { key: "sb",    label: "SB",    title: "도루" },
  { key: "bb",    label: "BB",    title: "볼넷" },
  { key: "so",    label: "SO",    title: "삼진" },
  { key: "obp",   label: "OBP",   title: "출루율" },
  { key: "slg",   label: "SLG",   title: "장타율" },
  { key: "ops",   label: "OPS",   title: "출루율+장타율" },
  { key: "iso",   label: "ISO",   title: "순수장타율 (SLG-AVG)" },
  { key: "babip", label: "BABIP", title: "인플레이 타구 타율" },
];

// 투수 컬럼 정의 (네이버 스타일 — 기본 기록 + 세이버메트릭스 항상 표시)
const PITCHER_COLS = [
  { key: "era",   label: "ERA",   title: "평균자책점" },
  { key: "games", label: "G",     title: "경기" },
  { key: "wins",  label: "W",     title: "승" },
  { key: "losses", label: "L",    title: "패" },
  { key: "saves", label: "SV",    title: "세이브" },
  { key: "holds", label: "HLD",   title: "홀드" },
  { key: "ip",    label: "IP",    title: "이닝" },
  { key: "hits",  label: "H",     title: "피안타" },
  { key: "hr",    label: "HR",    title: "피홈런" },
  { key: "bb",    label: "BB",    title: "볼넷" },
  { key: "so",    label: "K",     title: "탈삼진" },
  { key: "er",    label: "ER",    title: "자책점" },
  { key: "whip",  label: "WHIP",  title: "이닝당 출루허용률" },
  { key: "k9",    label: "K/9",   title: "9이닝당 탈삼진" },
  { key: "bb9",   label: "BB/9",  title: "9이닝당 볼넷" },
  { key: "hr9",   label: "HR/9",  title: "9이닝당 피홈런" },
  { key: "fip",   label: "FIP",   title: "수비무관 평균자책점" },
];

// 세이버메트릭스(고급 지표) 컬럼 키 — 파란색 강조용
const SABER_HITTER_KEYS = new Set(["obp", "slg", "ops", "iso", "babip"]);
const SABER_PITCHER_KEYS = new Set(["whip", "k9", "bb9", "hr9", "fip"]);

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
      <div className="flex cursor-pointer items-center gap-2 border-b border-border px-4 py-2.5 transition-colors hover:bg-accent">
        <div className="w-7 shrink-0 text-center font-stat text-xs font-bold text-muted-foreground">
          {player.rank}
        </div>
        <div className="flex w-32 shrink-0 items-center gap-2">
          <TeamBadge teamName={player.teamName} size="sm" />
          <span className="truncate text-sm font-bold text-foreground transition-colors hover:text-primary">{player.playerName}</span>
        </div>
        <div className="grid flex-1 gap-1 text-right" style={{ gridTemplateColumns: `repeat(${visibleCols.length}, minmax(0, 1fr))` }}>
          {visibleCols.map((col, ci) => {
            const val = getValue(col.key);
            const isSaber = isHitter ? SABER_HITTER_KEYS.has(col.key) : SABER_PITCHER_KEYS.has(col.key);
            const isMain = ci === 0;
            return (
              <div key={col.key} title={col.title}>
                <div className={`font-stat text-xs font-semibold ${isMain ? "font-black text-primary" : isSaber ? "text-note" : "text-foreground"}`}>
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
  const [qualifiedOnly, setQualifiedOnly] = useState(false);
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
        const res = await kboApi.getHittersAll("2026");
        setData(res.data);
      } else {
        const res = await kboApi.getPitchersAll("2026");
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
    // 규정타석/규정이닝 필터 (KBO: 타석=팀경기수×3.1, 이닝=팀경기수×1.0, 대략 40경기 기준)
    let matchQualified = true;
    if (qualifiedOnly) {
      if (tab === "hitter") {
        matchQualified = ((p as Hitter).pa || 0) >= 124; // ~40경기 × 3.1
      } else {
        const ipStr = (p as Pitcher).ip || "0";
        const ipNum = parseFloat(ipStr.split(" ")[0]) || 0;
        matchQualified = ipNum >= 40; // ~40경기 × 1.0
      }
    }
    return matchTeam && matchSearch && matchQualified;
  });

  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        const va = parseFloat(String((a as any)[sortKey] ?? "0")) || 0;
        const vb = parseFloat(String((b as any)[sortKey] ?? "0")) || 0;
        return sortDir === "desc" ? vb - va : va - vb;
      })
    : filtered;

  // 표시할 컬럼 (네이버 스타일 — 항상 전체 표시)
  const visibleCols = tab === "hitter" ? HITTER_COLS : PITCHER_COLS;
  const tableMinWidth = 180 + visibleCols.length * 54;

  return (
    <div className="min-h-[calc(100vh-65px)] bg-background text-foreground">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8">
        <header className="mb-6 border-b border-border-strong pb-5">
          <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
            <Users size={14} />
            Player records
          </p>
          <h1 className="font-serif text-4xl font-black leading-tight text-foreground">
            선수 기록
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            2026 KBO 리그 · 선수 기록 조회 · 데이터 출처: KBO 공식 사이트
          </p>
        </header>

        {/* 필터 */}
        <section className="mb-5 flex flex-wrap items-center gap-3 rounded-[6px] border border-border bg-muted px-4 py-3 shadow-[0_1px_2px_rgb(17_24_39/0.08)] sm:px-5">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "hitter" | "pitcher")}>
            <TabsList className="rounded-[4px] bg-secondary">
              <TabsTrigger value="hitter" className="rounded-[3px]">타자</TabsTrigger>
              <TabsTrigger value="pitcher" className="rounded-[3px]">투수</TabsTrigger>
            </TabsList>
          </Tabs>

          <Select value={team} onValueChange={setTeam}>
            <SelectTrigger className="h-9 w-28 rounded-[4px] border-input bg-popover text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TEAMS.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative max-w-xs flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 rounded-[4px] border-input bg-popover pl-9 text-sm"
              placeholder="선수명 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* 규정타석/규정이닝 토글 */}
          <button
            onClick={() => setQualifiedOnly(!qualifiedOnly)}
            className={`rounded-[4px] border px-3.5 py-2 text-xs font-bold transition-colors ${
              qualifiedOnly
                ? "border-success/50 bg-success/10 text-success"
                : "border-border bg-popover text-muted-foreground hover:border-border-strong hover:text-foreground"
            }`}
          >
            {tab === "hitter" ? "규정타석" : "규정이닝"} {qualifiedOnly ? "ON" : "OFF"}
          </button>

          <div className="ml-auto font-stat text-xs font-bold text-muted-foreground">{filtered.length}명</div>
        </section>

        {/* 테이블 */}
        <section className="overflow-hidden rounded-[6px] border border-border bg-card shadow-[0_1px_2px_rgb(17_24_39/0.08)]">
          <div className="overflow-x-auto">
            <div style={{ minWidth: `${tableMinWidth}px` }}>
              {/* 헤더 */}
              <div className="flex items-center gap-2 border-b border-border-strong bg-muted px-4 py-2.5">
                <div className="w-7 text-xs font-black uppercase text-muted-foreground">#</div>
                <div className="w-32 text-xs font-black uppercase text-muted-foreground">선수</div>
                <div className="grid flex-1 gap-1 text-right" style={{ gridTemplateColumns: `repeat(${visibleCols.length}, minmax(0, 1fr))` }}>
                  {visibleCols.map((col) => {
                    const isSaber = SABER_HITTER_KEYS.has(col.key) || SABER_PITCHER_KEYS.has(col.key);
                    const isActive = sortKey === col.key;
                    return (
                      <button
                        key={col.key}
                        title={`${col.title} (클릭하여 정렬)`}
                        className={`flex cursor-pointer select-none items-center justify-end gap-0.5 text-xs font-black uppercase transition-colors hover:text-primary ${
                          isActive ? "text-primary" : isSaber ? "text-note" : "text-muted-foreground"
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
                <div className="space-y-2 p-4">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full rounded-[4px] bg-secondary" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">검색 결과가 없습니다.</div>
              ) : (
                <div>
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
          </div>
        </section>
      </div>
    </div>
  );
}
