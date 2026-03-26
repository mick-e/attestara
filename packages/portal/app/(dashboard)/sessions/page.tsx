"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { DataTable, StatusBadge, LoadingSpinner, ErrorState, EmptyState } from "@/components/ui";
import { useSessions } from "@/lib/hooks";
import { getAccessToken } from "@/lib/auth";
import { apiClient, type Session } from "@/lib/api-client";

// Display interface for the table
interface SessionRow {
  id: string;
  buyerAgent: string;
  sellerAgent: string;
  status: string;
  turns: string;
  createdAt: string;
}

const mockSessions: SessionRow[] = [
  {
    id: "sess_01HZN5A1B2C3D4E5F6G7H8I9J0",
    buyerAgent: "procurement-bot-eu",
    sellerAgent: "sales-agent-na",
    status: "active",
    turns: "3",
    createdAt: "2026-03-22T14:30:00Z",
  },
  {
    id: "sess_01HZN5K1L2M3N4O5P6Q7R8S9T0",
    buyerAgent: "procurement-bot-eu",
    sellerAgent: "logistics-negotiator",
    status: "active",
    turns: "5",
    createdAt: "2026-03-22T10:15:00Z",
  },
  {
    id: "sess_01HZN5U1V2W3X4Y5Z6A7B8C9D0",
    buyerAgent: "compliance-checker",
    sellerAgent: "vendor-assessment-v1",
    status: "completed",
    turns: "8",
    createdAt: "2026-03-21T16:45:00Z",
  },
  {
    id: "sess_01HZN5E1F2G3H4I5J6K7L8M9N0",
    buyerAgent: "procurement-bot-eu",
    sellerAgent: "vendor-assessment-v1",
    status: "completed",
    turns: "6",
    createdAt: "2026-03-20T09:00:00Z",
  },
  {
    id: "sess_01HZN5O1P2Q3R4S5T6U7V8W9X0",
    buyerAgent: "sales-agent-na",
    sellerAgent: "logistics-negotiator",
    status: "rejected",
    turns: "4",
    createdAt: "2026-03-19T11:30:00Z",
  },
  {
    id: "sess_01HZN5Y1Z2A3B4C5D6E7F8G9H0",
    buyerAgent: "procurement-bot-eu",
    sellerAgent: "compliance-checker",
    status: "paused",
    turns: "2",
    createdAt: "2026-03-18T15:00:00Z",
  },
];

function apiSessionToRow(s: Session): SessionRow {
  return {
    id: s.id,
    buyerAgent: s.initiatorAgentId,
    sellerAgent: s.counterpartyAgentId,
    status: s.status,
    turns: String(s.turnCount),
    createdAt: s.createdAt,
  };
}

const statusOptions = ["all", "active", "completed", "rejected", "paused", "pending_acceptance"];

const columns = [
  {
    key: "id" as const,
    label: "ID",
    render: (_: unknown, row: Record<string, unknown>) => (
      <Link
        href={`/sessions/${row.id}`}
        className="font-mono text-xs text-accent hover:text-accent-hover underline"
      >
        {String(row.id).slice(0, 16)}...
      </Link>
    ),
  },
  {
    key: "buyerAgent" as const,
    label: "Parties",
    render: (_: unknown, row: Record<string, unknown>) => (
      <span className="text-sm text-white">
        {String(row.buyerAgent)}{" "}
        <span className="text-gray-500">{"\u21C4"}</span>{" "}
        {String(row.sellerAgent)}
      </span>
    ),
  },
  {
    key: "status" as const,
    label: "Status",
    sortable: true,
    render: (v: unknown) => <StatusBadge status={String(v)} />,
  },
  {
    key: "turns" as const,
    label: "Turns",
    sortable: true,
    render: (v: unknown) => (
      <span className="text-sm text-white">{String(v)}</span>
    ),
  },
  {
    key: "createdAt" as const,
    label: "Created",
    sortable: true,
    render: (v: unknown) => (
      <span className="text-sm text-gray-400">
        {new Date(String(v)).toLocaleDateString()}
      </span>
    ),
  },
];

export default function SessionsPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const token = getAccessToken();
    if (token) apiClient.setToken(token);
  }, []);

  const { data: sessions, loading, error, refetch } = useSessions();

  // Convert API sessions to rows, or use mock data
  const rows: SessionRow[] = sessions
    ? sessions.map(apiSessionToRow)
    : mockSessions;

  const filtered = useMemo(() => {
    let result = rows;
    if (statusFilter !== "all") {
      result = result.filter((s) => s.status === statusFilter);
    }
    if (dateFrom) {
      result = result.filter((s) => s.createdAt >= dateFrom);
    }
    if (dateTo) {
      result = result.filter(
        (s) => s.createdAt <= dateTo + "T23:59:59Z",
      );
    }
    return result;
  }, [rows, statusFilter, dateFrom, dateTo]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Sessions</h1>
        <p className="mt-1 text-sm text-gray-400">
          Monitor active and historical negotiation sessions
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-navy-800 bg-navy-900 p-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-navy-800 bg-navy-950 px-3 py-1.5 text-sm text-white outline-none focus:border-accent"
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All Statuses" : s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            From
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-md border border-navy-800 bg-navy-950 px-3 py-1.5 text-sm text-white outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            To
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-md border border-navy-800 bg-navy-950 px-3 py-1.5 text-sm text-white outline-none focus:border-accent"
          />
        </div>
        {(statusFilter !== "all" || dateFrom || dateTo) && (
          <button
            onClick={() => {
              setStatusFilter("all");
              setDateFrom("");
              setDateTo("");
            }}
            className="rounded-md border border-navy-800 px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-12">
          <LoadingSpinner label="Loading sessions..." />
        </div>
      ) : error && !sessions ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No sessions found"
          description="No negotiation sessions match the current filters."
        />
      ) : (
        <DataTable
          columns={columns}
          data={filtered as unknown as Record<string, unknown>[]}
        />
      )}
    </div>
  );
}
