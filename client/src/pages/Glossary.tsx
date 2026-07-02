import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Search } from "lucide-react";

const TERMS = {
  basic: [
    { term: "AVG", full: "타율 (Batting Average)", formula: "안타 ÷ 타수", desc: "타자가 타석에 들어서 안타를 칠 확률. 가장 기본적인 타자 평가 지표." },
    { term: "OBP", full: "출루율 (On-Base Percentage)", formula: "(안타 + 볼넷 + 사구) ÷ (타수 + 볼넷 + 사구 + 희비)", desc: "타자가 어떤 방법으로든 출루하는 비율. 타율보다 타자의 가치를 더 잘 반영." },
    { term: "SLG", full: "장타율 (Slugging Percentage)", formula: "총루타 ÷ 타수", desc: "타수당 평균 루타 수. 타자의 장타력을 나타내는 지표." },
    { term: "OPS", full: "출루율+장타율 (On-base Plus Slugging)", formula: "OBP + SLG", desc: "출루율과 장타율의 합. 타자의 종합적인 공격 능력을 나타내는 대표 지표." },
    { term: "HR", full: "홈런 (Home Run)", formula: "-", desc: "타자가 공을 쳐서 경기장 밖으로 넘겨 득점하는 것." },
    { term: "RBI", full: "타점 (Runs Batted In)", formula: "-", desc: "타자의 타격으로 인해 득점한 주자 수. 클러치 능력을 나타냄." },
    { term: "SB", full: "도루 (Stolen Base)", formula: "-", desc: "주자가 투구 중 다음 베이스로 이동하는 것." },
    { term: "ERA", full: "평균자책점 (Earned Run Average)", formula: "자책점 × 9 ÷ 투구이닝", desc: "투수가 9이닝 동안 허용하는 평균 자책점. 낮을수록 좋은 투수." },
    { term: "WHIP", full: "이닝당 출루허용률 (Walks + Hits per Inning Pitched)", formula: "(볼넷 + 피안타) ÷ 이닝", desc: "이닝당 허용하는 볼넷과 안타의 합. 낮을수록 좋음." },
    { term: "K", full: "삼진 (Strikeout)", formula: "-", desc: "투수가 타자를 삼진으로 잡아내는 것. 투수의 구위를 나타냄." },
    { term: "BB", full: "볼넷 (Base on Balls / Walk)", formula: "-", desc: "투수가 볼 4개를 던져 타자를 1루로 내보내는 것." },
    { term: "PA", full: "타석 (Plate Appearance)", formula: "-", desc: "타자가 타석에 들어선 횟수. 타수와 달리 볼넷, 사구, 희생타 등을 포함." },
    { term: "AB", full: "타수 (At Bat)", formula: "-", desc: "타석에서 볼넷, 사구, 희생타를 제외한 타격 횟수." },
    { term: "IP", full: "투구이닝 (Innings Pitched)", formula: "-", desc: "투수가 투구한 이닝 수. 선발투수의 이닝 소화 능력을 나타냄." },
    { term: "SV", full: "세이브 (Save)", formula: "-", desc: "팀이 이기고 있는 상황에서 마무리 투수가 경기를 마무리하는 것." },
    { term: "HLD", full: "홀드 (Hold)", formula: "-", desc: "중간계투가 리드 상황에서 등판해 리드를 유지하고 마운드를 내려오는 것." },
  ],
  sabermetrics: [
    { term: "WAR", full: "대체선수 대비 승리기여도 (Wins Above Replacement)", formula: "복잡한 복합 계산식", desc: "선수가 대체 수준 선수 대비 팀에 몇 승을 더 기여했는지 나타내는 종합 지표. 타자와 투수 모두 적용 가능." },
    { term: "wOBA", full: "가중출루율 (Weighted On-Base Average)", formula: "각 이벤트에 가중치를 부여한 출루율", desc: "안타, 2루타, 3루타, 홈런, 볼넷 등 각 이벤트의 실제 가치를 반영한 출루율. OBP보다 정교함." },
    { term: "wRC+", full: "조정 가중득점창출력 (Weighted Runs Created Plus)", formula: "리그 평균 = 100으로 조정한 wRC", desc: "100이 리그 평균. 150이면 리그 평균보다 50% 더 많은 득점을 창출하는 타자." },
    { term: "FIP", full: "수비무관 평균자책점 (Fielding Independent Pitching)", formula: "(13×HR + 3×(BB+HBP) - 2×K) ÷ IP + 상수", desc: "수비의 영향을 제거하고 투수 자신의 능력만으로 계산한 ERA. 투수의 실제 능력을 더 잘 반영." },
    { term: "xFIP", full: "기대 수비무관 평균자책점 (Expected FIP)", formula: "FIP에서 피홈런을 리그 평균 플라이볼 홈런율로 대체", desc: "FIP에서 홈런 허용을 리그 평균으로 조정한 지표. 홈런 허용의 운적 요소를 제거." },
    { term: "BABIP", full: "인플레이 타구 타율 (Batting Average on Balls In Play)", formula: "(안타 - 홈런) ÷ (타수 - 삼진 - 홈런 + 희비)", desc: "홈런과 삼진을 제외한 인플레이 타구의 타율. 리그 평균 약 .300. 크게 벗어나면 운의 영향." },
    { term: "ISO", full: "순수장타율 (Isolated Power)", formula: "SLG - AVG", desc: "타자의 순수한 장타력을 나타내는 지표. 단순 안타를 제외한 여분의 루타 능력." },
    { term: "K%", full: "삼진율 (Strikeout Rate)", formula: "삼진 ÷ 타석", desc: "타석당 삼진 비율. 타자는 낮을수록, 투수는 높을수록 좋음." },
    { term: "BB%", full: "볼넷율 (Walk Rate)", formula: "볼넷 ÷ 타석", desc: "타석당 볼넷 비율. 타자의 선구안을 나타냄. 높을수록 선구안이 좋음." },
    { term: "HR/9", full: "9이닝당 피홈런 (Home Runs per 9 Innings)", formula: "피홈런 × 9 ÷ 이닝", desc: "투수가 9이닝당 허용하는 평균 홈런 수. 낮을수록 좋음." },
    { term: "K/9", full: "9이닝당 탈삼진 (Strikeouts per 9 Innings)", formula: "탈삼진 × 9 ÷ 이닝", desc: "투수가 9이닝당 잡아내는 평균 삼진 수. 높을수록 구위가 좋음." },
    { term: "BB/9", full: "9이닝당 볼넷 (Walks per 9 Innings)", formula: "볼넷 × 9 ÷ 이닝", desc: "투수가 9이닝당 허용하는 평균 볼넷 수. 낮을수록 제구력이 좋음." },
  ],
};

export default function Glossary() {
  const [tab, setTab] = useState<"basic" | "sabermetrics">("basic");
  const [search, setSearch] = useState("");

  const terms = TERMS[tab];
  const filtered = terms.filter(
    (t) =>
      !search ||
      t.term.toLowerCase().includes(search.toLowerCase()) ||
      t.full.includes(search) ||
      t.desc.includes(search)
  );

  return (
    <div className="min-h-[calc(100vh-65px)] bg-background text-foreground">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8">
      <header className="mb-6 border-b border-border-strong pb-5">
        <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
          <BookOpen size={14} />
          Glossary
        </p>
        <h1 className="font-serif text-4xl font-black leading-tight text-foreground">기록 용어 사전</h1>
        <p className="mt-2 text-sm text-muted-foreground">야구 기록 용어와 세이버메트릭스 지표 설명</p>
      </header>

      {/* 필터 */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "basic" | "sabermetrics")}>
          <TabsList className="rounded-[4px] bg-secondary">
            <TabsTrigger value="basic" className="rounded-[3px]">기본 용어</TabsTrigger>
            <TabsTrigger value="sabermetrics" className="rounded-[3px]">세이버메트릭스</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative max-w-xs flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-9 rounded-[4px] border-input bg-popover pl-9 text-sm"
            placeholder="용어 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* 용어 카드 그리드 */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((term) => (
          <div
            key={term.term}
            className="rounded-[6px] border border-border bg-card p-5 shadow-[0_1px_2px_rgb(17_24_39/0.08)] transition-colors hover:border-border-strong"
          >
            <div className="mb-2 flex items-start justify-between">
              <div className="font-stat text-2xl font-black leading-none text-primary">
                {term.term}
              </div>
              {term.formula !== "-" && (
                <span className="rounded-[3px] bg-accent px-2 py-0.5 font-stat text-xs font-bold text-primary">
                  공식
                </span>
              )}
            </div>
            <div className="mb-2 text-xs font-bold text-muted-foreground">{term.full}</div>
            {term.formula !== "-" && (
              <div className="mb-2.5 rounded-[4px] bg-muted px-2.5 py-2 font-stat text-xs text-foreground/80">
                {term.formula}
              </div>
            )}
            <p className="text-xs leading-relaxed text-muted-foreground">{term.desc}</p>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-12 text-center text-sm text-muted-foreground">
          검색 결과가 없습니다.
        </div>
      )}
      </div>
    </div>
  );
}
