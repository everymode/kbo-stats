import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  BarChart3,
  Users,
  Trophy,
  Calendar,
  BookOpen,
  Home,
  Search,
  Sun,
  Moon,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { Input } from "@/components/ui/input";
import { kboApi } from "@/lib/kboApi";
import { useNavigate } from "@/hooks/useNavigate";

const NAV_ITEMS = [
  { path: "/", label: "홈", icon: Home, description: "오늘의 KBO" },
  { path: "/leaderboard", label: "리더보드", icon: BarChart3, description: "선수 순위" },
  { path: "/teams", label: "팀", icon: Trophy, description: "10개 구단" },
  { path: "/players", label: "선수", icon: Users, description: "선수 검색" },
  // { path: "/archive", label: "시즌 아카이브", icon: Calendar, description: "역대 기록" },
  { path: "/glossary", label: "용어 사전", icon: BookOpen, description: "야구 용어" },
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();

  // 검색
  useEffect(() => {
    if (searchQuery.length < 1) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await kboApi.searchPlayers(searchQuery);
        setSearchResults(res.data.slice(0, 8));
        setSearchOpen(true);
      } catch {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchSelect = (player: any) => {
    setSearchQuery("");
    setSearchOpen(false);
    navigate(`/players/${encodeURIComponent(player.playerName)}`);
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* 모바일 오버레이 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ─── 사이드바 ─────────────────────────────────── */}
      <aside
        className={`fixed left-0 top-0 z-50 h-full w-64 flex flex-col bg-card border-r border-border shadow-lg transition-transform duration-300 ease-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:static lg:flex`}
      >
        {/* 로고 */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-white shadow-md">
            <span className="font-bold text-lg leading-none">K</span>
          </div>
          <div>
            <div className="font-display text-lg text-foreground leading-tight">KBO STATS</div>
            <div className="text-[0.65rem] text-muted-foreground mt-0.5 font-medium">한국 프로야구 기록실</div>
          </div>
          <button
            className="ml-auto lg:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-1">
          {NAV_ITEMS.map((item, idx) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`nav-link animate-fade-in-up ${isActive ? "active" : ""}`}
                style={{ animationDelay: `${idx * 40}ms` }}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={18} className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold leading-none">{item.label}</div>
                  <div className="text-[0.65rem] text-muted-foreground mt-1 truncate">{item.description}</div>
                </div>
                {isActive && <ChevronRight size={14} className="text-primary shrink-0" />}
              </Link>
            );
          })}
        </nav>

        {/* 하단 */}
        <div className="px-4 py-4 border-t border-border">
          <div className="text-[0.65rem] text-muted-foreground text-center font-medium">
            데이터 출처: KBO 공식 사이트
          </div>
        </div>
      </aside>

      {/* ─── 메인 영역 ────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 상단 바 */}
        <header className="sticky top-0 z-30 flex items-center gap-3 px-5 py-3.5 bg-card/80 backdrop-blur-xl border-b border-border shadow-sm">
          {/* 모바일 메뉴 버튼 */}
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>

          {/* 검색바 */}
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-9 bg-secondary border-border text-sm h-9 focus:border-primary rounded-xl"
              placeholder="선수명, 팀명으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
            />
            {/* 검색 드롭다운 */}
            {searchOpen && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-2xl overflow-hidden z-50">
                {searchResults.map((player, i) => (
                  <button
                    key={i}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent text-left transition-colors"
                    onMouseDown={() => handleSearchSelect(player)}
                  >
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: player.colors?.primary || "#666" }}
                    />
                    <div>
                      <span className="text-sm font-medium">{player.playerName}</span>
                      <span className="text-xs text-muted-foreground ml-2">{player.teamName}</span>
                    </div>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {(player as any).type === "pitcher" ? "투수" : "타자"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 현재 페이지 제목 (모바일) */}
          <div className="lg:hidden font-display text-base text-foreground tracking-wider">
            {NAV_ITEMS.find((n) => n.path === location)?.label || "KBO STATS"}
          </div>

          {/* 다크/라이트 토글 */}
          <button
            className="ml-auto flex items-center justify-center w-9 h-9 rounded-xl bg-secondary text-muted-foreground hover:text-foreground hover:bg-accent border border-border transition-all"
            onClick={toggleTheme}
            title={theme === "dark" ? "라이트 모드" : "다크 모드"}
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </header>

        {/* 콘텐츠 */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
