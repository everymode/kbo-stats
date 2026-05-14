import { getTeamColor, getTeamShort } from "@/lib/kboApi";

interface TeamBadgeProps {
  teamName: string;
  size?: "sm" | "md";
  showFull?: boolean;
}

export default function TeamBadge({ teamName, size = "sm", showFull = false }: TeamBadgeProps) {
  const colors = getTeamColor(teamName);
  const short = getTeamShort(teamName);
  const label = showFull ? teamName : short;

  return (
    <span
      className="team-badge"
      style={{
        backgroundColor: colors.primary + "22",
        color: colors.primary,
        border: `1px solid ${colors.primary}44`,
        fontSize: size === "sm" ? "0.7rem" : "0.8rem",
        padding: size === "sm" ? "2px 6px" : "3px 8px",
      }}
    >
      {label}
    </span>
  );
}
