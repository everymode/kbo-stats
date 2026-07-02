import { useState, useMemo } from "react";
import { FA_PLAYERS_2027 } from "@/data/fa2027";
import type { FAPlayer } from "@/data/fa2027";
import {
  determineFAGrades,
  GRADE_STYLES,
  formatAmount,
} from "@/lib/faCalc";
import type { FAPlayerWithGrade, FAGrade } from "@/lib/faCalc";
import TeamBadge from "@/components/TeamBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileSignature,
  TrendingUp,
  Shield,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Info,
  Calculator,
  Award,
  Calendar,
  User,
} from "lucide-react";

const TEAMS = ["전체", "KIA", "삼성", "LG", "두산", "KT", "SSG", "NC", "롯데", "한화", "키움"];

// ─── 등급 뱃지 ───────────────────────────────────────────

function GradeBadge({ grade, size = "sm" }: { grade: FAGrade; size?: "sm" | "md" }) {
  const style = GRADE_STYLES[grade];
  const sizeClass = size === "md" ? "px-3 py-1.5 text-sm" : "px-2 py-0.5 text-xs";
  return (
    <span className={`inline-flex items-center rounded-[3px] border font-stat font-black ${sizeClass} ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

// ─── 요약 카드 ───────────────────────────────────────────

function SummaryCard({ label, value, sub, icon: Icon, color }: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[6px] border border-border bg-card p-4 shadow-[0_1px_2px_rgb(17_24_39/0.08)]">
      <div className={`flex h-10 w-10 items-center justify-center rounded-[4px] ${color}`}>
        <Icon size={18} />
      </div>
      <div>
        <div className="font-stat text-xl font-black text-foreground">{value}</div>
        <div className="text-xs font-bold text-muted-foreground">{label}</div>
        {sub && <div className="mt-0.5 text-xs text-muted-foreground/70">{sub}</div>}
      </div>
    </div>
  );
}

// ─── 선수 행 ─────────────────────────────────────────────

function FARow({ item, index, onClick }: {
  item: FAPlayerWithGrade;
  index: number;
  onClick: () => void;
}) {
  const { player, grade, contract } = item;
  const isHitter = player.type === "hitter";

  const keyStat = isHitter
    ? `${player.recentStats.avg} / ${player.recentStats.hr}HR / ${player.recentStats.rbi}RBI`
    : player.role === "closer"
      ? `ERA ${player.recentStats.era} / ${player.recentStats.saves}SV / ${player.recentStats.k9} K/9`
      : player.role === "reliever"
        ? `ERA ${player.recentStats.era} / ${player.recentStats.holds}HD / ${player.recentStats.k9} K/9`
        : `ERA ${player.recentStats.era} / ${player.recentStats.wins}W / ${player.recentStats.ip}IP`;

  return (
    <div
      className="flex cursor-pointer items-center gap-2 border-b border-border px-4 py-3 transition-colors hover:bg-accent"
      onClick={onClick}
    >
      {/* 순위 */}
      <div className="w-7 shrink-0 text-center font-stat text-xs font-bold text-muted-foreground">
        {index + 1}
      </div>

      {/* 선수명 */}
      <div className="flex w-28 shrink-0 items-center gap-2">
        <TeamBadge teamName={player.team} size="sm" />
        <span className="truncate text-sm font-bold text-foreground">{player.name}</span>
      </div>

      {/* 포지션 */}
      <div className="hidden w-16 shrink-0 text-xs text-muted-foreground sm:block">
        {player.position}
      </div>

      {/* 나이 */}
      <div className="hidden w-10 shrink-0 text-center font-stat text-xs text-muted-foreground md:block">
        {player.age}세
      </div>

      {/* 등급 */}
      <div className="flex w-16 shrink-0 justify-center">
        <GradeBadge grade={grade} />
      </div>

      {/* 핵심스탯 */}
      <div className="hidden flex-1 truncate font-stat text-xs text-muted-foreground lg:block">
        {keyStat}
      </div>

      {/* 예상계약 */}
      <div className="w-24 shrink-0 text-right">
        <div className="font-stat text-sm font-black text-primary">
          {formatAmount(contract.totalAmount)}
        </div>
        <div className="text-xs text-muted-foreground">
          {contract.years}년 / 연 {contract.annualAvg}억
        </div>
      </div>
    </div>
  );
}

// ─── 상세 다이얼로그 ─────────────────────────────────────

function FADetailDialog({ item, open, onClose }: {
  item: FAPlayerWithGrade | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!item) return null;
  const { player, score, grade, contract, compensation } = item;
  const isHitter = player.type === "hitter";
  const gradeStyle = GRADE_STYLES[grade];

  const gradeDesc =
    grade === "A"
      ? "최근 3년 평균 연봉 기준 소속 구단 1~3위 & 리그 전체 1~30위 — 인적보상 대상 (보호 20인)"
      : grade === "B"
        ? "소속 구단 4~10위 또는 리그 31~60위, 재FA 해당 시 B 적용 — 인적보상 대상 (보호 25인)"
        : "만 35세 이상 신규 FA, 다회차 FA, 또는 기타 — 보상금만 (전년 연봉 150%)";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <TeamBadge teamName={player.team} size="md" showFull />
            <span>{player.name}</span>
            <GradeBadge grade={grade} size="md" />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* 기본 정보 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <InfoChip icon={User} label="포지션" value={player.position} />
            <InfoChip icon={Calendar} label="나이" value={`만 ${player.age}세`} />
            <InfoChip icon={Award} label="경력" value={`${player.serviceYears}년차`} />
            <InfoChip
              icon={Info}
              label="유형"
              value={player.faType}
            />
          </div>

          {/* FA 등급 */}
          <section>
            <SectionTitle icon={Shield} title="FA 등급 분석" />
            <div className={`rounded-[6px] border p-4 ${gradeStyle.bg}`}>
              <div className="mb-2 flex items-center justify-between">
                <span className={`text-lg font-black ${gradeStyle.text}`}>
                  {gradeStyle.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  직전 연봉: {player.previousSalary}억 (리그 내 연봉 순위 기준)
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{gradeDesc}</p>
              {player.gradeNote && (
                <p className="text-xs text-muted-foreground/70 mt-1.5 italic">
                  ※ {player.gradeNote}
                </p>
              )}
            </div>
          </section>

          {/* 예상 계약 */}
          <section>
            <SectionTitle icon={Calculator} title="예상 계약 규모" />
            <div className="rounded-[6px] border border-border bg-card p-4">
              <div className="mb-4 flex items-baseline gap-2">
                <span className="font-stat text-3xl font-black text-primary">
                  {formatAmount(contract.totalAmount)}
                </span>
                <span className="text-muted-foreground text-sm">
                  / {contract.years} (연평균 {contract.annualAvg}억)
                </span>
              </div>

              {/* 현실적 범위 */}
              <div className="mb-4">
                <div className="text-xs font-semibold text-muted-foreground mb-2">
                  현실적 범위
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>{contract.rangeMin}억</span>
                  <span className="font-bold text-primary">{contract.totalAmount}억</span>
                  <span>{contract.rangeMax}억</span>
                </div>
                <div className="relative h-2 overflow-hidden rounded-[2px] bg-secondary">
                  <div
                    className="absolute h-full rounded-[2px] bg-primary/20"
                    style={{ left: '0%', width: '100%' }}
                  />
                  <div
                    className="absolute h-full w-2 -translate-x-1/2 rounded-[2px] bg-primary"
                    style={{
                      left: `${Math.max(5, Math.min(95, ((contract.totalAmount - contract.rangeMin) / (contract.rangeMax - contract.rangeMin)) * 100))}%`,
                    }}
                  />
                </div>
              </div>

              {/* 판단 근거 */}
              <div className="rounded-[4px] bg-muted p-3">
                <div className="text-xs font-semibold text-muted-foreground mb-1">판단 근거</div>
                <p className="text-sm text-foreground leading-relaxed">{contract.rationale}</p>
              </div>

              {/* 계약 구조 */}
              <div className="mt-3 space-y-2 text-sm">
                <BreakdownRow label="계약 기간" value={contract.years} desc={`만 ${player.age}세 기준`} />
                <BreakdownRow label="예상 총액" value={`${contract.totalAmount}억`} desc="계약금+연봉+옵션 최대총액" />
                <BreakdownRow label="연평균" value={`${contract.annualAvg}억`} />
                <BreakdownRow label="직전 연봉" value={`${player.previousSalary}억`} />
              </div>
            </div>
          </section>

          {/* 보상 규정 */}
          <section>
            <SectionTitle icon={TrendingUp} title="이적 보상 규정" />
            <div className="rounded-[6px] border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className={`text-sm font-bold ${
                  compensation.type === "보상금만"
                    ? "text-success"
                    : "text-warning"
                }`}>
                  {compensation.type}
                </span>
                <span className="text-xs text-muted-foreground">
                  (직전 연봉: {player.previousSalary}억)
                </span>
              </div>
              {compensation.type === "인적보상 대상" && (
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2 rounded-[4px] bg-muted p-2.5">
                    <span className="text-xs font-bold text-muted-foreground shrink-0 mt-0.5">옵션 1</span>
                    <span>{compensation.option1}</span>
                  </div>
                  {compensation.option2 && (
                    <div className="flex items-start gap-2 rounded-[4px] bg-muted p-2.5">
                      <span className="text-xs font-bold text-muted-foreground shrink-0 mt-0.5">옵션 2</span>
                      <span>{compensation.option2}</span>
                    </div>
                  )}
                </div>
              )}
              {compensation.type === "보상금만" && (
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2 rounded-[4px] bg-muted p-2.5">
                    <span>{compensation.option1}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    C등급 FA는 인적보상 없이 보상금만 원소속팀에 지급합니다.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* 최근 3시즌 평균 성적 */}
          <section>
            <SectionTitle icon={TrendingUp} title="최근 3시즌 평균 성적" />
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
              {isHitter ? (
                <>
                  <StatChip label="타율" value={player.recentStats.avg || "-"} primary />
                  <StatChip label="홈런" value={player.recentStats.hr ?? "-"} />
                  <StatChip label="타점" value={player.recentStats.rbi ?? "-"} />
                  <StatChip label="안타" value={player.recentStats.hits ?? "-"} />
                  <StatChip label="OPS" value={player.recentStats.ops || "-"} primary />
                  <StatChip label="OBP" value={player.recentStats.obp || "-"} />
                  <StatChip label="SLG" value={player.recentStats.slg || "-"} />
                  <StatChip label="도루" value={player.recentStats.sb ?? "-"} />
                  <StatChip label="경기" value={player.recentStats.games ?? "-"} />
                </>
              ) : (
                <>
                  <StatChip label="ERA" value={player.recentStats.era || "-"} primary />
                  <StatChip label="승" value={player.recentStats.wins ?? "-"} />
                  <StatChip label="패" value={player.recentStats.losses ?? "-"} />
                  <StatChip label="세이브" value={player.recentStats.saves ?? "-"} />
                  <StatChip label="홀드" value={player.recentStats.holds ?? "-"} />
                  <StatChip label="이닝" value={player.recentStats.ip || "-"} />
                  <StatChip label="WHIP" value={player.recentStats.whip || "-"} primary />
                  <StatChip label="K/9" value={player.recentStats.k9 || "-"} />
                  <StatChip label="경기" value={player.recentStats.games ?? "-"} />
                </>
              )}
            </div>
          </section>

          {/* 면책 */}
          <p className="border-t border-border pt-2 text-center text-xs text-muted-foreground/60">
            ※ 예상 계약 규모와 등급은 자체 알고리즘 기반 추정치이며, 실제 FA 시장 결과와 다를 수 있습니다.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── 서브 컴포넌트 ───────────────────────────────────────

function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <h3 className="mb-2 flex items-center gap-2 text-sm font-black text-foreground">
      <Icon size={14} className="text-primary" />
      {title}
    </h3>
  );
}

function InfoChip({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-[4px] bg-muted px-3 py-2">
      <Icon size={13} className="text-muted-foreground shrink-0" />
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-bold text-foreground">{value}</div>
      </div>
    </div>
  );
}

function StatChip({ label, value, primary = false }: { label: string; value: string | number; primary?: boolean }) {
  return (
    <div className="rounded-[4px] bg-muted px-3 py-2 text-center">
      <div className={`font-stat text-lg font-black ${primary ? "text-primary" : "text-foreground"}`}>
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function BreakdownRow({ label, value, desc }: { label: string; value: string; desc?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-1.5 last:border-0">
      <div>
        <span className="text-foreground">{label}</span>
        {desc && <span className="ml-2 text-xs text-muted-foreground">({desc})</span>}
      </div>
      <span className="font-stat font-bold text-foreground">{value}</span>
    </div>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────

type SortKey = "score" | "contract" | "age" | "name";

export default function FreeAgents() {
  const [tab, setTab] = useState<"all" | "hitter" | "pitcher">("all");
  const [team, setTeam] = useState("전체");
  const [selectedPlayer, setSelectedPlayer] = useState<FAPlayerWithGrade | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  // 등급 계산
  const allPlayers = useMemo(() => determineFAGrades(FA_PLAYERS_2027), []);

  // 필터
  const filtered = useMemo(() => {
    return allPlayers.filter(({ player }) => {
      const matchTab = tab === "all" || player.type === tab;
      const matchTeam = team === "전체" || player.team === team;
      return matchTab && matchTeam;
    });
  }, [allPlayers, tab, team]);

  // 정렬
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let va: number, vb: number;
      switch (sortKey) {
        case "score": va = a.score; vb = b.score; break;
        case "contract": va = a.contract.totalAmount; vb = b.contract.totalAmount; break;
        case "age": va = a.player.age; vb = b.player.age; break;
        case "name": return sortDir === "asc"
          ? a.player.name.localeCompare(b.player.name, "ko")
          : b.player.name.localeCompare(a.player.name, "ko");
        default: va = a.score; vb = b.score;
      }
      return sortDir === "desc" ? vb - va : va - vb;
    });
  }, [filtered, sortKey, sortDir]);

  // 요약 통계
  const summary = useMemo(() => {
    const grades = { A: 0, B: 0, C: 0 };
    let totalMarket = 0;
    allPlayers.forEach(({ grade, contract }) => {
      grades[grade]++;
      totalMarket += contract.totalAmount;
    });
    return { total: allPlayers.length, grades, totalMarket };
  }, [allPlayers]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDir === "desc") setSortDir("asc");
      else { setSortKey("score"); setSortDir("desc"); }
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ colKey }: { colKey: SortKey }) => {
    if (sortKey !== colKey) return <ArrowUpDown size={11} className="opacity-40" />;
    return sortDir === "desc"
      ? <ArrowDown size={11} className="text-primary" />
      : <ArrowUp size={11} className="text-primary" />;
  };

  return (
    <div className="min-h-[calc(100vh-65px)] bg-background text-foreground">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8">
      {/* 헤더 */}
      <header className="mb-6 border-b border-border-strong pb-5">
        <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
          <FileSignature size={14} />
          2027 Free agents
        </p>
        <h1 className="font-serif text-4xl font-black leading-tight text-foreground">
          2027 FA 전망
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          2026 시즌 종료 후 FA 자격 취득 예상 선수 · 등급 · 계약 규모 · 보상 규정 분석
        </p>
      </header>

      {/* 요약 카드 */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard
          icon={User}
          label="FA 예상 인원"
          value={`${summary.total}명`}
          sub={`타자 ${allPlayers.filter(p => p.player.type === "hitter").length}명 · 투수 ${allPlayers.filter(p => p.player.type === "pitcher").length}명`}
          color="bg-accent text-primary"
        />
        <SummaryCard
          icon={Award}
          label="등급 분포"
          value={`A ${summary.grades.A} · B ${summary.grades.B} · C ${summary.grades.C}`}
          color="bg-warning/10 text-warning"
        />
        <SummaryCard
          icon={TrendingUp}
          label="예상 시장 총 규모"
          value={`약 ${summary.totalMarket}억`}
          color="bg-success/10 text-success"
        />
        <SummaryCard
          icon={Shield}
          label="인적보상 대상"
          value={`${summary.grades.A + summary.grades.B}명`}
          sub={`A·B등급 FA 이적 시`}
          color="bg-accent text-primary"
        />
      </div>

      {/* 필터 */}
      <section className="mb-5 flex flex-wrap items-center gap-3 rounded-[6px] border border-border bg-muted px-4 py-3 shadow-[0_1px_2px_rgb(17_24_39/0.08)]">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | "hitter" | "pitcher")}>
          <TabsList className="rounded-[4px] bg-secondary">
            <TabsTrigger value="all" className="rounded-[3px]">전체</TabsTrigger>
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

        <div className="ml-auto font-stat text-xs font-bold text-muted-foreground">
          {filtered.length}명
        </div>
      </section>

      {/* 테이블 */}
      <section className="overflow-hidden rounded-[6px] border border-border bg-card shadow-[0_1px_2px_rgb(17_24_39/0.08)]">
        {/* 헤더 */}
        <div className="flex items-center gap-2 border-b border-border-strong bg-muted px-4 py-2.5">
          <div className="w-7 text-xs font-black uppercase text-muted-foreground">#</div>
          <div className="w-28 text-xs font-black uppercase text-muted-foreground">선수</div>
          <div className="hidden w-16 text-xs font-black uppercase text-muted-foreground sm:block">포지션</div>
          <button
            className="hidden w-10 cursor-pointer items-center gap-0.5 text-xs font-black uppercase text-muted-foreground hover:text-primary md:flex"
            onClick={() => handleSort("age")}
          >
            나이 <SortIcon colKey="age" />
          </button>
          <button
            className="flex w-16 cursor-pointer items-center justify-center gap-0.5 text-xs font-black uppercase text-muted-foreground hover:text-primary"
            onClick={() => handleSort("score")}
          >
            등급 <SortIcon colKey="score" />
          </button>
          <div className="hidden flex-1 text-xs font-black uppercase text-muted-foreground lg:block">
            핵심 스탯
          </div>
          <button
            className="flex w-24 cursor-pointer items-center justify-end gap-0.5 text-right text-xs font-black uppercase text-muted-foreground hover:text-primary"
            onClick={() => handleSort("contract")}
          >
            예상 계약 <SortIcon colKey="contract" />
          </button>
        </div>

        {/* 행 */}
        <div>
          {sorted.map((item, idx) => (
            <FARow
              key={item.player.name}
              item={item}
              index={idx}
              onClick={() => setSelectedPlayer(item)}
            />
          ))}
        </div>

        {sorted.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            해당 조건의 FA 예상 선수가 없습니다.
          </div>
        )}
      </section>

      {/* 안내 */}
      <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground/60">
        <Info size={13} className="mt-0.5 shrink-0" />
        <p>
          등급과 계약 규모는 최근 3시즌 평균 성적, 나이, 포지션 등을 기반으로 자체 알고리즘이 산출한 예측치입니다.
          실제 FA 결과와 다를 수 있으며, 선수를 클릭하면 상세 분석을 확인할 수 있습니다.
        </p>
      </div>

      {/* 상세 다이얼로그 */}
      <FADetailDialog
        item={selectedPlayer}
        open={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
      />
      </div>
    </div>
  );
}
