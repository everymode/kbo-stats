import { getTeamColor, getTeamShort } from "@/lib/kboApi";

interface TeamBadgeProps {
  teamName: string;
  size?: "sm" | "md" | "lg";
  showFull?: boolean;
}

export default function TeamBadge({ teamName, size = "sm", showFull = false }: TeamBadgeProps) {
  const colors = getTeamColor(teamName);
  const short = getTeamShort(teamName);
  const label = showFull ? teamName : short;

  const sizeMap = {
    sm: { circle: "w-6 h-6 text-[0.6rem]", text: "text-xs" },
    md: { circle: "w-8 h-8 text-xs", text: "text-sm" },
    lg: { circle: "w-10 h-10 text-sm", text: "text-base" },
  };
  const s = sizeMap[size];

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`${s.circle} rounded-full inline-flex items-center justify-center font-bold text-white shrink-0 shadow-sm`}
        style={{ backgroundColor: colors.primary }}
      >
        {short.slice(0, 2)}
      </span>
      {showFull && <span className={`${s.text} font-medium text-foreground`}>{label}</span>}
    </span>
  );
}
