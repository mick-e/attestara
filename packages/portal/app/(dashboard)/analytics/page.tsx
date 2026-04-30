"use client";

import { useEffect } from "react";
import { useAnalytics, useTimeseries, useProofLatency } from "@/lib/hooks";
import { getAccessToken } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";
import { LoadingSpinner, StatCard } from "@/components/ui";

export default function AnalyticsPage() {
  useEffect(() => {
    const token = getAccessToken();
    if (token) apiClient.setToken(token);
  }, []);

  const { data: analytics, loading } = useAnalytics();
  const { data: sessionsTs } = useTimeseries("sessions", 14);
  const { data: gasTs } = useTimeseries("gas_spent", 14);
  const { data: proofLatencyData } = useProofLatency();

  const summaryStats = analytics
    ? [
        { label: "Total Sessions", value: analytics.sessionCount.toLocaleString() },
        { label: "Completed", value: String(analytics.commitmentCount) },
        { label: "Active Now", value: String(analytics.activeSessionCount) },
        { label: "Avg Turns/Session", value: analytics.avgTurnsPerSession.toFixed(1) },
      ]
    : [
        { label: "Total Sessions", value: "0" },
        { label: "Completed", value: "0" },
        { label: "Active Now", value: "0" },
        { label: "Avg Turns/Session", value: "0.0" },
      ];

  const sessionVolumeData = sessionsTs?.data ?? [];
  const gasCostData = gasTs?.data ?? [];
  const latencyStats = proofLatencyData?.data ?? [];
  const maxLatency = latencyStats.length > 0
    ? Math.max(...latencyStats.map((d) => d.p95Ms))
    : 1;

  const totalGas = gasCostData.reduce((sum, d) => sum + d.value, 0);
  const avgGasPerSession = analytics && analytics.sessionCount > 0
    ? Math.round(totalGas / analytics.sessionCount)
    : 0;
  const totalGasEth = (totalGas * 0.00000003).toFixed(4);
  const totalGasUsd = (totalGas * 0.00000003 * 3000).toFixed(2);

  const gasStats = [
    { label: "Total Gas (units)", value: totalGas.toLocaleString() },
    { label: "Avg Gas/Session", value: avgGasPerSession.toLocaleString() },
    { label: "Total Cost (ETH)", value: totalGasEth },
    { label: "Total Cost (USD est.)", value: `$${totalGasUsd}` },
  ];

  if (loading) return <div className="py-12"><LoadingSpinner label="Loading analytics..." /></div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Analytics</h1>
        <p className="mt-1 text-sm text-gray-400">
          Session metrics, proof performance, and cost tracking
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryStats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>

      <div className="rounded-lg border border-navy-800 bg-navy-900 p-6">
        <h3 className="text-sm font-medium text-gray-400 mb-4">
          Session Volume (Last 14 Days)
        </h3>
        {sessionVolumeData.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No session data available yet.</p>
        ) : (
          <div className="flex items-end gap-2 h-48">
            {sessionVolumeData.map((d, i) => {
              const maxSessions = Math.max(...sessionVolumeData.map((s) => s.value));
              const height = maxSessions > 0 ? (d.value / maxSessions) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500">{d.value}</span>
                  <div
                    className="w-full rounded-t bg-accent/70 hover:bg-accent transition-colors"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-[10px] text-gray-600 truncate w-full text-center">
                    {d.date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border border-navy-800 bg-navy-900 p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-4">
            Proof Latency by Circuit (p50 / p95)
          </h3>
          {latencyStats.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No proof latency data available yet.</p>
          ) : (
            <div className="space-y-3">
              {latencyStats.map((d) => (
                <div key={d.circuit} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white">{d.circuit}</span>
                    <span className="text-gray-400 font-mono">
                      p50: {d.p50Ms}ms / p95: {d.p95Ms}ms{" "}
                      <span className="text-gray-600">({d.count})</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-navy-800">
                    <div
                      className="h-2 rounded-full bg-accent/70"
                      style={{ width: `${(d.p95Ms / maxLatency) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-navy-800 bg-navy-900 p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-4">
            Gas Used -- Last 14 Days
          </h3>
          {gasCostData.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No gas data available yet.</p>
          ) : (
            <div className="flex items-end gap-2 h-40">
              {gasCostData.map((d, i) => {
                const maxCost = Math.max(...gasCostData.map((g) => g.value));
                const height = maxCost > 0 ? (d.value / maxCost) * 100 : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-gray-500">{d.value.toLocaleString()}</span>
                    <div
                      className="w-full rounded-t bg-warning/50 hover:bg-warning/70 transition-colors"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {gasStats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>
    </div>
  );
}
