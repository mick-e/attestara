"use client";

import { useEffect } from "react";
import { useAnalytics } from "@/lib/hooks";
import { getAccessToken } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";
import { LoadingSpinner, StatCard } from "@/components/ui";

// Time-series data requires a dedicated analytics endpoint — using placeholder data

// Mock session volume data (last 14 days)
const sessionVolumeData = [
  { date: "Mar 9", sessions: 3 },
  { date: "Mar 10", sessions: 5 },
  { date: "Mar 11", sessions: 4 },
  { date: "Mar 12", sessions: 7 },
  { date: "Mar 13", sessions: 6 },
  { date: "Mar 14", sessions: 9 },
  { date: "Mar 15", sessions: 8 },
  { date: "Mar 16", sessions: 11 },
  { date: "Mar 17", sessions: 10 },
  { date: "Mar 18", sessions: 14 },
  { date: "Mar 19", sessions: 12 },
  { date: "Mar 20", sessions: 15 },
  { date: "Mar 21", sessions: 13 },
  { date: "Mar 22", sessions: 16 },
];

// Mock gas cost data
const gasCostData = [
  { date: "Mar 9", cost: 0.42 },
  { date: "Mar 10", cost: 0.68 },
  { date: "Mar 11", cost: 0.55 },
  { date: "Mar 12", cost: 0.91 },
  { date: "Mar 13", cost: 0.73 },
  { date: "Mar 14", cost: 1.12 },
  { date: "Mar 15", cost: 0.98 },
  { date: "Mar 16", cost: 1.35 },
  { date: "Mar 17", cost: 1.21 },
  { date: "Mar 18", cost: 1.67 },
  { date: "Mar 19", cost: 1.45 },
  { date: "Mar 20", cost: 1.82 },
  { date: "Mar 21", cost: 1.58 },
  { date: "Mar 22", cost: 1.94 },
];

// Mock proof latency by circuit
const proofLatencyData = [
  { circuit: "MandateBound", avgMs: 420, count: 312 },
  { circuit: "CredFreshness", avgMs: 380, count: 289 },
  { circuit: "ParamRange", avgMs: 510, count: 245 },
  { circuit: "IdentityProof", avgMs: 650, count: 178 },
  { circuit: "TimeConstraint", avgMs: 340, count: 156 },
];

const gasStats = [
  { label: "Total Gas (ETH)", value: "15.41" },
  { label: "Avg Gas/Session", value: "220K" },
  { label: "Total Cost (USD)", value: "$4,623" },
  { label: "Avg Cost/Session", value: "$5.46" },
];

export default function AnalyticsPage() {
  useEffect(() => {
    const token = getAccessToken();
    if (token) apiClient.setToken(token);
  }, []);

  const { data: analytics, loading } = useAnalytics();

  const summaryStats = analytics
    ? [
        { label: "Total Sessions", value: analytics.sessionCount.toLocaleString(), change: "" },
        { label: "Completed", value: String(analytics.commitmentCount), change: "" },
        { label: "Active Now", value: String(analytics.activeSessionCount), change: "" },
        { label: "Avg Turns/Session", value: analytics.avgTurnsPerSession.toFixed(1), change: "" },
      ]
    : [
        { label: "Total Sessions", value: "0", change: "" },
        { label: "Completed", value: "0", change: "" },
        { label: "Active Now", value: "0", change: "" },
        { label: "Avg Turns/Session", value: "0.0", change: "" },
      ];

  const maxLatency = Math.max(...proofLatencyData.map((d) => d.avgMs));

  if (loading) return <div className="py-12"><LoadingSpinner label="Loading analytics..." /></div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Analytics</h1>
        <p className="mt-1 text-sm text-gray-400">
          Session metrics, proof performance, and cost tracking
        </p>
      </div>

      {/* Success Rate Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryStats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>

      {/* Session Volume Chart */}
      <div className="relative rounded-lg border border-navy-800 bg-navy-900 p-6">
        <span className="absolute top-2 right-2 z-10 rounded-full bg-navy-800 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-navy-400">
          Preview data
        </span>
        <h3 className="text-sm font-medium text-gray-400 mb-4">
          Session Volume (Last 14 Days)
        </h3>
        <div className="flex items-end gap-2 h-48">
          {sessionVolumeData.map((d, i) => {
            const maxSessions = Math.max(
              ...sessionVolumeData.map((s) => s.sessions)
            );
            const height = (d.sessions / maxSessions) * 100;
            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <span className="text-xs text-gray-500">{d.sessions}</span>
                <div
                  className="w-full rounded-t bg-accent/70 hover:bg-accent transition-colors"
                  style={{ height: `${height}%` }}
                />
                <span className="text-[10px] text-gray-600 truncate w-full text-center">
                  {d.date.slice(4)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Proof Latency + Gas Cost */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Proof Latency by Circuit */}
        <div className="relative rounded-lg border border-navy-800 bg-navy-900 p-6">
          <span className="absolute top-2 right-2 z-10 rounded-full bg-navy-800 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-navy-400">
            Preview data
          </span>
          <h3 className="text-sm font-medium text-gray-400 mb-4">
            Avg Proof Latency by Circuit
          </h3>
          <div className="space-y-3">
            {proofLatencyData.map((d) => (
              <div key={d.circuit} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white">{d.circuit}</span>
                  <span className="text-gray-400 font-mono">
                    {d.avgMs}ms{" "}
                    <span className="text-gray-600">({d.count})</span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-navy-800">
                  <div
                    className="h-2 rounded-full bg-accent/70"
                    style={{
                      width: `${(d.avgMs / maxLatency) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gas Cost Chart */}
        <div className="relative rounded-lg border border-navy-800 bg-navy-900 p-6">
          <span className="absolute top-2 right-2 z-10 rounded-full bg-navy-800 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-navy-400">
            Preview data
          </span>
          <h3 className="text-sm font-medium text-gray-400 mb-4">
            Gas Cost (ETH) — Last 14 Days
          </h3>
          <div className="flex items-end gap-2 h-40">
            {gasCostData.map((d, i) => {
              const maxCost = Math.max(...gasCostData.map((g) => g.cost));
              const height = (d.cost / maxCost) * 100;
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <span className="text-[10px] text-gray-500">
                    {d.cost.toFixed(2)}
                  </span>
                  <div
                    className="w-full rounded-t bg-warning/50 hover:bg-warning/70 transition-colors"
                    style={{ height: `${height}%` }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Gas Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {gasStats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>
    </div>
  );
}
