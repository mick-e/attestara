"use client";

import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";

// Mock data — will connect to real API endpoints later
const stats = [
  { label: "Active Sessions", value: 12, trend: { value: 8, positive: true } },
  { label: "Total Commitments", value: 847, trend: { value: 12, positive: true } },
  { label: "Agents Online", value: 5, trend: { value: 2, positive: false } },
  { label: "Avg Proof Time", value: "1.2s", trend: { value: 15, positive: true } },
];

const recentActivity = [
  {
    id: "1",
    type: "session_started",
    description: "New negotiation session between Agent-A and Agent-B",
    status: "active",
    time: "2 min ago",
  },
  {
    id: "2",
    type: "commitment_verified",
    description: "Commitment #847 verified on-chain",
    status: "completed",
    time: "15 min ago",
  },
  {
    id: "3",
    type: "proof_generated",
    description: "ZK proof generated for credential disclosure",
    status: "completed",
    time: "32 min ago",
  },
  {
    id: "4",
    type: "session_rejected",
    description: "Session #45 terms rejected by Agent-C",
    status: "rejected",
    time: "1 hr ago",
  },
  {
    id: "5",
    type: "agent_registered",
    description: "New agent registered: procurement-bot-v2",
    status: "active",
    time: "2 hr ago",
  },
];

export default function OverviewPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Overview</h1>
        <p className="mt-1 text-sm text-gray-400">
          Monitor your agents, sessions, and commitments
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* Activity Feed */}
      <div className="rounded-lg border border-navy-800 bg-navy-900">
        <div className="border-b border-navy-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">
            Recent Activity
          </h2>
        </div>
        <div className="divide-y divide-navy-800">
          {recentActivity.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-6 py-4"
            >
              <div className="flex-1">
                <p className="text-sm text-white">{item.description}</p>
                <p className="mt-0.5 text-xs text-gray-500">{item.time}</p>
              </div>
              <StatusBadge status={item.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
