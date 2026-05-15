import { getTeamColor, getTeamShort } from "@/lib/kboApi";

const TEAM_LOGO_MAP: Record<string, string> = {
  KT: "/logos/KT.svg",
  삼성: "/logos/samsung.svg",
  LG: "/logos/lg.svg",
  SSG: "/logos/ssg.svg",
  KIA: "/logos/KIA.svg",
  한화: "/logos/hanhwa.svg",
  두산: "/logos/Doosan.svg",
  NC: "/logos/nc.svg",
  롯데: "/logos/Lotte.svg",
  키움: "/logos/Kiwoom.svg",
};

function getTeamLogo(teamName: string) {
  for (const [key, path] of Object.entries(TEAM_LOGO_MAP)) {
    if (teamName.includes(key)) return path;
  }
  return "";
}

interface TeamBadgeProps {
  teamName: string;
  size?: "sm" | "md" | "lg";
  showFull?: boolean;
}

export default function TeamBadge({ teamName, size = "sm", showFull = false }: TeamBadgeProps) {
  const short = getTeamShort(teamName);
  const logo = getTeamLogo(teamName);
  const label = showFull ? teamName : short;

  const sizeMap = {
    sm: { img: "w-5 h-5", text: "text-xs" },
    md: { img: "w-7 h-7", text: "text-sm" },
    lg: { img: "w-9 h-9", text: "text-base" },
  };
  const s = sizeMap[size];

  return (
    <span className="inline-flex items-center gap-1.5">
      {logo ? (
        <img src={logo} alt={short} className={`${s.img} object-contain shrink-0`} />
      ) : (
        <span
          className={`${s.img} rounded-full inline-flex items-center justify-center font-bold text-white shrink-0 shadow-sm text-[0.5rem]`}
          style={{ backgroundColor: getTeamColor(teamName).primary }}
        >
          {short.slice(0, 2)}
        </span>
      )}
      {showFull && <span className={`${s.text} font-medium text-foreground`}>{label}</span>}
    </span>
  );
}
