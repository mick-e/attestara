interface StatCardProps {
  label: string;
  value: string | number;
  trend?: { value: number; positive: boolean };
  icon?: React.ReactNode;
}

export function StatCard({ label, value, trend, icon }: StatCardProps) {
  return (
    <div className="rounded-lg border border-navy-800 bg-navy-900 p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{label}</p>
        {icon && <div className="text-gray-500">{icon}</div>}
      </div>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
      {trend && (
        <p
          className={`mt-1 text-sm ${trend.positive ? "text-verified" : "text-danger"}`}
        >
          {trend.positive ? "\u2191" : "\u2193"} {Math.abs(trend.value)}%
        </p>
      )}
    </div>
  );
}
