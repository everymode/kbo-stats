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

function PlayerRow({ player, type, index }: { player: Hitter | Pitcher; type: "hitter" | "pitcher"; index: number }) {
  const isHitter = type === "hitter";
  const h = player as Hitter;
  const p = player as Pitcher;

  return (
    <Link href={`/players/${encodeURIComponent(player.playerName)}`}>
      <div
        className="flex items-center gap-3 py-3 px-4 rounded-lg hover:bg-white/5 transition-colors cursor-pointer animate-fade-in-up border border-transparent hover:border-border"
        style={{ animationDelay: `${index * 25}ms` }}
      >
        {/* 순위 */}
        <div className="w-8 text-center font-stat text-sm text-muted-foreground shrink-0">
          {player.rank}
        </div>

        {/* 선수명 + 팀 */}
        <div className="w-36 shrink-0">
          <div className="font-semibold text-sm hover:text-primary transition-colors">{player.playerName}</div>
          <TeamBadge teamName={player.teamName} size="sm" />
        </div>

        {/* 스탯 */}
        {isHitter ? (
          <div className="flex-1 grid grid-cols-5 gap-2 text-right">
            <div>
              <div className="font-stat text-sm font-semibold text-primary">{h.avg}</div>
              <div className="text-xs text-muted-foreground">AVG</div>
            </div>
            <div>
              <div className="font-stat text-sm">{h.hr ?? "-"}</div>
              <div className="text-xs text-muted-foreground">HR</div>
            </div>
            <div>
              <div className="font-stat text-sm">{h.rbi ?? "-"}</div>
              <div className="text-xs text-muted-foreground">RBI</div>
            </div>
            <div>
              <div className="font-stat text-sm">{h.hits ?? "-"}</div>
              <div className="text-xs text-muted-foreground">H</div>
            </div>
            <div>
              <div className="font-stat text-sm">{h.ops ?? "-"}</div>
              <div className="text-xs text-muted-foreground">OPS</div>
            </div>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-5 gap-2 text-right">
            <div>
              <div className="font-stat text-sm font-semibold text-primary">{p.era}</div>
              <div className="text-xs text-muted-foreground">ERA</div>
            </div>
            <div>
              <div className="font-stat text-sm">{p.wins ?? "-"}</div>
              <div className="text-xs text-muted-foreground">W</div>
            </div>
            <div>
              <div className="font-stat text-sm">{p.so ?? "-"}</div>
              <div className="text-xs text-muted-foreground">K</div>
            </div>
            <div>
              <div className="font-stat text-sm">{p.whip ?? "-"}</div>
              <div className="text-xs text-muted-foreground">WHIP</div>
            </div>
            <div>
              <div className="font-stat text-sm">{p.saves ?? "-"}</div>
              <div className="text-xs text-muted-foreground">SV</div>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}

export default function Players() {
  const [tab, setTab] = useState<"hitter" | "pitcher">("hitter");
  const [team, setTeam] = useState("전체");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<(Hitter | Pitcher)[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "hitter") {
        const res = await kboApi.getHittersOps("2026", 1);
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
    const matchTeam = team === "전체" || p.teamName.includes(team) || p.teamShort?.includes(team);
    const matchSearch = !search || p.playerName.includes(search) || p.teamName.includes(search);
    return matchTeam && matchSearch;
  });

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

        <div className="text-xs text-muted-foreground ml-auto">
          {filtered.length}명
        </div>
      </div>

      {/* 테이블 헤더 */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 py-2 px-4 border-b border-border">
          <div className="w-8 text-xs font-semibold text-muted-foreground uppercase">#</div>
          <div className="w-36 text-xs font-semibold text-muted-foreground uppercase">선수</div>
          {tab === "hitter" ? (
            <div className="flex-1 grid grid-cols-5 gap-2 text-right">
              {["AVG", "HR", "RBI", "H", "OPS"].map((h) => (
                <div key={h} className="text-xs font-semibold text-muted-foreground uppercase">{h}</div>
              ))}
            </div>
          ) : (
            <div className="flex-1 grid grid-cols-5 gap-2 text-right">
              {["ERA", "W", "K", "WHIP", "SV"].map((h) => (
                <div key={h} className="text-xs font-semibold text-muted-foreground uppercase">{h}</div>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 15 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">검색 결과가 없습니다.</div>
        ) : (
          <div className="divide-y divide-border/30">
            {filtered.map((player, i) => (
              <PlayerRow key={`${player.playerName}-${i}`} player={player} type={tab} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
