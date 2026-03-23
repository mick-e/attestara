type BadgeVariant =
  | "active"
  | "completed"
  | "rejected"
  | "expired"
  | "committed"
  | "paused"
  | "pending";

const variantStyles: Record<BadgeVariant, string> = {
  active: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  completed: "bg-verified/10 text-verified border-verified/20",
  rejected: "bg-danger/10 text-danger border-danger/20",
  expired: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  committed: "bg-verified/10 text-verified border-verified/20",
  paused: "bg-warning/10 text-warning border-warning/20",
  pending: "bg-warning/10 text-warning border-warning/20",
};

export function StatusBadge({ status }: { status: string }) {
  const variant =
    (status.toLowerCase().replace(/_/g, "") as BadgeVariant) || "pending";
  const style = variantStyles[variant] || variantStyles.pending;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${style}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
