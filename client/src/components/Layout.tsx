import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  BarChart3,
  BookOpen,
  Clock,
  FileSignature,
  Home,
  Menu,
  Moon,
  Search,
  Sun,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/contexts/ThemeContext";
import { useNavigate } from "@/hooks/useNavigate";
import { kboApi, SearchPlayer } from "@/lib/kboApi";

const NAV_ITEMS = [
  { path: "/", label: "홈", icon: Home, description: "오늘의 KBO" },
  {
    path: "/leaderboard",
    label: "리더보드",
    icon: BarChart3,
    description: "선수 순위",
  },
  { path: "/teams", label: "팀", icon: Trophy, description: "10개 구단" },
  { path: "/players", label: "선수", icon: Users, description: "선수 검색" },
  {
    path: "/fa",
    label: "2027 FA",
    icon: FileSignature,
    description: "FA 전망",
  },
  {
    path: "/glossary",
    label: "용어 사전",
    icon: BookOpen,
    description: "야구 용어",
  },
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchPlayer[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();

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

  const handleSearchSelect = (player: SearchPlayer) => {
    setSearchQuery("");
    setSearchOpen(false);
    navigate(`/players/${encodeURIComponent(player.playerName)}`);
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-56 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 ease-out lg:static lg:flex lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="relative flex flex-col items-center border-b border-sidebar-border py-6">
          <img
            src="/sidebar/sidebar.png"
            alt="KBO Records"
            className="mb-2 h-20 w-20 object-contain drop-shadow-lg"
          />
          <div className="text-base font-bold tracking-wide text-sidebar-foreground">
            KBO Records
          </div>
          <div className="mt-0.5 text-[0.65rem] text-muted-foreground">
            한국 프로야구 기록실
          </div>
          <button
            className="absolute right-3 top-4 text-muted-foreground transition-colors hover:text-foreground lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = location === item.path;

            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 rounded-[6px] px-4 py-3 text-sm transition-all ${
                  isActive
                    ? "border-l-2 border-primary bg-popover font-semibold text-foreground shadow-[0_1px_2px_rgb(17_24_39/0.08)]"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={18} className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium leading-none">{item.label}</div>
                  <div className="mt-0.5 text-[0.6rem] opacity-65">
                    {item.description}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border px-4 py-4">
          <div className="text-center text-[0.6rem] text-muted-foreground">
            데이터 출처: KBO 공식 사이트
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-5 py-3 backdrop-blur">
          <button
            className="text-muted-foreground transition-colors hover:text-foreground lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>

          <div className="relative flex-1 max-w-lg">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              className="h-10 rounded-[4px] border-input bg-popover pl-9 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-ring/30"
              placeholder="선수명, 팀명으로 검색..."
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
            />

            {searchOpen && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-[6px] border border-border bg-popover shadow-[0_8px_20px_rgb(17_24_39/0.10)]">
                {searchResults.map((player, index) => (
                  <button
                    key={`${player.playerName}-${index}`}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent"
                    onMouseDown={() => handleSearchSelect(player)}
                  >
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted"
                      style={{
                        border: `2px solid ${player.colors?.primary || "#666"}`,
                      }}
                    >
                      {player.photoUrl ? (
                        <img
                          src={player.photoUrl}
                          alt={player.playerName}
                          className="h-full w-full object-cover object-top"
                          onError={event => {
                            (
                              event.currentTarget as HTMLImageElement
                            ).style.display = "none";
                          }}
                        />
                      ) : (
                        <span
                          className="text-xs font-bold"
                          style={{ color: player.colors?.primary || "#666" }}
                        >
                          {player.playerName.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-foreground">
                        {player.playerName}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {player.teamName}
                      </span>
                    </div>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {player.type === "pitcher" ? "투수" : "타자"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
            <Clock size={13} />
            <span>
              {new Date().toLocaleTimeString("ko-KR", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}{" "}
              업데이트
            </span>
          </div>

          <button
            className="ml-auto hidden items-center gap-2 rounded-[4px] border border-border bg-popover px-4 py-2 text-sm font-medium text-foreground transition-all hover:border-border-strong sm:flex"
            onClick={toggleTheme}
          >
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            <span className="hidden sm:inline">
              {theme === "dark" ? "라이트 모드" : "다크 모드"}
            </span>
          </button>
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
