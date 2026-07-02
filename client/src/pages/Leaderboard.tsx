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
  const tc = item.colors?.primary || "var(--primary)";
  const val = item[cat] ?? "-";
  const ctx = ctxStats(item, cat, isH);
  const first = rank === 1;
  const photoUrl = item.photoUrl || "";

  return (
    <article
      className="relative overflow-hidden rounded-[6px] border border-border bg-popover shadow-[0_1px_2px_rgb(17_24_39/0.08)] transition-colors hover:border-border-strong animate-fade-in-up"
      style={{ animationDelay: `${rank * 50}ms`, borderTop: `3px solid ${tc}` }}
    >
      <div className={first ? "p-5" : "p-4"}>
        <div className="flex gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[3px] bg-foreground font-stat text-sm font-black text-background">
            {rank}
          </div>
          <div className="flex-1 min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <TeamBadge teamName={item.teamName} size="sm" />
              <div className="min-w-0">
                <Link
                  href={`/players/${encodeURIComponent(item.playerName)}`}
                  className={`block truncate font-bold text-foreground transition-colors hover:text-primary ${first ? "text-base" : "text-sm"}`}
                >
                  {item.playerName}
                </Link>
                <span className="text-xs text-muted-foreground">{item.teamShort}</span>
              </div>
            </div>
            <div className={`font-stat font-black text-primary ${first ? "text-[34px] leading-none" : "text-2xl"}`}>
              {val}
            </div>
          </div>
          {photoUrl && (
            <img
              src={photoUrl}
              alt={item.playerName}
              className={`shrink-0 rounded-[4px] border border-border object-cover object-top grayscale-[15%] ${first ? "h-24 w-20" : "h-20 w-16"}`}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}
        </div>
        <div className="mt-3 flex gap-4 border-t border-border pt-3">
          {ctx.map(s => (
            <div key={s.l}>
              <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{s.l}</div>
              <div className="font-stat text-xs font-semibold text-foreground">{s.v ?? "-"}</div>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function CompactRow({ item, rank, cat, isH }: { item: any; rank: number; cat: string; isH: boolean }) {
  const tc = item.colors?.primary || "var(--primary)";
  const val = item[cat] ?? "-";
  const ctx = ctxStats(item, cat, isH);

  return (
    <div
      className="flex items-center gap-2 border-b border-border px-3 py-2.5 transition-colors hover:bg-accent"
      style={{ borderLeft: `3px solid ${tc}` }}
    >
      <div className="w-7 shrink-0 text-center font-stat text-sm font-black text-foreground">{rank}</div>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <TeamBadge teamName={item.teamName} size="sm" />
        <Link
          href={`/players/${encodeURIComponent(item.playerName)}`}
          className="truncate text-sm font-bold text-foreground transition-colors hover:text-primary"
        >
          {item.playerName}
        </Link>
      </div>
      <div className="w-16 shrink-0 text-right font-stat text-sm font-black text-primary">
        {val}
      </div>
      {ctx.map(s => (
        <div key={s.l} className="hidden w-12 shrink-0 text-right sm:block">
          <div className="font-stat text-xs text-muted-foreground">{s.v ?? "-"}</div>
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

  return (
    <div className="min-h-[calc(100vh-65px)] bg-background text-foreground">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8">
        <header className="mb-6 border-b border-border-strong pb-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                <BarChart3 size={14} />
                Leaderboard
              </p>
              <h1 className="font-serif text-4xl font-black leading-tight text-foreground">
                리더보드
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                선수별 기록 순위 · 데이터 출처: KBO 공식 사이트
              </p>
            </div>
            <button
              onClick={loadData}
              className="inline-flex h-9 items-center gap-2 rounded-[4px] border border-border bg-popover px-3 text-xs font-bold text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              {lastUpdated ? `최근 업데이트 ${lastUpdated}` : "새로고침"}
            </button>
          </div>
        </header>

        {/* 필터 */}
        <section className="mb-5 overflow-hidden rounded-[6px] border border-border bg-card shadow-[0_1px_2px_rgb(17_24_39/0.08)]">
          <div className="flex flex-wrap items-center gap-3 border-b border-border bg-muted px-4 py-3 sm:px-5">
            <Tabs value={tab} onValueChange={handleTabChange}>
              <TabsList className="rounded-[4px] bg-secondary">
                <TabsTrigger value="hitter" className="rounded-[3px]">타자</TabsTrigger>
                <TabsTrigger value="pitcher" className="rounded-[3px]">투수</TabsTrigger>
              </TabsList>
            </Tabs>

            <Select value={season} onValueChange={setSeason}>
              <SelectTrigger className="h-9 w-28 rounded-[4px] border-input bg-popover text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEASONS.map((s) => <SelectItem key={s} value={s}>{s}시즌</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={team} onValueChange={setTeam}>
              <SelectTrigger className="h-9 w-28 rounded-[4px] border-input bg-popover text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEAMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 px-4 py-4 sm:px-5">
            {/* 기본 스탯 */}
            <div>
              <div className="mb-1.5 text-[11px] font-black uppercase tracking-wide text-muted-foreground">기본 스탯</div>
              <div className="flex flex-wrap gap-1.5">
                {basicCats.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setCategory(c.value)}
                    className={`rounded-[4px] border px-3 py-1 text-xs font-bold transition-colors ${
                      category === c.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-popover text-muted-foreground hover:border-border-strong hover:text-foreground"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 세이버메트릭스 */}
            <div>
              <div className="mb-1.5 text-[11px] font-black uppercase tracking-wide text-note">세이버메트릭스</div>
              <div className="flex flex-wrap gap-1.5">
                {saberCats.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setCategory(c.value)}
                    className={`rounded-[4px] border px-3 py-1 text-xs font-bold transition-colors ${
                      category === c.value
                        ? "border-note bg-note text-white"
                        : "border-border bg-popover text-note hover:border-note/60"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 리더보드 */}
        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-52 rounded-[6px] bg-secondary" />)}
            </div>
            <div className="space-y-2 rounded-[6px] border border-border bg-card p-4">
              {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-[4px] bg-secondary" />)}
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="rounded-[6px] border border-border bg-card py-16 text-center text-sm text-muted-foreground">
            기록을 불러오지 못했습니다.
          </div>
        ) : (
          <>
            {/* Top 3 */}
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {data.slice(0, 3).map((item, i) => (
                <TopCard key={`top-${item.playerName}`} item={item} rank={i + 1} cat={category} isH={isHitter} />
              ))}
            </div>

            {/* 4위~ 컴팩트 테이블 */}
            {data.length > 3 && (
              <section className="overflow-hidden rounded-[6px] border border-border bg-card shadow-[0_1px_2px_rgb(17_24_39/0.08)]">
                <div className="flex items-center gap-2 border-b border-border-strong bg-muted px-3 py-2.5 text-[11px] font-black uppercase tracking-wide text-muted-foreground">
                  <div className="w-7 text-center">#</div>
                  <div className="flex-1">선수</div>
                  <div className="w-16 text-right">
                    {currentCat?.label?.split(" ").pop() || category}
                    {isLowerBetter && " ↓"}
                  </div>
                  {ctxStats(data[3], category, isHitter).map(s => (
                    <div key={s.l} className="hidden w-12 text-right sm:block">{s.l}</div>
                  ))}
                </div>
                <div>
                  {data.slice(3).map((item, i) => (
                    <CompactRow key={`${item.playerName}-${i}`} item={item} rank={i + 4} cat={category} isH={isHitter} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
