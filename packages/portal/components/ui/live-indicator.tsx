export function LiveIndicator({ active = true }: { active?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`h-2 w-2 rounded-full ${active ? "bg-verified animate-pulse" : "bg-gray-500"}`}
      />
      <span className="text-xs text-gray-400">
        {active ? "Live" : "Offline"}
      </span>
    </span>
  );
}
