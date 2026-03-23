"use client";

// Will integrate Recharts when data is available
export function TimeSeriesChart({
  data = [],
  title,
}: {
  data?: unknown[];
  title: string;
}) {
  return (
    <div className="rounded-lg border border-navy-800 bg-navy-900 p-6">
      <h3 className="text-sm font-medium text-gray-400">{title}</h3>
      <div className="mt-4 flex h-48 items-center justify-center text-gray-600">
        {data.length === 0 ? "No data yet" : "Chart placeholder"}
      </div>
    </div>
  );
}
