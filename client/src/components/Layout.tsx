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
import { kboApi } from "@/lib/kboApi";

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
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();
  const isLedgerHome = location === "/";

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
    <div
      className={`flex min-h-screen ${isLedgerHome ? "bg-[#f7f3ea] text-[#111827]" : "bg-background"}`}
    >
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-56 flex-col transition-transform duration-300 ease-out lg:static lg:flex lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${isLedgerHome ? "border-r border-[#d8d0c2] bg-[#f3eee4]" : ""}`}
        style={isLedgerHome ? undefined : { background: "#1a2332" }}
      >
        <div
          className={`relative flex flex-col items-center border-b py-6 ${isLedgerHome ? "border-[#d8d0c2]" : "border-white/10"}`}
        >
          <img
            src="/sidebar/sidebar.png"
            alt="KBO Records"
            className="mb-2 h-20 w-20 object-contain drop-shadow-lg"
          />
          <div
            className={`text-base font-bold tracking-wide ${isLedgerHome ? "text-[#111827]" : "text-white"}`}
          >
            KBO Records
          </div>
          <div
            className={`mt-0.5 text-[0.65rem] ${isLedgerHome ? "text-[#6b665c]" : "text-white/50"}`}
          >
            한국 프로야구 기록실
          </div>
          <button
            className={`absolute right-3 top-4 transition-colors lg:hidden ${
              isLedgerHome
                ? "text-[#6b665c] hover:text-[#111827]"
                : "text-white/60 hover:text-white"
            }`}
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
                  isLedgerHome
                    ? isActive
                      ? "border-l-2 border-[#183b59] bg-[#fffdf7] font-semibold text-[#111827] shadow-[0_1px_2px_rgb(17_24_39/0.08)]"
                      : "text-[#6b665c] hover:bg-[#e7e0d2] hover:text-[#111827]"
                    : isActive
                      ? "border-l-3 border-white bg-white/15 font-semibold text-white"
                      : "text-white/60 hover:bg-white/8 hover:text-white/90"
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

        <div
          className={`border-t px-4 py-4 ${isLedgerHome ? "border-[#d8d0c2]" : "border-white/10"}`}
        >
          <div
            className={`text-center text-[0.6rem] ${isLedgerHome ? "text-[#6b665c]" : "text-white/40"}`}
          >
            데이터 출처: KBO 공식 사이트
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className={`sticky top-0 z-30 flex items-center gap-3 border-b px-5 py-3 ${
            isLedgerHome
              ? "border-[#d8d0c2] bg-[#f7f3ea]/95 text-[#111827] backdrop-blur"
              : "border-border bg-background"
          }`}
        >
          <button
            className={`transition-colors lg:hidden ${
              isLedgerHome
                ? "text-[#6b665c] hover:text-[#111827]"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>

          <div className="relative flex-1 max-w-lg">
            <Search
              size={15}
              className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${
                isLedgerHome ? "text-[#6b665c]" : "text-muted-foreground"
              }`}
            />
            <Input
              className={`h-10 rounded-[4px] pl-9 text-sm ${
                isLedgerHome
                  ? "border-[#d8d0c2] bg-[#fffdf7] text-[#111827] placeholder:text-[#8a8176] focus-visible:ring-[#183b59]/30 dark:bg-[#fffdf7] dark:text-[#111827] dark:placeholder:text-[#8a8176]"
                  : "border-border bg-card"
              }`}
              placeholder="선수명, 팀명으로 검색..."
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
            />

            {searchOpen && searchResults.length > 0 && (
              <div
                className={`absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-[6px] border shadow-2xl ${
                  isLedgerHome
                    ? "border-[#d8d0c2] bg-[#fffdf7]"
                    : "border-border bg-popover"
                }`}
              >
                {searchResults.map((player, index) => (
                  <button
                    key={`${player.playerName}-${index}`}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                      isLedgerHome ? "hover:bg-[#ede7db]" : "hover:bg-accent"
                    }`}
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
                      <span
                        className={`text-sm font-medium ${isLedgerHome ? "text-[#111827]" : ""}`}
                      >
                        {player.playerName}
                      </span>
                      <span
                        className={`ml-2 text-xs ${isLedgerHome ? "text-[#6b665c]" : "text-muted-foreground"}`}
                      >
                        {player.teamName}
                      </span>
                    </div>
                    <span
                      className={`ml-auto text-xs ${isLedgerHome ? "text-[#6b665c]" : "text-muted-foreground"}`}
                    >
                      {(player as any).type === "pitcher" ? "투수" : "타자"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div
            className={`hidden items-center gap-1.5 text-xs sm:flex ${isLedgerHome ? "text-[#6b665c]" : "text-muted-foreground"}`}
          >
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
            className={`ml-auto hidden items-center gap-2 rounded-[4px] border px-4 py-2 text-sm font-medium transition-all sm:flex ${
              isLedgerHome
                ? "border-[#d8d0c2] bg-[#fffdf7] text-[#111827] hover:border-[#9c9385]"
                : "border-border bg-card text-foreground hover:bg-accent"
            }`}
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
