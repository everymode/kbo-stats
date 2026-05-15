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
  Clock,
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
        className={`fixed left-0 top-0 z-50 h-full w-56 flex flex-col transition-transform duration-300 ease-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:static lg:flex`}
        style={{ background: "#1a2332" }}
      >
        {/* 로고 */}
        <div className="flex flex-col items-center py-6 border-b border-white/10">
          {/* 야구공 아이콘 */}
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-3">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="16" stroke="#e8e0d4" strokeWidth="2" fill="none"/>
              <path d="M10 6C12 10 12 14 10 18C8 22 8 26 10 30" stroke="#c44" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              <path d="M26 6C24 10 24 14 26 18C28 22 28 26 26 30" stroke="#c44" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="text-white font-bold text-base tracking-wide">KBO Records</div>
          <div className="text-white/50 text-[0.65rem] mt-0.5">한국 프로야구 기록실</div>
          <button
            className="absolute top-4 right-3 lg:hidden text-white/60 hover:text-white"
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
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm ${
                  isActive
                    ? "bg-white/15 text-white font-semibold border-l-3 border-white"
                    : "text-white/60 hover:bg-white/8 hover:text-white/90"
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={18} className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="leading-none font-medium">{item.label}</div>
                  <div className="text-[0.6rem] opacity-60 mt-0.5">{item.description}</div>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* 하단 */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="text-[0.6rem] text-white/40 text-center">
            데이터 출처: KBO 공식 사이트
          </div>
        </div>
      </aside>

      {/* ─── 메인 영역 ────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 상단 바 */}
        <header className="sticky top-0 z-30 flex items-center gap-3 px-5 py-3 bg-background border-b border-border">
          {/* 모바일 메뉴 버튼 */}
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>

          {/* 검색바 */}
          <div className="relative flex-1 max-w-lg">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-9 bg-card border-border text-sm h-10 rounded-lg"
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

          {/* 업데이트 시간 */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock size={13} />
            <span>{new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} 업데이트</span>
          </div>

          {/* 다크/라이트 토글 */}
          <button
            className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border text-sm font-medium text-foreground hover:bg-accent transition-all"
            onClick={toggleTheme}
          >
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            <span className="hidden sm:inline">{theme === "dark" ? "라이트 모드" : "다크 모드"}</span>
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
