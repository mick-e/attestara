type ProofStatus = "generating" | "verified" | "on-chain" | "failed";

const proofStyles: Record<ProofStatus, { bg: string; icon: string }> = {
  generating: { bg: "bg-blue-500/10 text-blue-400", icon: "\u25D0" },
  verified: { bg: "bg-verified/10 text-verified", icon: "\u2713" },
  "on-chain": { bg: "bg-accent/10 text-accent", icon: "\u2B21" },
  failed: { bg: "bg-danger/10 text-danger", icon: "\u2717" },
};

export function ProofBadge({
  status,
  circuit,
  timeMs,
}: {
  status: ProofStatus;
  circuit: string;
  timeMs?: number;
}) {
  const style = proofStyles[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${style.bg}`}
    >
      <span>{style.icon}</span>
      <span>{circuit}</span>
      {timeMs !== undefined && (
        <span className="text-gray-500">({(timeMs / 1000).toFixed(1)}s)</span>
      )}
    </span>
  );
}
