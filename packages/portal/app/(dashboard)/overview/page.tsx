"use client";

import { useEffect } from "react";
import Link from "next/link";
import { StatCard, LoadingSpinner, ErrorState } from "@/components/ui";
import { StatusBadge } from "@/components/ui/status-badge";
import { useDashboardStats } from "@/lib/hooks";
import { getAccessToken } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";

// Mock fallback data
const mockStats = [
  {
    label: "Registered Agents",
    value: 5,
    trend: { value: 25, positive: true },
  },
  {
    label: "Active Sessions",
    value: 12,
    trend: { value: 8, positive: true },
  },
  {
    label: "Total Commitments",
    value: 847,
    trend: { value: 12, positive: true },
  },
  {
    label: "Active Credentials",
    value: 4,
    trend: { value: 0, positive: true },
  },
];

const recentActivity = [
  {
    id: "1",
    type: "session_started",
    description: "New negotiation session between procurement-bot-eu and sales-agent-na",
    status: "active",
    time: "2 min ago",
    link: "/sessions/sess_01HZN5A1B2C3D4E5F6G7H8I9J0",
  },
  {
    id: "2",
    type: "commitment_verified",
    description: "Commitment cmt_01HZN6A1... verified on-chain (block 18,294,571)",
    status: "completed",
    time: "15 min ago",
    link: "/commitments/cmt_01HZN6A1B2C3D4E5F6G7H8I9J0",
  },
  {
    id: "3",
    type: "proof_generated",
    description: "MandateBound ZK proof generated for credential disclosure (420ms)",
    status: "completed",
    time: "32 min ago",
    link: "/sessions/sess_01HZN5U1V2W3X4Y5Z6A7B8C9D0",
  },
  {
    id: "4",
    type: "session_rejected",
    description: "Session terms rejected by logistics-negotiator after 4 turns",
    status: "rejected",
    time: "1 hr ago",
    link: "/sessions/sess_01HZN5O1P2Q3R4S5T6U7V8W9X0",
  },
  {
    id: "5",
    type: "agent_registered",
    description: "New agent registered: procurement-bot-eu (DID provisioned)",
    status: "active",
    time: "2 hr ago",
    link: "/agents/ag_01HZN3KQXV7YJWF8RMTG5B2P4D",
  },
];

const quickActions = [
  {
    label: "Provision Agent",
    description: "Create a new AI agent with a DID and key pair",
    href: "/agents",
    icon: "\u2699",
  },
  {
    label: "Issue Credential",
    description: "Issue a verifiable authority credential",
    href: "/credentials",
    icon: "\u26BF",
  },
  {
    label: "View Sessions",
    description: "Monitor active negotiation sessions",
    href: "/sessions",
    icon: "\u21C4",
  },
  {
    label: "Generate API Key",
    description: "Create an API key for programmatic access",
    href: "/settings/api-keys",
    icon: "\u26A1",
  },
];

export default function OverviewPage() {
  // Ensure token is set on the client
  useEffect(() => {
    const token = getAccessToken();
    if (token) apiClient.setToken(token);
  }, []);

  const { data: dashStats, loading, error } = useDashboardStats();

  // Build stats from API data or fall back to mock
  const stats = dashStats
    ? [
        {
          label: "Registered Agents",
          value: dashStats.agentCount,
        },
        {
          label: "Active Sessions",
          value: dashStats.activeSessionCount,
        },
        {
          label: "Total Sessions",
          value: dashStats.sessionCount,
        },
        {
          label: "Active Credentials",
          value: dashStats.credentialCount,
        },
      ]
    : mockStats;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Overview</h1>
        <p className="mt-1 text-sm text-gray-400">
          Monitor your agents, sessions, and commitments
        </p>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="py-8">
          <LoadingSpinner label="Loading dashboard..." />
        </div>
      ) : error ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {mockStats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="group rounded-lg border border-navy-800 bg-navy-900 p-4 transition-colors hover:border-accent/30 hover:bg-accent/5"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-lg text-accent group-hover:bg-accent/20 transition-colors">
                  {action.icon}
                </span>
                <div>
                  <p className="text-sm font-medium text-white">
                    {action.label}
                  </p>
                  <p className="text-xs text-gray-500">{action.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Activity Feed */}
      <div className="rounded-lg border border-navy-800 bg-navy-900">
        <div className="flex items-center justify-between border-b border-navy-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">
            Recent Activity
          </h2>
          <Link
            href="/analytics"
            className="text-xs text-accent hover:text-accent-hover transition-colors"
          >
            View Analytics
          </Link>
        </div>
        <div className="divide-y divide-navy-800">
          {recentActivity.map((item) => (
            <Link
              key={item.id}
              href={item.link}
              className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-navy-800/30"
            >
              <div className="flex-1">
                <p className="text-sm text-white">{item.description}</p>
                <p className="mt-0.5 text-xs text-gray-500">{item.time}</p>
              </div>
              <StatusBadge status={item.status} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
